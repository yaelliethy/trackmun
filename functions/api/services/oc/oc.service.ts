import { DbType } from '../../db/client';
import {
  users,
  delegateProfiles,
  benefits,
  benefitRedemptions,
  attendanceRecords,
  conferenceDays,
  attendancePeriods,
  councils,
} from '../../db/schema';
import { eq, and, like, or, sql } from 'drizzle-orm';
import type {
  ActiveAttendancePeriod,
  DelegateSearchResult,
  BenefitWithStatus,
  AttendanceResult,
  BenefitRedeemResult,
} from '@trackmun/shared';

const IDENTIFIER_PAD_LENGTH = 3; // SC-001, not SC-1

function sqliteInsertApplied(result: unknown): boolean {
  if (!result || typeof result !== 'object') return false;
  const r = result as { changes?: number; rowsAffected?: number };
  const n = r.changes ?? r.rowsAffected ?? 0;
  return n > 0;
}

export class OcService {
  constructor(private db: DbType) {}

  async listBenefitsCatalog() {
    return this.db.select().from(benefits).all();
  }

  /** Returns the attendance period that is currently active based on today's date and time. */
  async getActivePeriod(): Promise<ActiveAttendancePeriod | null> {
    const now = new Date();
    const todayDate = now.toISOString().slice(0, 10); // 'YYYY-MM-DD'
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const row = await this.db
      .select({ day: conferenceDays, period: attendancePeriods })
      .from(conferenceDays)
      .innerJoin(attendancePeriods, eq(conferenceDays.id, attendancePeriods.dayId))
      .where(
        and(
          eq(conferenceDays.date, todayDate),
          sql`${attendancePeriods.startTime} <= ${currentTime}`,
          sql`${attendancePeriods.endTime} >= ${currentTime}`
        )
      )
      .get();

    if (!row) return null;

    const { day, period } = row;
    const sessionLabel = `${day.name} — ${period.startTime}–${period.endTime}`;

    return {
      periodId: period.id,
      dayId: day.id,
      dayName: day.name,
      date: day.date,
      startTime: period.startTime,
      endTime: period.endTime,
      sessionLabel,
    };
  }

