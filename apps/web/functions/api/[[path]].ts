import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { handle } from 'hono/cloudflare-pages';
import { cors } from 'hono/cors';
import { swaggerUI } from '@hono/swagger-ui';
import { Bindings } from './types/env';
import { AuthContext } from './middleware/auth';
import { initializeDb } from './db/client';
import authRoutes from './routes/auth';
import delegateRoutes from './routes/admin/delegates';
import delegateProfileRoutes from './routes/delegates';
import ocRoutes from './routes/admin/oc';
import ocMemberRoutes from './routes/oc/index';
import chairRoutes from './routes/admin/chairs';
import setupRoutes from './routes/admin/setup';
import delegateSetupRoutes from './routes/delegates/setup';
import benefitsRoutes from './routes/admin/benefits';
import attendanceRoutes from './routes/admin/attendance';
import adminsRoutes from './routes/admin/admins';
import adminRegistrationRoutes from './routes/admin/registration';
import councilsRoutes from './routes/admin/councils';
import publicRegistrationRoutes from './routes/registration';
import uploadRoutes from './routes/upload';
import chairsRoutes from './routes/chairs';

const app = new OpenAPIHono<{ Bindings: Bindings; Variables: AuthContext }>().basePath('/api');

// CORS middleware for all routes - MUST be first to handle preflights even on errors
app.use('*', async (c, next) => {
  const origin = c.req.header('Origin');
  console.log(`CORS check: Origin=${origin}, FRONTEND_URL=${c.env.FRONTEND_URL}`);
  
  const middleware = cors({
    origin: (origin, c) => {
      const allowedOrigins = [
        c.env.FRONTEND_URL,
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'https://trackmun.app',
        'https://trackmun.pages.dev',
      ].filter(Boolean);

      if (allowedOrigins.includes(origin) || (origin && (origin.endsWith('.pages.dev') || origin.endsWith('.workers.dev')))) {
        return origin;
      }
      return allowedOrigins[0] || origin || '*';
    },
    allowHeaders: ['Authorization', 'Content-Type', 'Accept', 'Origin'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['Content-Length', 'X-Kuma-Revision', 'set-auth-jwt', 'set-cookie'],
    credentials: true,
    maxAge: 86400,
  });
  return middleware(c, next);
});

// Global error handler
app.onError((err, c) => {
  console.error(`Unhandled error: ${err.message}`, err);
  return c.json({
    success: false,
    error: err.message || 'Internal Server Error',
    code: 'INTERNAL_SERVER_ERROR'
  }, 500);
});

let initPromise: Promise<void> | null = null;

app.use('*', async (c, next) => {
  if (!initPromise) {
    const startTime = performance.now();
    initPromise = (async () => {
      // 1. Validate required bindings
      const requiredBindings = [
        'TURSO_DATABASE_URL',
        'TURSO_AUTH_TOKEN',
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
        'IMPERSONATION_SECRET',
      ];

      const isProduction = c.env.ENVIRONMENT === 'production';
      const missing = requiredBindings.filter(key => {
        const val = c.env[key as keyof Bindings];
        if (!val || val === '') return true;
        if (val === 'placeholder' && isProduction) return true;
        return false;
      });
      
      if (missing.length > 0) {
        const errorMsg = `Missing or invalid required bindings: ${missing.join(', ')}`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      // 2. Initialize database
      initializeDb({
        url: c.env.TURSO_DATABASE_URL,
        authToken: c.env.TURSO_AUTH_TOKEN,
      });

      const duration = (performance.now() - startTime).toFixed(2);
      console.log(`[Cold Start] App initialized in ${duration}ms`);
    })();
  }

  try {
    await initPromise;
  } catch (err: any) {
    return c.json({
      success: false,
      error: err.message || 'Failed to initialize application',
      code: 'INITIALIZATION_ERROR'
    }, 500);
  }
  
  return next();
});

// The OpenAPI documentation will be available at /doc
app.doc('/doc', {
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'TrackMUN API',
    description: 'API for the TrackMUN platform',
  },
});

// Swagger UI at /docs
app.get('/docs', swaggerUI({ url: '/api/doc' }));

// Base route
app.openapi(
  createRoute({
    method: 'get',
    path: '/',
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.object({
              success: z.boolean(),
              data: z.string(),
            }),
          },
        },
        description: 'TrackMUN API is running',
      },
    },
  }),
  (c) => {
    return c.json({
      success: true,
      data: 'TrackMUN API is running',
    });
  }
);

// Auth: custom routes + better-auth fallback live in ./routes/auth (catch-all last)
app.route('/auth', authRoutes);

app.route('/admin/delegates', delegateRoutes);
app.route('/admin/oc', ocRoutes);
app.route('/admin/chairs', chairRoutes);
app.route('/admin/setup', setupRoutes);
app.route('/delegates/setup', delegateSetupRoutes);
app.route('/delegates', delegateProfileRoutes);
app.route('/admin/benefits', benefitsRoutes);
app.route('/admin/attendance', attendanceRoutes);
app.route('/admin/admins', adminsRoutes);
app.route('/admin/registration', adminRegistrationRoutes);
app.route('/admin/councils', councilsRoutes);
app.route('/registration', publicRegistrationRoutes);
app.route('/upload', uploadRoutes);
app.route('/oc', ocMemberRoutes);
app.route('/chairs', chairsRoutes);

export { app };
export const onRequest = handle(app);
