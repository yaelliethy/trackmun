import { DbType } from '../../db/client';
import { users, delegateProfiles, awards, attendanceRecords, attendancePeriods, councils, settings } from '../../db/schema';
import { eq, and, like, or, sql } from 'drizzle-orm';
import { RegistrationService } from '../admin/registration.service';

export class ChairsService {
  constructor(private db: DbType) {}

  async getSettings() {
    const records = await this.db.select().from(settings).all();
    const result: Record<string, boolean | string> = {};
    for (const r of records) {
      result[r.key] = r.value === 'true' ? true : r.value === 'false' ? false : r.value;
    }
    return result;
  }

  async getRequests(councilName: string) {
    const rawDelegates = await this.db
      .select({
        userId: users.id,
        name: users.name,
        email: users.email,
        registrationStatus: users.registrationStatus,
        identifier: delegateProfiles.identifier,
        firstChoice: delegateProfiles.firstChoice,
        secondChoice: delegateProfiles.secondChoice,
        currentPreferenceTracker: delegateProfiles.currentPreferenceTracker,
      })
      .from(users)
      .leftJoin(delegateProfiles, eq(users.id, delegateProfiles.userId))
      .where(and(eq(users.registrationStatus, 'pending'), eq(users.role, 'delegate')))
      .all();

    // Filter to only those whose current preference is this council
    const requests = rawDelegates.filter(d => {
      const isFirst = d.firstChoice === councilName && d.currentPreferenceTracker === 1;
      const isSecond = d.secondChoice === councilName && d.currentPreferenceTracker === 2;
      return isFirst || isSecond;
    });

    return requests;
  }

  async acceptDelegate(userId: string, councilName: string) {
    // Needs an identifier
    const councilQuery = await this.db.select().from(councils).where(eq(councils.name, councilName)).get();
    const shortName = councilQuery?.shortName || councilName.substring(0, 2).toUpperCase();
    
    // Count currently approved in this council
    const approvedCount = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(
        and(
          eq(users.council, councilName),
          eq(users.registrationStatus, 'approved'),
          eq(users.role, 'delegate')
        )
      )
      .get();
      
    if (councilQuery?.capacity && (approvedCount?.count ?? 0) >= councilQuery.capacity) {
      throw new Error("Council capacity reached.");
    }

    const nextNumber = (approvedCount?.count || 0) + 1;
    const identifier = `${shortName}-${nextNumber.toString().padStart(3, '0')}`;

    await this.db.transaction(async (tx) => {
      await tx.update(users).set({ registrationStatus: 'approved', council: councilName }).where(eq(users.id, userId)).run();
      await tx.update(delegateProfiles).set({ identifier }).where(eq(delegateProfiles.userId, userId)).run();
    });

    return await this.db.select().from(users).where(eq(users.id, userId)).get();
  }

  async deferDelegate(userId: string) {
    const profile = await this.db.select().from(delegateProfiles).where(eq(delegateProfiles.userId, userId)).get();
    if (!profile) throw new Error("Profile not found");
    // Move tracker to 2
    await this.db.update(delegateProfiles).set({ currentPreferenceTracker: 2 }).where(eq(delegateProfiles.userId, userId)).run();
  }

  async rejectDelegate(userId: string) {
    await this.db.update(users).set({ registrationStatus: 'rejected' }).where(eq(users.id, userId)).run();
  }