  /** Records attendance for a delegate in the active period. Returns result indicating if already recorded. */
  async recordAttendance(
    delegateIdOrIdentifier: string,
    _periodId: string,
    sessionLabel: string,
    scannedBy: string
  ): Promise<AttendanceResult> {
    // Resolve UUID if identifier was provided (e.g. SC-001)
    const profile = await this.db
      .select({ userId: delegateProfiles.userId })
      .from(delegateProfiles)
      .where(eq(delegateProfiles.identifier, delegateIdOrIdentifier))
      .get();
    
    const delegateId = profile ? profile.userId : delegateIdOrIdentifier;

    const delegate = await this.db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, delegateId))
      .get();

    if (!delegate) {
      return { success: false, alreadyRecorded: false };
    }

    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    const insertResult = await this.db
      .insert(attendanceRecords)
      .values({
        id,
        userId: delegateId,
        scannedBy,
        sessionLabel,
        scannedAt: now,
      })
      .onConflictDoNothing({
        target: [attendanceRecords.userId, attendanceRecords.sessionLabel],
      })
      .run();

    if (!sqliteInsertApplied(insertResult)) {
      return {
        success: false,
        alreadyRecorded: true,
        delegateName: delegate.name,
        sessionLabel,
      };
    }

    return {
      success: true,
      alreadyRecorded: false,
      delegateName: delegate.name,
      sessionLabel,
    };
  }

  /** Returns all benefits with a redemption status flag for the given delegate. */
  async getBenefitsWithStatus(delegateId: string): Promise<BenefitWithStatus[]> {
    const rows = await this.db
      .select({
        id: benefits.id,
        name: benefits.name,
        redeemedAt: benefitRedemptions.redeemedAt,
      })
      .from(benefits)
      .leftJoin(
        benefitRedemptions,
        and(
          eq(benefits.id, benefitRedemptions.benefitType),
          eq(benefitRedemptions.userId, delegateId)
        )
      )
      .all();

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      redeemed: r.redeemedAt != null,
      redeemedAt: r.redeemedAt ?? null,
    }));
  }

  /** Redeems a benefit for a delegate. Returns result indicating if already redeemed. */
  async redeemBenefit(
    delegateIdOrIdentifier: string,
    benefitId: string,
    scannedBy: string
  ): Promise<BenefitRedeemResult> {
    // Resolve UUID if identifier was provided (e.g. SC-001)
    const profile = await this.db
      .select({ userId: delegateProfiles.userId })
      .from(delegateProfiles)
      .where(eq(delegateProfiles.identifier, delegateIdOrIdentifier))
      .get();
    
    const delegateId = profile ? profile.userId : delegateIdOrIdentifier;

    const [delegate, benefit] = await Promise.all([
      this.db.select({ name: users.name }).from(users).where(eq(users.id, delegateId)).get(),
      this.db.select().from(benefits).where(eq(benefits.id, benefitId)).get(),
    ]);

    if (!delegate || !benefit) {
      return { success: false, alreadyRedeemed: false };
    }

    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    const insertResult = await this.db
      .insert(benefitRedemptions)
      .values({
        id,
        userId: delegateId,
        scannedBy,
        benefitType: benefitId,
        redeemedAt: now,
      })
      .onConflictDoNothing({
        target: [benefitRedemptions.userId, benefitRedemptions.benefitType],
      })
      .run();

    if (!sqliteInsertApplied(insertResult)) {
      const existing = await this.db
        .select({ redeemedAt: benefitRedemptions.redeemedAt })
        .from(benefitRedemptions)
        .where(
          and(
            eq(benefitRedemptions.userId, delegateId),
            eq(benefitRedemptions.benefitType, benefitId)
          )
        )
        .get();

      return {
        success: false,
        alreadyRedeemed: true,
        delegateName: delegate.name,
        benefitName: benefit.name,
        redeemedAt: existing?.redeemedAt ?? now,
      };
    }

    return {
      success: true,
      alreadyRedeemed: false,
      delegateName: delegate.name,
      benefitName: benefit.name,
    };
  }

  /** Searches approved delegates by name, email, or identifier. */
  async searchDelegates(query: string): Promise<DelegateSearchResult[]> {
    const term = `%${query}%`;

    const rows = await this.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        council: users.council,
        identifier: delegateProfiles.identifier,
      })
      .from(users)
      .leftJoin(delegateProfiles, eq(users.id, delegateProfiles.userId))
      .where(
        and(
          eq(users.role, 'delegate'),
          eq(users.registrationStatus, 'approved'),
          or(
            like(users.name, term),
            like(users.email, term),
            like(delegateProfiles.identifier, term)
          )
        )
      )
      .limit(20)
      .all();

    return rows.map((r) => ({
      userId: r.id,
      name: r.name,
      email: r.email,
      identifier: r.identifier ?? null,
      council: r.council ?? null,
    }));
  }

  /** Generates and assigns an identifier to a delegate upon approval. */
  async assignIdentifier(delegateUserId: string): Promise<string | null> {
    const councilRow = await this.db
      .select({
        council: users.council,
        shortName: councils.shortName,
      })
      .from(users)
      .leftJoin(councils, eq(users.council, councils.name))
      .where(eq(users.id, delegateUserId))
      .get();

    const prefix = (councilRow?.shortName || 'DEL').toUpperCase();

    const maxRow = await this.db
      .select({
        maxSeq: sql<number | null>`max(
          cast(substr(${delegateProfiles.identifier}, instr(${delegateProfiles.identifier}, '-') + 1) as integer)
        )`.as('maxSeq'),
      })
      .from(delegateProfiles)
      .where(like(delegateProfiles.identifier, `${prefix}-%`))
      .get();

    const nextNumber = (maxRow?.maxSeq ?? 0) + 1;
    const identifier = `${prefix}-${String(nextNumber).padStart(IDENTIFIER_PAD_LENGTH, '0')}`;

    await this.db
      .insert(delegateProfiles)
      .values({
        userId: delegateUserId,
        identifier,
      })
      .onConflictDoUpdate({
        target: delegateProfiles.userId,
        set: { identifier },
      })
      .run();

    return identifier;
  }
}
