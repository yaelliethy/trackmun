import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { Bindings } from '../../types/env';
import { AuthContext, withAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { UserSchema, CreateUserSchema, UpdateUserSchema } from '@trackmun/shared';
import { AdminController } from '../../controllers/admin/base.controller';

const routes = new OpenAPIHono<{ Bindings: Bindings; Variables: AuthContext }>();

// All routes require authentication and admin role
routes.use('*', withAuth, requireRole('admin'));

const controller = new AdminController('admin');

routes.openapi(
  createRoute({
    method: 'get',
    path: '/',
    request: {
      query: z.object({
        page: z.string().optional(),
        limit: z.string().optional(),
        search: z.string().optional(),
      }),
    },
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
        description: 'List admins',
      },
    },
    summary: 'List admin users',
  }),
  controller.listUsers
);

routes.openapi(
  createRoute({
    method: 'post',
    path: '/',
    request: {
      body: {
        content: { 'application/json': { schema: CreateUserSchema } },
      },
    },
    responses: {
      201: {
        content: {
          'application/json': {
            schema: z.object({
              success: z.literal(true),
              data: UserSchema,
            }),
          },
        },
        description: 'Create admin',
      },
      400: {
        content: {
          'application/json': {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
        description: 'Creation failed',
      },
    },
    summary: 'Create admin member',
  }),
  controller.createUser
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
        description: 'Update admin',
      },
      404: {
        content: {
          'application/json': {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
        description: 'Admin not found',
      },
    },
    summary: 'Update admin member',
  }),
  controller.updateUser
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
        description: 'Delete admin',
      },
      400: {
        content: {
          'application/json': {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
        description: 'Deletion failed',
      },
    },
    summary: 'Delete admin member',
  }),
  controller.deleteUser
);

export default routes;
