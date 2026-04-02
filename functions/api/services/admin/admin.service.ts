import { User, UserRole, UpdateUserSchema } from '@trackmun/shared';
import { DbType, getLibsqlClient, type InStatement } from '../../db/client';
import {
  users,
  delegateProfiles,
  posts,
} from '../../db/schema';
import { eq, or, and, like, SQL, sql } from 'drizzle-orm';
import { z } from 'zod';
import { OcService } from '../oc/oc.service';
import { SupabaseAdmin, getSupabaseAdmin } from '../../lib/supabase-admin';
import { Bindings } from '../../types/env';

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

export interface UserFilters {
  search?: string;
  registrationStatus?: 'pending' | 'approved' | 'rejected';
  council?: string;
  depositPaymentStatus?: 'pending' | 'paid';
  fullPaymentStatus?: 'pending' | 'paid';
}

export class AdminService {
  constructor(private db: DbType) { }

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

    const rowsWithCount = await this.db
      .select({
        user: users,
        profile: delegateProfiles,
        total_count: sql<number>`COUNT(*) OVER()`,
        daysAttended: sql<number>`(SELECT count(DISTINCT date(scanned_at, 'unixepoch')) FROM attendance_records WHERE user_id = ${users.id})`,
      })
      .from(users)
      .leftJoin(delegateProfiles, eq(users.id, delegateProfiles.userId))
      .where(whereClause)
      .orderBy(users.createdAt)
      .limit(limit)
      .offset(offset)
      .all();

    // Extract the total count from the first row (all rows have the same total_count)
    const totalCount = rowsWithCount.length > 0 ? rowsWithCount[0].total_count : 0;

