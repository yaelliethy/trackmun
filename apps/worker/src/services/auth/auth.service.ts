import { User, UserRole } from '@trackmun/shared';
import { DbType } from '../../db/client';
import { users, impersonationLog, delegateProfiles, settings, delegateAnswers } from '../../db/schema';
import { eq, inArray } from 'drizzle-orm';
import { getSupabaseAdmin } from '../../lib/supabase-admin';
import { Bindings } from '../../types/env';

export class AuthService {
  constructor(private db: DbType) {}

  async getUserById(id: string): Promise<User | null> {
    const user = await this.db.select().from(users).where(eq(users.id, id)).get();

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: user.name,
      role: user.role as UserRole,
      registrationStatus: (user.registrationStatus as 'pending' | 'approved' | 'rejected') || 'pending',
      council: user.council || undefined,
      created_at:
        user.createdAt instanceof Date ? user.createdAt.getTime() : user.createdAt,
    };
  }

  async registerDelegate(
    env: Bindings,
    data: {
      email: string;
      firstName: string;
      lastName: string;
      answers?: Record<string, string>;
      paymentProofR2Key?: string;
    }
  ): Promise<User> {
    const supabase = getSupabaseAdmin(env);

    const fullName = `${data.firstName} ${data.lastName}`;

    const userResult = await supabase.createUser({
      email: data.email,
      password: crypto.randomUUID(), // Auto-generate password
      email_confirm: true,
      user_metadata: {
        name: fullName,
        firstName: data.firstName,
        lastName: data.lastName,
      },
    });

    if (!userResult || !userResult.id) {
      throw new Error('Failed to create user in Supabase');
    }

    const userId = userResult.id;

    // Create user in Turso
    await this.db.insert(users).values({
      id: userId,
      email: data.email,
      name: fullName,
      firstName: data.firstName,
      lastName: data.lastName,
      role: 'delegate',
      registrationStatus: 'pending',
    }).run();

    try {
      await supabase.syncTrackmunJwtMetadata(
        userId,
        {
          role: 'delegate',
          registrationStatus: 'pending',
          council: null,
        },
        {
          user_metadata: {
            name: fullName,
            firstName: data.firstName,
            lastName: data.lastName,
          },
        }
      );
    } catch (e) {
      console.error(`[AuthService] syncTrackmunJwtMetadata failed for new delegate ${userId}:`, e);
    }

    const registrationSettingKeys = [
      'registration_deposit_amount',
      'registration_full_amount',
    ] as const;
    const settingsRows = await this.db
      .select()
      .from(settings)
      .where(inArray(settings.key, [...registrationSettingKeys]))
      .all();
    let depositAmount: number | null = null;
    let fullAmount: number | null = null;
    for (const row of settingsRows) {
      if (row.key === 'registration_deposit_amount') depositAmount = parseInt(row.value, 10);
      if (row.key === 'registration_full_amount') fullAmount = parseInt(row.value, 10);
    }

    // Create delegate profile
    await this.db
      .insert(delegateProfiles)
      .values({
        userId: userId,
        depositAmount,
        fullAmount,
        paymentProofR2Key: data.paymentProofR2Key,
      } as any)
      .run();

    if (data.answers && Object.keys(data.answers).length > 0) {
      const now = new Date();
      const answerRows = Object.entries(data.answers).map(([questionId, value]) => ({
        id: crypto.randomUUID(),
        userId: userId,
        questionId,
        value,
        createdAt: now,
        updatedAt: now,
      }));
      await this.db.insert(delegateAnswers).values(answerRows as any[]).run();
    }

    return {
      id: userId,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      name: fullName,
      role: 'delegate',
      registrationStatus: 'pending',
      council: undefined,
      created_at: Date.now(),
    };
  }

  async logImpersonation(adminId: string, targetId: string): Promise<string> {
    const logId = crypto.randomUUID();

    await this.db
      .insert(impersonationLog)
      .values({
        id: logId,
        adminId,
        targetId,
        startedAt: Math.floor(Date.now() / 1000),
      })
      .run();

    return logId;
  }

  async createImpersonationToken(payload: any, secret: string): Promise<string> {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '');
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '');
    const data = `${encodedHeader}.${encodedPayload}`;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    return `${data}.${encodedSignature}`;
  }
}
