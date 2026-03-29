import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { Bindings } from '../../types/env';
import { AuthContext, withAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { UserSchema, RegisterUserSchema } from '@trackmun/shared';
import { AuthController } from '../../controllers/auth/auth.controller';

const auth = new OpenAPIHono<{ Bindings: Bindings; Variables: AuthContext }>();
const controller = new AuthController();

// Register new delegate (public route)
auth.openapi(
  createRoute({
    method: 'post',
    path: '/register',
    request: {
      body: {
        content: {
          'application/json': {
            schema: RegisterUserSchema,
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
              data: z.object({
                user: UserSchema,
              }),
            }),
          },
        },
        description: 'User registered successfully',
      },
      400: {
        description: 'Registration failed (email exists, invalid data)',
      },
    },
    summary: 'Register a new delegate account',
  }),
  controller.register
);

// Supabase Auth proxy endpoints for Swagger documentation
// Note: Frontend uses Supabase JS SDK directly, but we keep these for documentation/API consistency
auth.openapi(
  createRoute({
    method: 'post',
    path: '/sign-in/email',
    request: {
      body: {
        content: {
          'application/json': {
            schema: z.object({
              email: z.string().email(),
              password: z.string(),
            }),
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Signed in successfully',
        content: {
          'application/json': {
            schema: z.object({
              session: z.any(),
              user: UserSchema,
            }),
          },
        },
      },
      401: { description: 'Invalid credentials' },
    },
    summary: 'Sign in with email and password (Proxy to Supabase)',
  }),
  async (c) => {
    const body = c.req.valid('json');
    const response = await fetch(`${c.env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': c.env.SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: body.email,
        password: body.password,
      }),
    });

    const data = await response.json() as any;
    if (!response.ok) {
      return c.json({ success: false, error: data.error_description || data.error || 'Login failed' }, response.status as any);
    }

    return c.json(data);
  }
);

auth.openapi(
  createRoute({
    method: 'post',
    path: '/sign-out',
    responses: {
      200: {
        description: 'Signed out successfully',
      },
    },
    summary: 'Sign out',
  }),
  async (c) => {
    // Supabase sign out is handled on the client, but we provide a proxy for completeness
    const authHeader = c.req.header('Authorization');
    if (authHeader) {
      await fetch(`${c.env.SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          'apikey': c.env.SUPABASE_ANON_KEY,
          'Authorization': authHeader,
        },
      });
    }
    return c.json({ success: true, data: null });
  }
);

// Get current user (from JWT context)
auth.openapi(
  createRoute({
    method: 'get',
    path: '/me',
    middleware: [withAuth] as const,
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
  controller.getCurrentUser
);

// Admin: Impersonate a user
auth.openapi(
  createRoute({
    method: 'post',
    path: '/admin/impersonate/{userId}',
    middleware: [withAuth, requireRole('admin')] as const,
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
  controller.impersonateUser
);

// Admin: Unimpersonate
auth.openapi(
  createRoute({
    method: 'post',
    path: '/admin/unimpersonate',
    middleware: [withAuth] as const,
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
      400: {
        content: {
          'application/json': {
            schema: z.object({
              success: z.literal(false),
              error: z.string(),
            }),
          },
        },
        description: 'Not currently impersonating',
      },
    },
    summary: 'Admin: Stop impersonation',
  }),
  controller.unimpersonateUser
);

export default auth;
