import type { User } from '@trackmun/shared';
import { eq, desc } from 'drizzle-orm';
import { DbType } from '../../db/client';
import {
  delegateProfiles,
  attendanceRecords,
  benefitRedemptions,
  awards,
  benefits as benefitsTable,
} from '../../db/schema';

export class DelegateService {
  constructor(private db: DbType) {}

  async getProfile(user: User) {
    const profile = await this.db
      .select()
      .from(delegateProfiles)
      .where(eq(delegateProfiles.userId, user.id))
      .get();

    if (!profile) return null;

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      country: profile.country,
      council: user.council ?? null,
      pressAgency: profile.pressAgency,
      firstChoice: profile.firstChoice,
      secondChoice: profile.secondChoice,
      depositPaymentStatus: (profile.depositPaymentStatus as 'pending' | 'paid') || 'pending',
      fullPaymentStatus: (profile.fullPaymentStatus as 'pending' | 'paid') || 'pending',
      depositAmount: profile.depositAmount,
      fullAmount: profile.fullAmount,
      paymentProofR2Key: profile.paymentProofR2Key,
    };
  }

  async listAttendance(userId: string) {
    const records = await this.db
      .select()
      .from(attendanceRecords)
      .where(eq(attendanceRecords.userId, userId))
      .orderBy(desc(attendanceRecords.scannedAt))
      .all();

    return records.map((r) => ({
      id: r.id,
      sessionLabel: r.sessionLabel || 'General Session',
      scannedAt: r.scannedAt,
      attended: true,
    }));
  }

  async listBenefitRedemptions(userId: string) {
    return this.db
      .select({
        id: benefitRedemptions.id,
        benefitType: benefitRedemptions.benefitType,
        redeemedAt: benefitRedemptions.redeemedAt,
        name: benefitsTable.name,
      })
      .from(benefitRedemptions)
      .innerJoin(benefitsTable, eq(benefitRedemptions.benefitType, benefitsTable.id))
      .where(eq(benefitRedemptions.userId, userId))
      .orderBy(desc(benefitRedemptions.redeemedAt))
      .all();
  }

  async listAwards(userId: string) {
    const userAwards = await this.db
      .select()
      .from(awards)
      .where(eq(awards.userId, userId))
      .orderBy(desc(awards.givenAt))
      .all();

    return userAwards.map((a) => ({
      id: a.id,
      awardType: a.awardType,
      council: a.council,
      givenAt: a.givenAt,
      notes: a.notes,
    }));
  }
}