  async getAssignedDelegates(councilName: string, filters?: { search?: string; country?: string }) {
    let query = this.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        identifier: delegateProfiles.identifier,
        country: delegateProfiles.country,
        awards: delegateProfiles.awards,
      })
      .from(users)
      .leftJoin(delegateProfiles, eq(users.id, delegateProfiles.userId))
      .where(
        and(
          eq(users.council, councilName),
          eq(users.registrationStatus, 'approved'),
          eq(users.role, 'delegate')
        )
      )
      .$dynamic();

    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.where(or(
        like(users.name, searchTerm),
        like(users.email, searchTerm),
        like(delegateProfiles.identifier, searchTerm)
      ));
    }

    if (filters?.country) {
      query = query.where(eq(delegateProfiles.country, filters.country));
    }

    return await query.all();
  }

  async removeDelegate(userId: string) {
    // Sets registration back to pending, clears council
    await this.db.update(users).set({ registrationStatus: 'pending', council: null }).where(eq(users.id, userId)).run();
    await this.db.update(delegateProfiles).set({ country: null, awards: '[]', identifier: null, currentPreferenceTracker: 1 }).where(eq(delegateProfiles.userId, userId)).run();
  }

  async assignCountry(userId: string, country: string) {
    await this.db.update(delegateProfiles).set({ country }).where(eq(delegateProfiles.userId, userId)).run();
  }

  async addAward(
    userId: string,
    councilName: string,
    awardType: string,
    notes: string | null,
    givenByUserId: string
  ) {
    // Only 1 award per delegate. givenBy must be a real users.id (FK on awards.given_by).
    await this.db.transaction(async (tx) => {
      await tx.update(delegateProfiles).set({ awards: JSON.stringify([]) }).where(eq(delegateProfiles.userId, userId)).run();
      await tx.delete(awards).where(eq(awards.userId, userId)).run();

      await tx.update(delegateProfiles).set({
        awards: JSON.stringify([{ type: awardType, title: awardType, date: new Date().toISOString() }])
      }).where(eq(delegateProfiles.userId, userId)).run();

      await tx.insert(awards).values({
        id: crypto.randomUUID(),
        userId,
        council: councilName,
        awardType,
        givenBy: givenByUserId,
        notes
      }).run();
    });
  }

  async removeAward(userId: string) {
    await this.db.transaction(async (tx) => {
      await tx.update(delegateProfiles).set({ awards: JSON.stringify([]) }).where(eq(delegateProfiles.userId, userId)).run();
      await tx.delete(awards).where(eq(awards.userId, userId)).run();
    });
  }

  async getActivePeriod() {
    // Simplistic active period check
    const records = await this.db.select().from(attendancePeriods).all();
    if (records.length > 0) {
      return { periodId: records[0].id, sessionLabel: `Session ${records[0].startTime}` };
    }
    return null;
  }

  async recordAttendance(
    data: { delegateId: string; periodId: string; sessionLabel: string },
    scannedBy: string,
    chairCouncil: string
  ) {
    const delegate = await this.db.select().from(users).where(eq(users.id, data.delegateId)).get();
    if (!delegate) throw new Error("Delegate not found");

    if (delegate.role !== "delegate") {
      throw new Error("Only delegates can be checked in for attendance");
    }
    if (delegate.registrationStatus !== "approved") {
      throw new Error("Delegate registration is not approved");
    }
    if (delegate.council !== chairCouncil) {
      throw new Error("This delegate is not assigned to your council");
    }

    const existing = await this.db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.userId, data.delegateId),
          eq(attendanceRecords.sessionLabel, data.sessionLabel)
        )
      )
      .get();
    if (existing) {
      return {
        success: false,
        delegateName: delegate.name,
        sessionLabel: data.sessionLabel,
        alreadyRecorded: true,
      };
    }

    await this.db.insert(attendanceRecords).values({
      id: crypto.randomUUID(),
      userId: data.delegateId,
      sessionLabel: data.sessionLabel,
      scannedBy,
    }).run();

    return { success: true, delegateName: delegate.name, sessionLabel: data.sessionLabel };
  }

  async searchDelegates(searchQuery: string, councilName: string) {
    const searchTerm = `%${searchQuery}%`;
    const results = await this.db.select({
      userId: users.id,
      name: users.name,
      email: users.email,
      identifier: delegateProfiles.identifier,
      council: users.council
    })
    .from(users)
    .leftJoin(delegateProfiles, eq(users.id, delegateProfiles.userId))
    .where(
      and(
        eq(users.council, councilName),
        eq(users.role, "delegate"),
        eq(users.registrationStatus, "approved"),
        or(
          like(users.name, searchTerm),
          like(delegateProfiles.identifier, searchTerm)
        )
      )
    )
    .all();
    return results;
  }

  async getDelegateRegistrationResponse(userId: string) {
    return new RegistrationService(this.db).getResponse(userId);
  }
}
