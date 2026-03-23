import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { verifyFirebaseAuth } from '@hono/firebase-auth';
import { Bindings } from './types/env';
import { AuthContext } from './middleware/auth';
import authRoutes from './routes/auth';
import { ApiResponse } from '@trackmun/shared';

const app = new Hono<{ Bindings: Bindings; Variables: AuthContext }>();

app.use('*', cors());

// Apply Firebase Auth globally
app.use('*', async (c, next) => {
  const middleware = verifyFirebaseAuth({
    projectId: c.env.FIREBASE_PROJECT_ID,
  });
  return middleware(c, next);
});

app.get('/', (c) => {
  return c.json<ApiResponse<string>>({
    success: true,
    data: 'TrackMUN API is running',
  });
});

// Register routes
app.route('/auth', authRoutes);

export default app;
