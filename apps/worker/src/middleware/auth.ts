import { MiddlewareHandler } from 'hono';
import { Bindings } from '../types/env';
import { User, UserRole } from '@trackmun/shared';
import { getDb } from '../db/client';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { decodeJwtPayloadJson, verifySupabaseJwt } from '../lib/verify-supabase-jwt';
import { userFromAccessTokenPayload } from '../lib/jwt-user-claims';

export type AuthContext = {
  user: User;
  isImpersonating: boolean;
  adminId?: string;
};

export const withAuth: MiddlewareHandler<{ Bindings: Bindings; Variables: AuthContext }> = async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader) {
    return c.json(
      { success: false, error: 'Please sign in to continue.', code: 'UNAUTHORIZED' },
      401
    );
  }

  const [type, token] = authHeader.split(' ');

  if (type !== 'Bearer' || !token) {
    return c.json(
      {
        success: false,
        error: 'Something went wrong with your sign-in. Please try signing in again.',
        code: 'UNAUTHORIZED',
      },
      401
    );
  }

  const parts = token.split('.');

  // 1. Three-part JWT: impersonation (HMAC) or Supabase access (HS256)
  if (parts.length === 3) {
    const payload = decodeJwtPayloadJson(token);

    if (payload?.typ === 'impersonation') {
      const isValid = await verifyHmacJwt(token, c.env.IMPERSONATION_SECRET);
      if (isValid && typeof payload.actingAs === 'string') {
        const user = await fetchUserFromD1(payload.actingAs);
        if (user) {
          c.set('user', user);
          c.set('isImpersonating', true);
          if (typeof payload.adminId === 'string') {
            c.set('adminId', payload.adminId);
          }
          return await next();
        }
      }
    } else {
      const accessPayload = await verifySupabaseJwt(
        token,
        c.env.SUPABASE_JWT_SECRET,
        c.env.SUPABASE_URL
      );
      const sub = accessPayload?.sub;
      if (typeof sub === 'string') {
        const fromClaims =
          accessPayload && typeof accessPayload === 'object'
            ? userFromAccessTokenPayload(accessPayload as Record<string, unknown>)
            : null;

        const user = fromClaims ?? (await fetchUserFromD1(sub));
        if (user) {
          c.set('user', user);
          c.set('isImpersonating', false);
          return await next();
        }
        return c.json(
          {
            success: false,
            error:
              "We couldn't find your conference profile yet. If you just registered, wait for approval or finish signing up. If this keeps happening, contact your organizer.",
            code: 'USER_NOT_IN_DATABASE',
          },
          401
        );
      }
      return c.json(
        {
          success: false,
          error: 'Your session has expired or is no longer valid. Please sign out and sign in again.',
          code: 'INVALID_ACCESS_TOKEN',
        },
        401
      );
    }
  }

  return c.json(
    {
      success: false,
      error: 'Your session has expired or is no longer valid. Please sign out and sign in again.',
      code: 'UNAUTHORIZED',
    },
    401
  );
};

const USER_CACHE_TTL_SECONDS = 300; // 5 minutes

async function fetchUserFromD1(userId: string): Promise<User | null> {
  const cache = (caches as any).default;
  const cacheKey = `http://internal/user/${userId}`;
  
  try {
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      return await cachedResponse.json();
    }
  } catch (e) {
    console.warn('Cache API mismatch or error:', e);
  }

  const db = getDb();
  try {
    const user = await db.select().from(users).where(eq(users.id, userId)).get();
    if (!user) {
      console.warn(`fetchUserFromD1: User not found in Turso for ID: ${userId}`);
      return null;
    }
    
    const mappedUser: User = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      registrationStatus: user.registrationStatus as "pending" | "approved" | "rejected",
      council: user.council || undefined,
      created_at:
        user.createdAt instanceof Date ? user.createdAt.getTime() : user.createdAt,
    };

    try {
      const response = new Response(JSON.stringify(mappedUser), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${USER_CACHE_TTL_SECONDS}`,
        },
      });
      // Use waitUntil if available on the context, but here we don't have it easily 
      // without passing it down. For now, just await.
      await cache.put(cacheKey, response);
    } catch (e) {
      console.warn('Failed to put in Cache API:', e);
    }

    return mappedUser;
  } catch (err) {
    console.error(`fetchUserFromD1: Database error for ID: ${userId}`, err);
    return null;
  }
}

const hmacVerifyKeyCache = new Map<string, CryptoKey>();

async function getHmacVerifyKey(secret: string): Promise<CryptoKey> {
  let key = hmacVerifyKeyCache.get(secret);
  if (!key) {
    const encoder = new TextEncoder();
    key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    hmacVerifyKeyCache.set(secret, key);
  }
  return key;
}

async function verifyHmacJwt(token: string, secret: string): Promise<boolean> {
  const [header, payload, signature] = token.split('.');
  const data = `${header}.${payload}`;

  const encoder = new TextEncoder();
  const key = await getHmacVerifyKey(secret);

  const normalizedSig = signature.replace(/-/g, '+').replace(/_/g, '/');
  const sigBuf = Uint8Array.from(atob(normalizedSig), (c) => c.charCodeAt(0));
  return await crypto.subtle.verify('HMAC', key, sigBuf, encoder.encode(data));
}