    // Extract just the users + profiles
    const userList = rowsWithCount.map(row => ({
      user: row.user,
      profile: row.profile,
      daysAttended: row.daysAttended,
    }));
    return {
      users: userList.map(({ user, profile, daysAttended }: any) => ({
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
        daysAttended: daysAttended ?? 0,
      })),
      total: totalCount || 0,
    };
  }

  async updateUser(id: string, input: UpdateUserInput, supabase?: SupabaseAdmin): Promise<User | null> {
    const updates: Record<string, any> = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.council !== undefined) updates.council = input.council;
    if (input.role !== undefined) updates.role = input.role;
    // @ts-ignore - input might have emailVerified if we extend the type or pass it manually
    if (input.emailVerified !== undefined) updates.emailVerified = input.emailVerified;
    // @ts-ignore - registrationStatus is an extended field passed from registration controller
    if (input.registrationStatus !== undefined) updates.registrationStatus = input.registrationStatus;

    if (Object.keys(updates).length === 0) {
      return this.getUserById(id);
    }

    await this.db.update(users).set(updates).where(eq(users.id, id)).run();

    // Sync with Supabase if it affects authentication/identity
    if (supabase && (updates.name !== undefined || updates.email !== undefined)) {
      try {
        await supabase.updateUser(id, {
          user_metadata: updates.name ? { name: updates.name } : undefined,
          email: updates.email,
        });
      } catch (e) {
        console.error(`[AdminService] Failed to sync update to Supabase for user ${id}:`, e);
      }
    }

    // Auto-assign delegate identifier when status changes to 'approved' or if already approved but missing one
    const userAfter = await this.getUserById(id);
    if (userAfter?.registrationStatus === 'approved' && userAfter?.role === 'delegate') {
      const profile = await this.db.select({ identifier: delegateProfiles.identifier }).from(delegateProfiles).where(eq(delegateProfiles.userId, id)).get();
      if (!profile?.identifier) {
        const ocService = new OcService(this.db);
        await ocService.assignIdentifier(id);
      }
    }

    const finalUser = await this.getUserById(id);
    if (supabase && finalUser) {
      try {
        await supabase.syncTrackmunJwtMetadata(
          id,
          {
            role: finalUser.role,
            registrationStatus: finalUser.registrationStatus,
            council: finalUser.council ?? null,
          },
          finalUser.name ? { user_metadata: { name: finalUser.name } } : undefined
        );
      } catch (e) {
        console.error(`[AdminService] Failed to sync JWT app_metadata for user ${id}:`, e);
      }
    }

    return finalUser;
  }

  async deleteUser(id: string, adminId: string, supabase?: SupabaseAdmin): Promise<boolean> {
    if (id === adminId) {
      throw new Error('Cannot delete yourself');
    }

    const authoredPosts = await this.db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.authorId, id))
      .all();
    const postIds = authoredPosts.map((p) => p.id);

    const batchStmts: InStatement[] = [
      { sql: 'DELETE FROM delegate_answers WHERE user_id = ?', args: [id] },
      { sql: 'DELETE FROM delegate_profiles WHERE user_id = ?', args: [id] },
      { sql: 'DELETE FROM post_replies WHERE author_id = ?', args: [id] },
    ];

    if (postIds.length > 0) {
      const ph = postIds.map(() => '?').join(', ');
      batchStmts.push(
        { sql: `DELETE FROM post_replies WHERE post_id IN (${ph})`, args: [...postIds] },
        { sql: `DELETE FROM post_likes WHERE post_id IN (${ph})`, args: [...postIds] },
        { sql: `DELETE FROM post_media WHERE post_id IN (${ph})`, args: [...postIds] },
        { sql: `DELETE FROM posts WHERE id IN (${ph})`, args: [...postIds] }
      );
    }

    batchStmts.push(
      { sql: 'DELETE FROM post_likes WHERE user_id = ?', args: [id] },
      {
        sql: 'DELETE FROM benefit_redemptions WHERE user_id = ? OR scanned_by = ?',
        args: [id, id],
      },
      {
        sql: 'DELETE FROM attendance_records WHERE user_id = ? OR scanned_by = ?',
        args: [id, id],
      },
      { sql: 'DELETE FROM qr_tokens WHERE user_id = ?', args: [id] },
      {
        sql: 'DELETE FROM impersonation_log WHERE admin_id = ? OR target_id = ?',
        args: [id, id],
      },
      {
        sql: 'DELETE FROM country_assignments WHERE user_id = ? OR assigned_by = ?',
        args: [id, id],
      },
      {
        sql: 'DELETE FROM awards WHERE user_id = ? OR given_by = ?',
        args: [id, id],
      },
      { sql: 'DELETE FROM qr_scan_log WHERE scanned_by = ?', args: [id] },
      { sql: 'DELETE FROM users WHERE id = ?', args: [id] }
    );

    await getLibsqlClient().batch(batchStmts, 'write');

    // Sync deletion with Supabase
    if (supabase) {
      try {
        await supabase.deleteUser(id);
      } catch (e) {
        console.error(`[AdminService] Failed to sync deletion to Supabase for user ${id}:`, e);
        // User might already be deleted in Supabase or it might be down.
      }
    }

    return true;
  }

  async createProvisionedUser(
    env: Bindings,
    role: UserRole,
    body: { email: string; password: string; name: string; council?: string | null }
  ): Promise<{ ok: true; user: User } | { ok: false; error: string }> {
    const supabase = getSupabaseAdmin(env);
    try {
      const res = await supabase.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
        user_metadata: {
          name: body.name,
        },
      });

      if (!res?.id) {
        return { ok: false, error: 'Failed to create user in Supabase' };
      }

      await this.db
        .insert(users)
        .values({
          id: res.id,
          email: body.email,
          name: body.name,
          role,
          council: body.council ?? undefined,
          registrationStatus: 'approved',
          emailVerified: true,
        })
        .run();

      // Ensure delegate profile and identifier exist if role is delegate
      if (role === 'delegate') {
        await this.db.insert(delegateProfiles).values({
          userId: res.id,
          depositPaymentStatus: 'paid', // Provisioned users are usually fully paid/approved
          fullPaymentStatus: 'paid',
        }).run();

        const ocService = new OcService(this.db);
        await ocService.assignIdentifier(res.id);
      }

      try {
        await supabase.syncTrackmunJwtMetadata(
          res.id,
          {
            role,
            registrationStatus: 'approved',
            council: body.council ?? null,
          },
          { user_metadata: { name: body.name } }
        );
      } catch (e) {
        console.error(`[AdminService] syncTrackmunJwtMetadata failed for ${res.id}:`, e);
      }

      const user = await this.getUserById(res.id);
      if (!user) {
        return { ok: false, error: 'User was created but could not be loaded' };
      }
      return { ok: true, user };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Internal error';
      return { ok: false, error: message };
    }
  }

  async updateDelegatePaymentProfile(
    userId: string,
    updates: { depositPaymentStatus?: string; fullPaymentStatus?: string }
  ): Promise<'ok' | 'not_found'> {
    const profile = await this.db
      .select()
      .from(delegateProfiles)
      .where(eq(delegateProfiles.userId, userId))
      .get();
    if (!profile) return 'not_found';

    const patch: Partial<typeof delegateProfiles.$inferInsert> = {};
    if (updates.depositPaymentStatus === 'pending' || updates.depositPaymentStatus === 'paid') {
      patch.depositPaymentStatus = updates.depositPaymentStatus;
    }
    if (updates.fullPaymentStatus === 'pending' || updates.fullPaymentStatus === 'paid') {
      patch.fullPaymentStatus = updates.fullPaymentStatus;
    }

    if (Object.keys(patch).length > 0) {
      await this.db.update(delegateProfiles).set(patch).where(eq(delegateProfiles.userId, userId)).run();
    }
    return 'ok';
  }

  async getUserById(id: string): Promise<User | null> {
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
