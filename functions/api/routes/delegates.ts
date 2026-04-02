import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { Bindings } from '../types/env';
import { AuthContext, withAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { delegateController } from '../controllers/delegates/delegate.controller';

const delegates = new OpenAPIHono<{ Bindings: Bindings; Variables: AuthContext }>();

delegates.use('*', withAuth);

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
                council: z.string().nullable(),
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
  delegateController.getProfile
);

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
              data: z.array(
                z.object({
                  id: z.string(),
                  sessionLabel: z.string(),
                  scannedAt: z.number(),
                  attended: z.boolean(),
                })
              ),
            }),
          },
        },
        description: 'Attendance records retrieved successfully',
      },
    },
    summary: 'Get delegate attendance records',
  }),
  delegateController.listAttendance
);

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
              data: z.array(
                z.object({
                  id: z.string(),
                  benefitType: z.string(),
                  name: z.string(),
                  redeemedAt: z.number(),
                })
              ),
            }),
          },
        },
        description: 'Benefits retrieved successfully',
      },
    },
    summary: 'Get delegate benefits',
  }),
  delegateController.listBenefits
);

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
              data: z.array(
                z.object({
                  id: z.string(),
                  awardType: z.string(),
                  council: z.string(),
                  givenAt: z.number(),
                  notes: z.string().nullable(),
                })
              ),
            }),
          },
        },
        description: 'Awards retrieved successfully',
      },
    },
    summary: 'Get delegate awards',
  }),
  delegateController.listAwards
);

export default delegates;
