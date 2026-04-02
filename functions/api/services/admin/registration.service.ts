import { DbType, getLibsqlClient, type InStatement } from '../../db/client';
import { settings, registrationSteps, registrationQuestions, delegateAnswers, users, councils } from '../../db/schema';
import { eq, isNotNull, sql } from 'drizzle-orm';
import { RegistrationStep, RegistrationQuestion, Settings, DelegateResponse } from '@trackmun/shared';

export const COUNCIL_PREFERENCE_ALREADY_EXISTS =
  'Only one council preference question is allowed per registration form.';

export class RegistrationService {
  constructor(private db: DbType) { }

  async getSettings(): Promise<Settings> {
    const records = await this.db.select().from(settings).all();
    const result: Settings = {};
    for (const record of records) {
      if (record.key === 'registration_deposit_amount') result.registration_deposit_amount = parseInt(record.value, 10);
      if (record.key === 'registration_full_amount') result.registration_full_amount = parseInt(record.value, 10);
      if (record.key === 'payment_proof_timing') result.payment_proof_timing = record.value as 'registration' | 'after_acceptance';
      if (record.key === 'registration_enabled') result.registration_enabled = record.value === 'true';
      if (record.key === 'chairs_can_reject') result.chairs_can_reject = record.value === 'true';
      if (record.key === 'chairs_can_defer') result.chairs_can_defer = record.value === 'true';
    }
    return result;
  }

  async updateSettings(newSettings: Settings): Promise<Settings> {
    const keys = Object.keys(newSettings) as Array<keyof Settings>;
    const nowMs = Date.now();
    const stmts: InStatement[] = [];
    for (const key of keys) {
      const value = newSettings[key];
      if (value !== undefined) {
        const stored =
          typeof value === 'boolean' ? (value ? 'true' : 'false') : value.toString();
        stmts.push({
          sql: `INSERT INTO settings (id, "key", value, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
            ON CONFLICT ("key") DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
          args: [crypto.randomUUID(), key, stored, nowMs, nowMs],
        });
      }
    }
    if (stmts.length > 0) {
      await getLibsqlClient().batch(stmts, 'write');
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

  async getResponses(): Promise<DelegateResponse[]> {
    const rows = await this.db
      .select({
        userId: users.id,
        name: users.name,
        email: users.email,
        registrationStatus: users.registrationStatus,
        questionId: registrationQuestions.id,
        questionLabel: registrationQuestions.label,
        value: delegateAnswers.value,
      })
      .from(delegateAnswers)
      .innerJoin(users, eq(delegateAnswers.userId, users.id))
      .innerJoin(registrationQuestions, eq(delegateAnswers.questionId, registrationQuestions.id))
      .all();

    const responsesMap = new Map<string, DelegateResponse>();

    for (const row of rows) {
      if (!responsesMap.has(row.userId)) {
        responsesMap.set(row.userId, {
          userId: row.userId,
          name: row.name,
          email: row.email,
          registrationStatus: row.registrationStatus as 'pending' | 'approved' | 'rejected',
          answers: [],
        });
      }
      responsesMap.get(row.userId)!.answers.push({
        questionId: row.questionId,
        questionLabel: row.questionLabel,
        value: row.value,
      });
    }

    return Array.from(responsesMap.values());
  }

  async getResponse(userId: string): Promise<DelegateResponse | null> {
    const rows = await this.db
      .select({
        userId: users.id,
        name: users.name,
        email: users.email,
        registrationStatus: users.registrationStatus,
        questionId: registrationQuestions.id,
        questionLabel: registrationQuestions.label,
        value: delegateAnswers.value,
      })
      .from(delegateAnswers)
      .innerJoin(users, eq(delegateAnswers.userId, users.id))
      .innerJoin(registrationQuestions, eq(delegateAnswers.questionId, registrationQuestions.id))
      .where(eq(users.id, userId))
      .all();

    if (rows.length === 0) return null;

    const response: DelegateResponse = {
      userId: rows[0].userId,
      name: rows[0].name,
      email: rows[0].email,
      registrationStatus: rows[0].registrationStatus as 'pending' | 'approved' | 'rejected',
      answers: [],
    };

    for (const row of rows) {
      response.answers.push({
        questionId: row.questionId,
        questionLabel: row.questionLabel,
        value: row.value,
      });
    }

    return response;
  }

  async getFullCouncils(): Promise<string[]> {
    const allCouncils = await this.db.select().from(councils).where(isNotNull(councils.capacity)).all();
    if (allCouncils.length === 0) return [];

    const approvedCounts = await this.db
      .select({ council: users.council, count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.registrationStatus, 'approved'))
      .groupBy(users.council)
      .all();

    const countMap = new Map<string, number>();
    for (const row of approvedCounts) {
      if (row.council) {
        countMap.set(row.council, Number(row.count));
      }
    }

    const fullCouncils: string[] = [];
    for (const c of allCouncils) {
      if (c.capacity !== null && c.capacity !== undefined) {
        const approved = countMap.get(c.name) || 0;
        if (approved >= c.capacity) {
          fullCouncils.push(c.name);
        }
      }
    }
    return fullCouncils;
  }
}
