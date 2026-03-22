import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { ApiResponse } from '@trackmun/shared';

type Bindings = {
  DB: D1Database;
  MEDIA: R2Bucket;
  JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors());

app.get('/', (c) => {
  return c.json<ApiResponse<string>>({
    success: true,
    data: 'TrackMUN API is running',
  });
});

app.get('/me', (c) => {
  // Placeholder for auth middleware
  return c.json<ApiResponse<null>>({
    success: false,
    error: 'Unauthorized',
    code: 'UNAUTHORIZED',
  }, 401);
});

export default app;
