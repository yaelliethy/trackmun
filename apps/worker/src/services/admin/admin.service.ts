import { User, UserRole, UpdateUserSchema } from '@trackmun/shared';
import { DbType } from '../../db/client';
import {
  users,
  delegateProfiles,
  delegateAnswers,
  postLikes,
  postReplies,
  postMedia,
  posts,
  benefitRedemptions,
  attendanceRecords,
  qrTokens,
  impersonationLog,
  countryAssignments,
  awards,
  qrScanLog,
  sessions,
  accounts,
} from '../../db/schema';
import { eq, or, inArray, count, and, like, SQL } from 'drizzle-orm';
import { z } from 'zod';

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

export interface UserFilters {
  search?: string;
  registrationStatus?: 'pending' | 'approved' | 'rejected';
  council?: string;
  depositPaymentStatus?: 'pending' | 'paid';
  fullPaymentStatus?: 'pending' | 'paid';
}

export class AdminService {
  constructor(private db: DbType) {}

  async getUsersByRole(
    role: UserRole,
    page: number = 1,
    limit: number = 20,
    filters?: UserFilters
  ): Promise<{ users: User[]; total: number }> {
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [eq(users.role, role)];

    if (filters?.search) {
      conditions.push(
        or(
          like(users.name, `%${filters.search}%`),
          like(users.email, `%${filters.search}%`)
        ) as SQL
      );
    }

    if (filters?.registrationStatus) {
      conditions.push(eq(users.registrationStatus, filters.registrationStatus));
    }

    if (filters?.council) {
      conditions.push(like(users.council, `%${filters.council}%`));
    }

    if (filters?.depositPaymentStatus) {
      conditions.push(eq(delegateProfiles.depositPaymentStatus, filters.depositPaymentStatus));
    }

    if (filters?.fullPaymentStatus) {
      conditions.push(eq(delegateProfiles.fullPaymentStatus, filters.fullPaymentStatus));
    }

    const whereClause = and(...conditions);

    const userList = await this.db
      .select({ user: users, profile: delegateProfiles })
      .from(users)
      .leftJoin(delegateProfiles, eq(users.id, delegateProfiles.userId))
      .where(whereClause)
      .orderBy(users.createdAt)
      .limit(limit)
      .offset(offset)
      .all();

    const totalResult = await this.db
      .select({ count: count() })
      .from(users)
      .leftJoin(delegateProfiles, eq(users.id, delegateProfiles.userId))
      .where(whereClause)
      .get();

    return {
      users: userList.map(({ user, profile }: any) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as UserRole,
        registrationStatus: user.registrationStatus as "pending" | "approved" | "rejected",
        council: user.council || undefined,
        created_at:
          user.createdAt instanceof Date ? user.createdAt.getTime() : user.createdAt,
        depositAmount: profile?.depositAmount ?? undefined,
        fullAmount: profile?.fullAmount ?? undefined,
        depositPaymentStatus: profile?.depositPaymentStatus ?? undefined,
        fullPaymentStatus: profile?.fullPaymentStatus ?? undefined,
        paymentProofR2Key: profile?.paymentProofR2Key ?? undefined,
      })),
      total: totalResult?.count || 0,
    };
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<User | null> {
    const updates: Record<string, any> = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.council !== undefined) updates.council = input.council;
    if (input.role !== undefined) updates.role = input.role;
    // @ts-ignore - input might have emailVerified if we extend the type or pass it manually
    if (input.emailVerified !== undefined) updates.emailVerified = input.emailVerified;

    if (Object.keys(updates).length === 0) {
      return this.getUserById(id);
    }

    await this.db.update(users).set(updates).where(eq(users.id, id)).run();

    return this.getUserById(id);
  }

  async deleteUser(id: string, adminId: string): Promise<boolean> {
    if (id === adminId) {
      throw new Error('Cannot delete yourself');
    }

    await this.db.delete(delegateAnswers).where(eq(delegateAnswers.userId, id)).run();
    await this.db.delete(delegateProfiles).where(eq(delegateProfiles.userId, id)).run();

    await this.db.delete(postReplies).where(eq(postReplies.authorId, id)).run();

    const authoredPosts = await this.db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.authorId, id))
      .all();
    const postIds = authoredPosts.map((p) => p.id);
    if (postIds.length > 0) {
      await this.db.delete(postReplies).where(inArray(postReplies.postId, postIds)).run();
      await this.db.delete(postLikes).where(inArray(postLikes.postId, postIds)).run();
      await this.db.delete(postMedia).where(inArray(postMedia.postId, postIds)).run();
      await this.db.delete(posts).where(inArray(posts.id, postIds)).run();
    }

    await this.db.delete(postLikes).where(eq(postLikes.userId, id)).run();

    await this.db
      .delete(benefitRedemptions)
      .where(
        or(eq(benefitRedemptions.userId, id), eq(benefitRedemptions.scannedBy, id))
      )
      .run();

    await this.db
      .delete(attendanceRecords)
      .where(
        or(eq(attendanceRecords.userId, id), eq(attendanceRecords.scannedBy, id))
      )
      .run();

    await this.db.delete(qrTokens).where(eq(qrTokens.userId, id)).run();

    await this.db
      .delete(impersonationLog)
      .where(
        or(eq(impersonationLog.adminId, id), eq(impersonationLog.targetId, id))
      )
      .run();

    await this.db
      .delete(countryAssignments)
      .where(
        or(eq(countryAssignments.userId, id), eq(countryAssignments.assignedBy, id))
      )
      .run();

    await this.db
      .delete(awards)
      .where(or(eq(awards.userId, id), eq(awards.givenBy, id)))
      .run();

    await this.db.delete(qrScanLog).where(eq(qrScanLog.scannedBy, id)).run();

    await this.db.delete(sessions).where(eq(sessions.userId, id)).run();
    await this.db.delete(accounts).where(eq(accounts.userId, id)).run();

    await this.db.delete(users).where(eq(users.id, id)).run();

    return true;
  }

  private async getUserById(id: string): Promise<User | null> {
    const row = await this.db
      .select({ user: users, profile: delegateProfiles })
      .from(users)
      .leftJoin(delegateProfiles, eq(users.id, delegateProfiles.userId))
      .where(eq(users.id, id))
      .get();

    if (!row) return null;
    const { user, profile } = row;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      registrationStatus: user.registrationStatus as "pending" | "approved" | "rejected",
      council: user.council || undefined,
      created_at:
        user.createdAt instanceof Date ? user.createdAt.getTime() : user.createdAt,
      depositAmount: profile?.depositAmount ?? undefined,
      fullAmount: profile?.fullAmount ?? undefined,
      depositPaymentStatus: profile?.depositPaymentStatus ?? undefined,
      fullPaymentStatus: profile?.fullPaymentStatus ?? undefined,
      paymentProofR2Key: profile?.paymentProofR2Key ?? undefined,
    };
  }
}
