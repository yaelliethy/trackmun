import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { Bindings } from '../../types/env';
import { AuthContext, withAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { UserSchema, UpdateUserSchema } from '@trackmun/shared';
import { ocController } from '../../controllers/admin/oc.controller';

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
              data: z.object({
                users: z.array(UserSchema),
                total: z.number(),
              }),
            }),
          },
        },
        description: 'List OC members',
      },
    },
    summary: 'List OC members',
  }),
  ocController.listUsers
);

routes.openapi(
  createRoute({
    method: 'patch',
    path: '/{id}',
    request: {
      params: z.object({ id: z.string() }),
      body: {
        content: { 'application/json': { schema: UpdateUserSchema } },
      },
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.object({
              success: z.literal(true),
              data: UserSchema,
            }),
          },
        },
        description: 'Update OC member',
      },
      404: {
        content: {
          'application/json': {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
        description: 'OC member not found',
      },
    },
    summary: 'Update OC member',
  }),
  ocController.updateUser
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
        description: 'Delete OC member',
      },
      400: {
        content: {
          'application/json': {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
        description: 'Delete failed',
      },
    },
    summary: 'Delete OC member',
  }),
  ocController.deleteUser
);

export default routes;
