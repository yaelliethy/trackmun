import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { Bindings } from '../../types/env';
import { AuthContext, withAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { UserSchema, UpdateUserSchema } from '@trackmun/shared';
import { chairsController } from '../../controllers/admin/chairs.controller';

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
        description: 'List chairs',
      },
    },
    summary: 'List chairs',
  }),
  chairsController.listUsers
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
        description: 'Update chair',
      },
      404: {
        content: {
          'application/json': {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
        description: 'Chair not found',
      },
    },
    summary: 'Update chair',
  }),
  chairsController.updateUser
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
        description: 'Delete chair',
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
    summary: 'Delete chair',
  }),
  chairsController.deleteUser
);

export default routes;
