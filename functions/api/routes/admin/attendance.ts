import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { Bindings } from '../../types/env';
import { AuthContext, withAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { ConferenceDaySchema, AttendancePeriodSchema } from '@trackmun/shared';
import { attendanceController } from '../../controllers/admin/attendance.controller';

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
              data: z.array(ConferenceDaySchema),
            }),
          },
        },
        description: 'List conference days',
      },
    },
    summary: 'List conference days',
  }),
  attendanceController.listDays
);

routes.openapi(
  createRoute({
    method: 'post',
    path: '/',
    request: {
      body: {
        content: { 'application/json': { schema: z.object({ name: z.string().min(1), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)') }) } },
      },
    },
    responses: {
      201: {
        content: {
          'application/json': {
            schema: z.object({
              success: z.literal(true),
              data: ConferenceDaySchema,
            }),
          },
        },
        description: 'Create day',
      },
    },
    summary: 'Create conference day',
  }),
  attendanceController.createDay as any
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
        description: 'Delete day',
      },
    },
    summary: 'Delete conference day',
  }),
  attendanceController.deleteDay
);

routes.openapi(
  createRoute({
    method: 'put',
    path: '/{id}/periods',
    request: {
      params: z.object({ id: z.string() }),
      body: {
        content: {
          'application/json': {
            schema: z.object({
              periods: z.array(
                z.object({
                  startTime: z.string(),
                  endTime: z.string(),
                })
              ),
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
              data: z.array(AttendancePeriodSchema),
            }),
          },
        },
        description: 'Replace periods',
      },
    },
    summary: 'Replace attendance periods',
  }),
  attendanceController.replacePeriods as any
);

export default routes;
