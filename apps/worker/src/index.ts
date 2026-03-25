import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { swaggerUI } from '@hono/swagger-ui';
import { Bindings } from './types/env';
import { AuthContext } from './middleware/auth';
import { initializeDb } from './db/client';
import authRoutes from './routes/auth';
import delegateRoutes from './routes/admin/delegates';
import ocRoutes from './routes/admin/oc';
import chairRoutes from './routes/admin/chairs';
import setupRoutes from './routes/admin/setup';
import benefitsRoutes from './routes/admin/benefits';
import attendanceRoutes from './routes/admin/attendance';
import adminsRoutes from './routes/admin/admins';

const app = new OpenAPIHono<{ Bindings: Bindings; Variables: AuthContext }>();

// Initialize database middleware
app.use('*', async (c, next) => {
  initializeDb(c.env.DB);
  return next();
});

// CORS middleware for all routes
app.use('*', async (c, next) => {
  const middleware = cors({
    origin: [
      c.env.FRONTEND_URL,
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://trackmun.app', 
      'https://trackmun.yaelliethy.workers.dev',
      // @ts-ignore
      /\.pages\.dev$/
    ],
    allowHeaders: ['Authorization', 'Content-Type'],
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['set-auth-jwt'],
    credentials: true,
  });
  return middleware(c, next);
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
app.get('/docs', swaggerUI({ url: '/doc' }));

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
app.route('/admin/benefits', benefitsRoutes);
app.route('/admin/attendance', attendanceRoutes);
app.route('/admin/admins', adminsRoutes);

export default app;
