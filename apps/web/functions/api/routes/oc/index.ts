import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { Bindings } from '../../types/env';
import { AuthContext, withAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import {
  ActiveAttendancePeriodSchema,
  DelegateSearchResultSchema,
  BenefitWithStatusSchema,
  AttendanceResultSchema,
  BenefitRedeemResultSchema,
} from '@trackmun/shared';
import { ocController } from '../../controllers/oc/oc.controller';

const routes = new OpenAPIHono<{ Bindings: Bindings; Variables: AuthContext }>();

routes.use('*', withAuth, requireRole('oc', 'admin'));

// GET /oc/attendance/active
routes.openapi(
  createRoute({
    method: 'get',
    path: '/attendance/active',
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.object({
              success: z.literal(true),
              data: ActiveAttendancePeriodSchema.nullable(),
            }),
          },
        },
        description: 'Get currently active attendance period',
      },
    },
    summary: 'Get active attendance period',
  }),
  ocController.getActivePeriod
);

// POST /oc/attendance/record
routes.openapi(
  createRoute({
    method: 'post',
    path: '/attendance/record',
    request: {
      body: {
        content: {
          'application/json': {
            schema: z.object({
              delegateId: z.string(),
              periodId: z.string(),
              sessionLabel: z.string(),
            }),
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
              data: AttendanceResultSchema,
            }),
          },
        },
        description: 'Record attendance',
      },
      400: {
        content: {
          'application/json': {
            schema: z.object({ success: z.literal(false), error: z.string(), code: z.string() }),
          },
        },
        description: 'Invalid input',
      },
    },
    summary: 'Record delegate attendance',
  }),
  ocController.recordAttendance
);

// GET /oc/benefits
routes.openapi(
  createRoute({
    method: 'get',
    path: '/benefits',
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.object({
              success: z.literal(true),
              data: z.array(z.object({ id: z.string(), name: z.string() })),
            }),
          },
        },
        description: 'List all benefits',
      },
    },
    summary: 'List benefits',
  }),
  ocController.listBenefits
);

// GET /oc/benefits/status/:delegateId
routes.openapi(
  createRoute({
    method: 'get',
    path: '/benefits/status/{delegateId}',
    request: {
      params: z.object({ delegateId: z.string() }),
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.object({
              success: z.literal(true),
              data: z.array(BenefitWithStatusSchema),
            }),
          },
        },
        description: 'Get benefit status for a delegate',
      },
    },
    summary: 'Get delegate benefit status',
  }),
  ocController.getBenefitStatus
);

// POST /oc/benefits/redeem
routes.openapi(
  createRoute({
    method: 'post',
    path: '/benefits/redeem',
    request: {
      body: {
        content: {
          'application/json': {
            schema: z.object({
              delegateId: z.string(),
              benefitId: z.string(),
            }),
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
              data: BenefitRedeemResultSchema,
            }),
          },
        },
        description: 'Redeem a benefit for a delegate',
      },
      400: {
        content: {
          'application/json': {
            schema: z.object({ success: z.literal(false), error: z.string(), code: z.string() }),
          },
        },
        description: 'Invalid input',
      },
    },
    summary: 'Redeem benefit',
  }),
  ocController.redeemBenefit
);

// GET /oc/delegates/search?q=
routes.openapi(
  createRoute({
    method: 'get',
    path: '/delegates/search',
    request: {
      query: z.object({ q: z.string().optional() }),
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.object({
              success: z.literal(true),
              data: z.array(DelegateSearchResultSchema),
            }),
          },
        },
        description: 'Search delegates by name, email, or identifier',
      },
    },
    summary: 'Search delegates',
  }),
  ocController.searchDelegates
);

export default routes;
