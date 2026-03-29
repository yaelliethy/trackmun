import { DbType } from '../../db/client';
import { settings, registrationSteps, registrationQuestions } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { RegistrationStep, RegistrationQuestion, Settings } from '@trackmun/shared';

export const COUNCIL_PREFERENCE_ALREADY_EXISTS =
  'Only one council preference question is allowed per registration form.';

export class RegistrationService {
  constructor(private db: DbType) {}

  async getSettings(): Promise<Settings> {
    const records = await this.db.select().from(settings).all();
    const result: Settings = {};
    for (const record of records) {
      if (record.key === 'registration_deposit_amount') result.registration_deposit_amount = parseInt(record.value, 10);
      if (record.key === 'registration_full_amount') result.registration_full_amount = parseInt(record.value, 10);
      if (record.key === 'payment_proof_timing') result.payment_proof_timing = record.value as 'registration' | 'after_acceptance';
      if (record.key === 'registration_enabled') result.registration_enabled = record.value === 'true';
    }
    return result;
  }

  async updateSettings(newSettings: Settings): Promise<Settings> {
    const keys = Object.keys(newSettings) as Array<keyof Settings>;
    const now = new Date();
    for (const key of keys) {
      const value = newSettings[key];
      if (value !== undefined) {
        const stored =
          typeof value === 'boolean' ? (value ? 'true' : 'false') : value.toString();
        await this.db.insert(settings).values({
          id: crypto.randomUUID(),
          key,
          value: stored,
          createdAt: now,
          updatedAt: now,
        }).onConflictDoUpdate({
          target: settings.key,
          set: { value: stored, updatedAt: now },
        }).run();
      }
    }
    return this.getSettings();
  }

  async listSteps(): Promise<RegistrationStep[]> {
    const records = await this.db.select().from(registrationSteps).all();
    return records.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      order: r.order,
    })).sort((a, b) => a.order - b.order);
  }

  async createStep(data: Omit<RegistrationStep, 'id'>): Promise<RegistrationStep> {
    const id = crypto.randomUUID();
    const now = new Date();
    await this.db.insert(registrationSteps).values({
      id,
      title: data.title,
      description: data.description,
      order: data.order,
      createdAt: now,
      updatedAt: now,
    }).run();
    return { id, ...data };
  }

  async updateStep(id: string, data: Partial<RegistrationStep>): Promise<void> {
    await this.db.update(registrationSteps).set({
      ...data,
      updatedAt: new Date(),
    }).where(eq(registrationSteps.id, id)).run();
  }

  async deleteStep(id: string): Promise<void> {
    await this.db.delete(registrationSteps).where(eq(registrationSteps.id, id)).run();
  }

  private async countOtherCouncilPreferenceQuestions(
    excludeQuestionId?: string
  ): Promise<number> {
    const rows = await this.db
      .select({ id: registrationQuestions.id })
      .from(registrationQuestions)
      .where(eq(registrationQuestions.type, 'council_preference'))
      .all();
    if (!excludeQuestionId) return rows.length;
    return rows.filter((r) => r.id !== excludeQuestionId).length;
  }

  async listQuestions(stepId?: string): Promise<RegistrationQuestion[]> {
    let query = this.db.select().from(registrationQuestions);
    if (stepId) {
      query = query.where(eq(registrationQuestions.stepId, stepId)) as any;
    }
    const records = await query.all();
    return records.map(r => ({
      id: r.id,
      stepId: r.stepId,
      label: r.label,
      type: r.type as RegistrationQuestion['type'],
      options: r.options,
      required: Boolean(r.required),
      displayOrder: r.displayOrder,
      councilPreferenceCount: r.councilPreferenceCount ?? 1,
    })).sort((a, b) => a.displayOrder - b.displayOrder);
  }

  async createQuestion(data: Omit<RegistrationQuestion, 'id'>): Promise<RegistrationQuestion> {
    if (data.type === 'council_preference') {
      const others = await this.countOtherCouncilPreferenceQuestions();
      if (others > 0) {
        throw new Error(COUNCIL_PREFERENCE_ALREADY_EXISTS);
      }
    }
    const id = crypto.randomUUID();
    const now = new Date();
    const prefCount =
      data.type === 'council_preference' ? (data.councilPreferenceCount ?? 1) : 1;
    await this.db.insert(registrationQuestions).values({
      id,
      stepId: data.stepId,
      label: data.label,
      type: data.type,
      options: data.options,
      required: data.required,
      displayOrder: data.displayOrder,
      councilPreferenceCount: prefCount,
      createdAt: now,
      updatedAt: now,
    }).run();
    return {
      id,
      stepId: data.stepId,
      label: data.label,
      type: data.type,
      options: data.options ?? null,
      required: data.required,
      displayOrder: data.displayOrder,
      councilPreferenceCount: prefCount,
    };
  }

  async updateQuestion(id: string, data: Partial<RegistrationQuestion>): Promise<void> {
    if (data.type === 'council_preference') {
      const others = await this.countOtherCouncilPreferenceQuestions(id);
      if (others > 0) {
        throw new Error(COUNCIL_PREFERENCE_ALREADY_EXISTS);
      }
    }
    const updates: {
      label?: string;
      type?: RegistrationQuestion['type'];
      options?: string | null;
      required?: boolean;
      displayOrder?: number;
      councilPreferenceCount?: number;
      updatedAt: Date;
    } = { updatedAt: new Date() };
    if (data.label !== undefined) updates.label = data.label;
    if (data.type !== undefined) updates.type = data.type;
    if (data.options !== undefined) updates.options = data.options;
    if (data.required !== undefined) updates.required = data.required;
    if (data.displayOrder !== undefined) updates.displayOrder = data.displayOrder;
    if (data.councilPreferenceCount !== undefined) {
      updates.councilPreferenceCount = data.councilPreferenceCount;
    }
    await this.db.update(registrationQuestions).set(updates).where(eq(registrationQuestions.id, id)).run();
  }

  async deleteQuestion(id: string): Promise<void> {
    await this.db.delete(registrationQuestions).where(eq(registrationQuestions.id, id)).run();
  }
}
