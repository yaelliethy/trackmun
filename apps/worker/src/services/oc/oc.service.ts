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

export class OcService {
  constructor(private db: DbType) {}

  /** Returns the attendance period that is currently active based on today's date and time. */
  async getActivePeriod(): Promise<ActiveAttendancePeriod | null> {
    const now = new Date();
    const todayDate = now.toISOString().slice(0, 10); // 'YYYY-MM-DD'
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const day = await this.db
      .select()
      .from(conferenceDays)
      .where(eq(conferenceDays.date, todayDate))
      .get();

    if (!day) return null;

    const period = await this.db
      .select()
      .from(attendancePeriods)
      .where(
        and(
          eq(attendancePeriods.dayId, day.id),
          sql`${attendancePeriods.startTime} <= ${currentTime}`,
          sql`${attendancePeriods.endTime} >= ${currentTime}`
        )
      )
      .get();

    if (!period) return null;

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
    delegateId: string,
    periodId: string,
    sessionLabel: string,
    scannedBy: string
  ): Promise<AttendanceResult> {
    const delegate = await this.db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, delegateId))
      .get();

    if (!delegate) {
      return { success: false, alreadyRecorded: false };
    }

    // Check for duplicate — same user + same session label
    const existing = await this.db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.userId, delegateId),
          eq(attendanceRecords.sessionLabel, sessionLabel)
        )
      )
      .get();

    if (existing) {
      return {
        success: false,
        alreadyRecorded: true,
        delegateName: delegate.name,
        sessionLabel,
      };
    }

    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    await this.db
      .insert(attendanceRecords)
      .values({
        id,
        userId: delegateId,
        scannedBy,
        sessionLabel,
        scannedAt: now,
      })
      .run();

    return {
      success: true,
      alreadyRecorded: false,
      delegateName: delegate.name,
      sessionLabel,
    };
  }

  /** Returns all benefits with a redemption status flag for the given delegate. */
  async getBenefitsWithStatus(delegateId: string): Promise<BenefitWithStatus[]> {
    const allBenefits = await this.db.select().from(benefits).all();

    const redemptions = await this.db
      .select()
      .from(benefitRedemptions)
      .where(eq(benefitRedemptions.userId, delegateId))
      .all();

    const redemptionMap = new Map(
      redemptions.map((r) => [r.benefitType, r.redeemedAt])
    );

    return allBenefits.map((b) => ({
      id: b.id,
      name: b.name,
      redeemed: redemptionMap.has(b.id),
      redeemedAt: redemptionMap.get(b.id) ?? null,
    }));
  }

  /** Redeems a benefit for a delegate. Returns result indicating if already redeemed. */
  async redeemBenefit(
    delegateId: string,
    benefitId: string,
    scannedBy: string
  ): Promise<BenefitRedeemResult> {
    const [delegate, benefit] = await Promise.all([
      this.db.select({ name: users.name }).from(users).where(eq(users.id, delegateId)).get(),
      this.db.select().from(benefits).where(eq(benefits.id, benefitId)).get(),
    ]);

    if (!delegate || !benefit) {
      return { success: false, alreadyRedeemed: false };
    }

    // Check for existing redemption (benefitType = benefitId)
    const existing = await this.db
      .select()
      .from(benefitRedemptions)
      .where(
        and(
          eq(benefitRedemptions.userId, delegateId),
          eq(benefitRedemptions.benefitType, benefitId)
        )
      )
      .get();

    if (existing) {
      return {
        success: false,
        alreadyRedeemed: true,
        delegateName: delegate.name,
        benefitName: benefit.name,
        redeemedAt: existing.redeemedAt,
      };
    }

    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    await this.db
      .insert(benefitRedemptions)
      .values({
        id,
        userId: delegateId,
        scannedBy,
        benefitType: benefitId,
        redeemedAt: now,
      })
      .run();

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
    const userRow = await this.db
      .select({ council: users.council })
      .from(users)
      .where(eq(users.id, delegateUserId))
      .get();

    if (!userRow?.council) return null;

    const councilRow = await this.db
      .select({ shortName: councils.shortName })
      .from(councils)
      .where(eq(councils.name, userRow.council))
      .get();

    const prefix = councilRow?.shortName?.toUpperCase() ?? 'DEL';

    // Count existing identifiers for this council prefix
    const existingRows = await this.db
      .select({ identifier: delegateProfiles.identifier })
      .from(delegateProfiles)
      .where(like(delegateProfiles.identifier, `${prefix}-%`))
      .all();

    const nextNumber = existingRows.length + 1;
    const identifier = `${prefix}-${String(nextNumber).padStart(IDENTIFIER_PAD_LENGTH, '0')}`;

    await this.db
      .update(delegateProfiles)
      .set({ identifier })
      .where(eq(delegateProfiles.userId, delegateUserId))
      .run();

    return identifier;
  }
}
