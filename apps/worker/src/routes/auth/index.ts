import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { Bindings } from '../../types/env';
import { AuthContext, withAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { UserSchema, RegisterUserSchema } from '@trackmun/shared';
import { AuthController } from '../../controllers/auth/auth.controller';
import { getDb } from '../../db/client';
import { getAuth } from '../../lib/auth';

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

// better-auth endpoints for Swagger documentation
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
              token: z.string(),
              user: UserSchema,
            }),
          },
        },
      },
      401: { description: 'Invalid credentials' },
    },
    summary: 'Sign in with email and password',
  }),
  async (c) => {
    const db = getDb();
    const betterAuth = getAuth(c.env, db);
    // OpenAPI validation consumes the body; better-auth must receive a fresh Request.
    const body = c.req.valid('json');
    const forward = new Request(c.req.raw.url, {
      method: 'POST',
      headers: c.req.raw.headers,
      body: JSON.stringify(body),
    });
    return betterAuth.handler(forward);
  }
);

auth.openapi(
  createRoute({
    method: 'get',
    path: '/token',
    responses: {
      200: {
        description: 'Access token generated',
        content: {
          'application/json': {
            schema: z.object({
              token: z.string(),
            }),
          },
        },
      },
    },
    summary: 'Exchange session for access JWT',
  }),
  async (c) => {
    const db = getDb();
    const betterAuth = getAuth(c.env, db);
    return betterAuth.handler(c.req.raw) as any;
  }
);

// better-auth has no /refresh; JWT access is issued at GET /auth/token. Alias for clients.
auth.openapi(
  createRoute({
    method: 'post',
    path: '/refresh',
    responses: {
      200: {
        description: 'New JWT from session cookie',
        content: {
          'application/json': {
            schema: z.object({ token: z.string() }),
          },
        },
      },
    },
    summary: 'Refresh JWT (same as GET /auth/token; requires session cookie)',
  }),
  async (c) => {
    const db = getDb();
    const betterAuth = getAuth(c.env, db);
    const url = new URL(c.req.url);
    url.pathname = '/auth/token';
    const tokenRequest = new Request(url.toString(), {
      method: 'GET',
      headers: c.req.raw.headers,
    });
    return betterAuth.handler(tokenRequest) as any;
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
    const db = getDb();
    const betterAuth = getAuth(c.env, db);
    return betterAuth.handler(c.req.raw) as any;
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

// Pass through any other /auth/* path to better-auth (sign-up, get-session, OAuth, etc.)
auth.all('*', async (c) => {
  const db = getDb();
  const betterAuth = getAuth(c.env, db);
  return betterAuth.handler(c.req.raw);
});

export default auth;
