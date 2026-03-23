import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { getFirebaseToken } from '@hono/firebase-auth';
import { Bindings } from '../types/env';
import { AuthContext, withAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { UserSchema, UserRole, AuthSyncSchema, ApiResponseSchema } from '@trackmun/shared';

const auth = new OpenAPIHono<{ Bindings: Bindings; Variables: AuthContext }>();

// Sync user from Firebase to D1
auth.openapi(
  createRoute({
    method: 'post',
    path: '/sync',
    request: {
      body: {
        content: {
          'application/json': {
            schema: AuthSyncSchema,
          },
        },
      },
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.object({
              success: z.literal(true),
              data: UserSchema,
            }),
          },
        },
        description: 'User synced successfully',
      },
      401: {
        description: 'Unauthorized',
      },
    },
    summary: 'Sync Firebase user to D1',
  }),
  async (c) => {
    const token = getFirebaseToken(c);
    if (!token) return c.json({ success: false, error: 'Unauthorized' }, 401);

    const { name } = c.req.valid('json');
    
    // Insert or ignore (if already exists)
    await c.env.DB.prepare(`
      INSERT INTO users (id, email, name, role, created_at)
      VALUES (?, ?, ?, 'delegate', unixepoch())
      ON CONFLICT(id) DO UPDATE SET
        email = excluded.email,
        name = COALESCE(users.name, excluded.name)
    `).bind(token.uid, token.email, name || '').run();

    const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(token.uid).first<any>();

    return c.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as UserRole,
        council: user.council,
        created_at: user.created_at,
      },
    });
  }
);

// Get current user (with role/council from D1)
auth.openapi(
  createRoute({
    method: 'get',
    path: '/me',
    middleware: [withAuth],
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.object({
              success: z.literal(true),
              data: UserSchema,
            }),
          },
        },
        description: 'Current user profile',
      },
      401: {
        description: 'Unauthorized',
      },
    },
    summary: 'Get current user profile',
  }),
  (c) => {
    return c.json({
      success: true,
      data: c.get('user'),
    });
  }
);

// Admin: Impersonate a user
auth.openapi(
  createRoute({
    method: 'post',
    path: '/admin/impersonate/{userId}',
    middleware: [withAuth, requireRole('admin')],
    request: {
      params: z.object({
        userId: z.string().openapi({ example: 'user_123' }),
      }),
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.object({
              success: z.literal(true),
              data: z.object({
                token: z.string(),
              }),
            }),
          },
        },
        description: 'Impersonation token generated',
      },
      404: {
        description: 'Target user not found',
      },
    },
    summary: 'Admin: Impersonate a user',
  }),
  async (c) => {
    const admin = c.get('user');
    const { userId: targetId } = c.req.valid('param');
    
    const targetUser = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(targetId).first<any>();
    if (!targetUser) {
      return c.json({ success: false, error: 'Target user not found' }, 404);
    }

    // Log impersonation
    const logId = crypto.randomUUID();
    await c.env.DB.prepare(`
      INSERT INTO impersonation_log (id, admin_id, target_id, started_at)
      VALUES (?, ?, ?, unixepoch())
    `).bind(logId, admin.id, targetId).run();

    // Create impersonation token (HMAC-SHA256 JWT)
    const payload = {
      typ: 'impersonation',
      adminId: admin.id,
      actingAs: targetId,
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      iat: Math.floor(Date.now() / 1000),
      logId,
    };

    const token = await createImpersonationToken(payload, c.env.IMPERSONATION_SECRET);

    return c.json({
      success: true,
      data: { token },
    });
  }
);

// Admin: Unimpersonate
auth.openapi(
  createRoute({
    method: 'post',
    path: '/admin/unimpersonate',
    middleware: [withAuth],
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.object({
              success: z.literal(true),
              data: z.null(),
            }),
          },
        },
        description: 'Unimpersonated successfully',
      },
    },
    summary: 'Admin: Stop impersonation',
  }),
  async (c) => {
    if (!c.get('isImpersonating')) {
      return c.json({ success: false, error: 'Not currently impersonating' }, 400);
    }
    return c.json({
      success: true,
      data: null,
    });
  }
);

async function createImpersonationToken(payload: any, secret: string): Promise<string> {
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

export default auth;
