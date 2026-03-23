/**
 * Authentication middleware
 * Provides JWT verification and role-based access control
 */

import { Context, Next } from 'hono';
import { ApiResponse } from '@trackmun/shared';

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

export interface AuthPayload {
  userId: string;
  email: string;
  role: 'delegate' | 'oc' | 'chair' | 'admin';
  council?: string;
  acting_as?: string;
}

export interface AuthContext extends Context<{ Bindings: Bindings }> {
  get: (key: string) => any;
  set: (key: string, value: any) => void;
  env: Bindings;
}

/**
 * Verify JWT token and extract payload
 */
async function verifyJWT(token: string, secret: string): Promise<AuthPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(atob(parts[1]));

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    // Verify signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const data = encoder.encode(`${parts[0]}.${parts[1]}`);
    const signature = Uint8Array.from(atob(parts[2]), (c) => c.charCodeAt(0));

    const isValid = await crypto.subtle.verify('HMAC', key, signature, data);

    if (!isValid) {
      return null;
    }

    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      council: payload.council,
      acting_as: payload.acting_as,
    };
  } catch {
    return null;
  }
}

/**
 * Authentication middleware
 * Verifies JWT and attaches user payload to context
 */
export async function withAuth(c: AuthContext, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Missing or invalid authorization header',
        code: 'MISSING_AUTH',
      },
      401
    );
  }

  const token = authHeader.substring(7);
  const payload = await verifyJWT(token, c.env.JWT_SECRET);

  if (!payload) {
    return c.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
      },
      401
    );
  }

  // Attach user payload to context
  c.set('user', payload);

  await next();
}

/**
 * Role-based access control middleware
 * Requires user to have one of the specified roles
 */
export function withRole(...allowedRoles: AuthPayload['role'][]) {
  return async (c: AuthContext, next: Next) => {
    const user = c.get('user') as AuthPayload | undefined;

    if (!user) {
      return c.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
        401
      );
    }

    // Use acting_as role if impersonating
    const effectiveRole = user.acting_as || user.role;

    if (!allowedRoles.includes(effectiveRole as AuthPayload['role'])) {
      return c.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Insufficient permissions',
          code: 'FORBIDDEN',
        },
        403
      );
    }

    await next();
  };
}

/**
 * Combined authentication and role check middleware
 * Usage: router.post('/path', withAuthAndRole('admin', 'chair'), handler)
 */
export function withAuthAndRole(...allowedRoles: AuthPayload['role'][]) {
  return [withAuth, withRole(...allowedRoles)];
}
