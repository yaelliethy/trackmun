import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRouter } from './routes/auth/auth.routes';
import { ApiResponse } from '@trackmun/shared';

type Bindings = {
  DB: D1Database;
  MEDIA: R2Bucket;
  JWT_SECRET: string;
  BREVO_API_KEY: string;
  BREVO_SENDER_EMAIL: string;
  BREVO_SENDER_NAME: string;
  BREVO_WELCOME_TEMPLATE_ID: string;
  BREVO_QR_REMINDER_TEMPLATE_ID: string;
  BREVO_PASSWORD_RESET_TEMPLATE_ID: string;
  FRONTEND_URL: string;
  QR_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS middleware for all routes
app.use('*', cors());

// Health check endpoint
app.get('/', (c) => {
  return c.json<ApiResponse<string>>({
    success: true,
    data: 'TrackMUN API is running',
  });
});

// Auth routes
app.route('/auth', authRouter);

// Protected route example - get current user
app.get('/me', async (c) => {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Missing or invalid authorization header',
      code: 'MISSING_AUTH',
    }, 401);
  }

  // TODO: Implement JWT verification here
  // For now, return placeholder
  return c.json<ApiResponse<null>>({
    success: false,
    error: 'Authentication not yet implemented',
    code: 'UNAUTHORIZED',
  }, 401);
});

export default app;
