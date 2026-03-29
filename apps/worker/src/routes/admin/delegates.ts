import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { Bindings } from '../../types/env';
import { AuthContext, withAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { UserSchema, UpdateUserSchema, UpdateDelegatePaymentSchema } from '@trackmun/shared';
import { delegatesController } from '../../controllers/admin/delegates.controller';

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
        description: 'List delegates',
      },
    },
    summary: 'List delegates',
  }),
  delegatesController.listUsers
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
        description: 'Update delegate',
      },
      404: {
        content: {
          'application/json': {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
        description: 'Delegate not found',
      },
    },
    summary: 'Update delegate',
  }),
  delegatesController.updateUser
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
        description: 'Delete delegate',
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
    summary: 'Delete delegate',
  }),
  delegatesController.deleteUser
);

routes.openapi(
  createRoute({
    method: 'patch',
    path: '/{id}/payments',
    request: {
      params: z.object({ id: z.string() }),
      body: { content: { 'application/json': { schema: UpdateDelegatePaymentSchema } } },
    },
    responses: {
      200: { description: 'Update payment status', content: { 'application/json': { schema: z.object({ success: z.literal(true), data: z.null() }) } } },
      404: { description: 'Delegate not found', content: { 'application/json': { schema: z.object({ success: z.literal(false), error: z.string() }) } } },
    },
    summary: 'Update delegate payment',
  }),
  delegatesController.updatePayment
);

export default routes;
