import { User, UserRole } from '@trackmun/shared';
import { DbType } from '../../db/client';
import { users, impersonationLog } from '../../db/schema';
import { eq } from 'drizzle-orm';

export class AuthService {
  constructor(private db: DbType) {}

  async getUserById(id: string): Promise<User | null> {
    const user = await this.db.select().from(users).where(eq(users.id, id)).get();

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      council: user.council || undefined,
      created_at:
        user.createdAt instanceof Date ? user.createdAt.getTime() : user.createdAt,
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
