import { User, UserRole } from '@trackmun/shared';
import { DbType } from '../../db/client';
import { users, impersonationLog, delegateProfiles, settings, delegateAnswers } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { getAuth } from '../../lib/auth';
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
    const auth = getAuth(env, this.db);

    const fullName = `${data.firstName} ${data.lastName}`;

    const result = await auth.api.signUpEmail({
      body: {
        email: data.email,
        name: fullName,
        password: crypto.randomUUID(), // Auto-generate password, will be sent via email
        firstName: data.firstName,
        lastName: data.lastName,
      },
    });

    if (!result || !result.user) {
      throw new Error('Failed to create user');
    }

    // Update user with additional fields
    await this.db
      .update(users)
      .set({
        firstName: data.firstName,
        lastName: data.lastName,
        registrationStatus: 'pending',
      })
      .where(eq(users.id, result.user.id))
      .run();

    // Read settings to snapshot fee amounts
    const settingsRows = await this.db.select().from(settings).all();
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
        userId: result.user.id,
        depositAmount,
        fullAmount,
        paymentProofR2Key: data.paymentProofR2Key,
      } as any)
      .run();

    // Insert dynamic answers
    if (data.answers) {
      const now = new Date();
      for (const [questionId, value] of Object.entries(data.answers)) {
        await this.db.insert(delegateAnswers).values({
          id: crypto.randomUUID(),
          userId: result.user.id,
          questionId,
          value,
          createdAt: now,
          updatedAt: now,
        } as any).run();
      }
    }

    return {
      id: result.user.id,
      email: result.user.email,
      firstName: data.firstName,
      lastName: data.lastName,
      name: fullName,
      role: (result.user.role as UserRole) || 'delegate',
      registrationStatus: 'pending',
      council: result.user.council || undefined,
      created_at:
        result.user.createdAt instanceof Date
          ? result.user.createdAt.getTime()
          : result.user.createdAt,
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
