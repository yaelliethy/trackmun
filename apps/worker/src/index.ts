import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { swaggerUI } from '@hono/swagger-ui';
import { verifyFirebaseAuth } from '@hono/firebase-auth';
import { Bindings } from './types/env';
import { AuthContext } from './middleware/auth';
import authRoutes from './routes/auth';

const app = new OpenAPIHono<{ Bindings: Bindings; Variables: AuthContext }>();

// CORS middleware for all routes
app.use('*', cors());

// Apply Firebase Auth globally
app.use('*', async (c, next) => {
  const middleware = verifyFirebaseAuth({
    projectId: c.env.FIREBASE_PROJECT_ID,
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

// Register routes
app.route('/auth', authRoutes);

export default app;
