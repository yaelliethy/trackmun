import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { Bindings } from '../types/env';
import { AuthContext, withAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { getDb } from '../db/client';
import { delegateProfiles, users } from '../db/schema';
import { eq } from 'drizzle-orm';

const delegates = new OpenAPIHono<{ Bindings: Bindings; Variables: AuthContext }>();

// Auth only for delegate profile — do not use '*' here: this app is mounted at /delegates and
// would otherwise require a token for unrelated paths like /delegates/setup/* on the main app.
delegates.use('/profile', withAuth);

// Get current delegate's profile with payment status
delegates.openapi(
  createRoute({
    method: 'get',
    path: '/profile',
    middleware: [requireRole('delegate')] as const,
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.object({
              success: z.boolean(),
              data: z.object({
                userId: z.string(),
                email: z.string(),
                name: z.string(),
                country: z.string().nullable(),
                pressAgency: z.string().nullable(),
                firstChoice: z.string().nullable(),
                secondChoice: z.string().nullable(),
                depositPaymentStatus: z.enum(['pending', 'paid']),
                fullPaymentStatus: z.enum(['pending', 'paid']),
                depositAmount: z.number().nullable(),
                fullAmount: z.number().nullable(),
                paymentProofR2Key: z.string().nullable(),
              }),
            }),
          },
        },
        description: 'Delegate profile retrieved successfully',
      },
      403: {
        description: 'User is not a delegate',
      },
      404: {
        description: 'Delegate profile not found',
      },
    },
    summary: 'Get current delegate profile with payment status',
  }),
  async (c) => {
    const db = getDb();
    const user = c.get('user');

    // Fetch delegate profile
    const profile = await db
      .select()
      .from(delegateProfiles)
      .where(eq(delegateProfiles.userId, user.id))
      .get();

    if (!profile) {
      return c.json({ success: false, error: 'Delegate profile not found' }, 404);
    }

    return c.json({
      success: true,
      data: {
        userId: user.id,
        email: user.email,
        name: user.name,
        country: profile.country,
        pressAgency: profile.pressAgency,
        firstChoice: profile.firstChoice,
        secondChoice: profile.secondChoice,
        depositPaymentStatus: profile.depositPaymentStatus as 'pending' | 'paid',
        fullPaymentStatus: profile.fullPaymentStatus as 'pending' | 'paid',
        depositAmount: profile.depositAmount,
        fullAmount: profile.fullAmount,
        paymentProofR2Key: profile.paymentProofR2Key,
      },
    });
  }
);

export default delegates;
