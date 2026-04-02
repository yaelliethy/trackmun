import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { Bindings } from '../../types/env';
import { AuthContext, withAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { CouncilSchema } from '@trackmun/shared';
import { councilsController } from '../../controllers/admin/councils.controller';

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
              data: z.array(CouncilSchema),
            }),
          },
        },
        description: 'List councils',
      },
    },
    summary: 'List councils',
  }),
  councilsController.list
);

routes.openapi(
  createRoute({
    method: 'post',
    path: '/',
    request: {
      body: {
        content: {
          'application/json': { schema: z.object({ name: z.string().min(1), shortName: z.string().optional(), capacity: z.number().optional() }) },
        },
      },
    },
    responses: {
      201: {
        content: {
          'application/json': {
            schema: z.object({ success: z.literal(true), data: CouncilSchema }),
          },
        },
        description: 'Created',
      },
    },
    summary: 'Create council',
  }),
  councilsController.create as any
);

routes.openapi(
  createRoute({
    method: 'put',
    path: '/{id}',
    request: {
      params: z.object({ id: z.string() }),
      body: {
        content: {
          'application/json': { schema: z.object({ name: z.string().min(1), shortName: z.string().optional(), capacity: z.number().optional() }) },
        },
      },
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.object({ success: z.literal(true), data: CouncilSchema }),
          },
        },
        description: 'Updated',
      },
    },
    summary: 'Update council',
  }),
  councilsController.update as any
);

routes.openapi(
  createRoute({
    method: 'delete',
    path: '/{id}',
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.object({ success: z.literal(true), data: z.null() }),
          },
        },
        description: 'Deleted',
      },
    },
    summary: 'Delete council',
  }),
  councilsController.delete as any
);

export default routes;
