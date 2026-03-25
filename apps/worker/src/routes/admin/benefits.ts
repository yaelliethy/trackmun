import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { Bindings } from '../../types/env';
import { AuthContext, withAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { BenefitSchema } from '@trackmun/shared';
import { benefitsController } from '../../controllers/admin/benefits.controller';

const routes = new OpenAPIHono<{ Bindings: Bindings; Variables: AuthContext }>();

routes.use('*', withAuth, requireRole('admin'));

routes.openapi(
  createRoute({
    method: 'get',
    path: '/',
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.object({
              success: z.literal(true),
              data: z.array(BenefitSchema),
            }),
          },
        },
        description: 'List benefits',
      },
    },
    summary: 'List benefits',
  }),
  benefitsController.listBenefits
);

routes.openapi(
  createRoute({
    method: 'post',
    path: '/',
    request: {
      body: {
        content: { 'application/json': { schema: z.object({ name: z.string().min(1) }) } },
      },
    },
    responses: {
      201: {
        content: {
          'application/json': {
            schema: z.object({
              success: z.literal(true),
              data: BenefitSchema,
            }),
          },
        },
        description: 'Create benefit',
      },
    },
    summary: 'Create benefit',
  }),
  benefitsController.createBenefit
);

routes.openapi(
  createRoute({
    method: 'delete',
    path: '/{id}',
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.object({
              success: z.literal(true),
              data: z.null(),
            }),
          },
        },
        description: 'Delete benefit',
      },
    },
    summary: 'Delete benefit',
  }),
  benefitsController.deleteBenefit
);

export default routes;
