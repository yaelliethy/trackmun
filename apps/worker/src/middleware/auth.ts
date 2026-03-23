import { MiddlewareHandler } from 'hono';
import { getFirebaseToken } from '@hono/firebase-auth';
import { Bindings } from '../types/env';
import { User, UserRole } from '@trackmun/shared';

export type AuthContext = {
  user: User;
  isImpersonating: boolean;
  adminId?: string;
};

export const withAuth: MiddlewareHandler<{ Bindings: Bindings; Variables: AuthContext }> = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader) {
    return c.json({ success: false, error: 'Authorization header missing', code: 'UNAUTHORIZED' }, 401);
  }

  const [type, token] = authHeader.split(' ');

  // 1. Check for Impersonation Token (HMAC-SHA256)
  if (type === 'Bearer' && token.split('.').length === 3) {
    try {
      // Simple check if it's our custom JWT (impersonation)
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.typ === 'impersonation') {
        const isValid = await verifyImpersonationToken(token, c.env.IMPERSONATION_SECRET);
        if (isValid) {
          const user = await fetchUserFromD1(c.env.DB, payload.actingAs);
          if (user) {
            c.set('user', user);
            c.set('isImpersonating', true);
            c.set('adminId', payload.adminId);
            return await next();
          }
        }
      }
    } catch (e) {
      // Fall through to Firebase check if impersonation check fails
    }
  }

  // 2. Fallback to Firebase Token (handled by verifyFirebaseAuth middleware before this)
  const firebaseToken = getFirebaseToken(c);
  if (!firebaseToken) {
    return c.json({ success: false, error: 'Invalid or missing token', code: 'UNAUTHORIZED' }, 401);
  }

  const user = await fetchUserFromD1(c.env.DB, firebaseToken.uid);
  if (!user) {
    return c.json({ success: false, error: 'User not synced with database', code: 'USER_NOT_SYNCED' }, 403);
  }

  c.set('user', user);
  c.set('isImpersonating', false);
  
  await next();
};

async function fetchUserFromD1(db: D1Database, userId: string): Promise<User | null> {
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first<any>();
  if (!user) return null;
  
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
    council: user.council,
    created_at: user.created_at,
  };
}

async function verifyImpersonationToken(token: string, secret: string): Promise<boolean> {
  const [header, payload, signature] = token.split('.');
  const data = `${header}.${payload}`;
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  
  const sigBuf = Uint8Array.from(atob(signature.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  return await crypto.subtle.verify('HMAC', key, sigBuf, encoder.encode(data));
}
