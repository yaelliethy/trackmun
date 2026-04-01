import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { Bindings } from '../types/env';
import { AuthContext, withAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { getDb } from '../db/client';
import { delegateProfiles, users, attendanceRecords, benefitRedemptions, awards, benefits as benefitsTable } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

const delegates = new OpenAPIHono<{ Bindings: Bindings; Variables: AuthContext }>();

// Apply auth middleware to ALL routes (including /profile)
delegates.use('*', withAuth);

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
        council: user.council,
        pressAgency: profile.pressAgency,
        firstChoice: profile.firstChoice,
        secondChoice: profile.secondChoice,
        depositPaymentStatus: (profile.depositPaymentStatus as 'pending' | 'paid') || 'pending',
        fullPaymentStatus: (profile.fullPaymentStatus as 'pending' | 'paid') || 'pending',
        depositAmount: profile.depositAmount,
        fullAmount: profile.fullAmount,
        paymentProofR2Key: profile.paymentProofR2Key,
      },
    });
  }
);

// Get delegate's attendance records
delegates.openapi(
  createRoute({
    method: 'get',
    path: '/attendance',
    middleware: [requireRole('delegate')] as const,
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.object({
              success: z.boolean(),
              data: z.array(z.object({
                id: z.string(),
                sessionLabel: z.string(),
                scannedAt: z.number(),
                attended: z.boolean(),
              })),
            }),
          },
        },
        description: 'Attendance records retrieved successfully',
      },
    },
    summary: 'Get delegate attendance records',
  }),
  async (c) => {
    const db = getDb();
    const user = c.get('user');

    const records = await db
      .select()
      .from(attendanceRecords)
      .where(eq(attendanceRecords.userId, user.id))
      .orderBy(desc(attendanceRecords.scannedAt))
      .all();

    return c.json({
      success: true,
      data: records.map((r) => ({
        id: r.id,
        sessionLabel: r.sessionLabel || 'General Session',
        scannedAt: r.scannedAt,
        attended: true,
      })),
    });
  }
);

// Get delegate's benefits
delegates.openapi(
  createRoute({
    method: 'get',
    path: '/benefits',
    middleware: [requireRole('delegate')] as const,
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.object({
              success: z.boolean(),
              data: z.array(z.object({
                id: z.string(),
                benefitType: z.string(),
                name: z.string(),
                redeemedAt: z.number(),
              })),
            }),
          },
        },
        description: 'Benefits retrieved successfully',
      },
    },
    summary: 'Get delegate benefits',
  }),
  async (c) => {
    const db = getDb();
    const user = c.get('user');

    const result = await db
      .select({
        id: benefitRedemptions.id,
        benefitType: benefitRedemptions.benefitType,
        redeemedAt: benefitRedemptions.redeemedAt,
        name: benefitsTable.name,
      })
      .from(benefitRedemptions)
      .innerJoin(benefitsTable, eq(benefitRedemptions.benefitType, benefitsTable.id))
      .where(eq(benefitRedemptions.userId, user.id))
      .orderBy(desc(benefitRedemptions.redeemedAt))
      .all();

    return c.json({
      success: true,
      data: result,
    });
  }
);

// Get delegate's awards
delegates.openapi(
  createRoute({
    method: 'get',
    path: '/awards',
    middleware: [requireRole('delegate')] as const,
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.object({
              success: z.boolean(),
              data: z.array(z.object({
                id: z.string(),
                awardType: z.string(),
                council: z.string(),
                givenAt: z.number(),
                notes: z.string().nullable(),
              })),
            }),
          },
        },
        description: 'Awards retrieved successfully',
      },
    },
    summary: 'Get delegate awards',
  }),
  async (c) => {
    const db = getDb();
    const user = c.get('user');

    const userAwards = await db
      .select()
      .from(awards)
      .where(eq(awards.userId, user.id))
      .orderBy(desc(awards.givenAt))
      .all();

    return c.json({
      success: true,
      data: userAwards.map((a) => ({
        id: a.id,
        awardType: a.awardType,
        council: a.council,
        givenAt: a.givenAt,
        notes: a.notes,
      })),
    });
  }
);

export default delegates;
