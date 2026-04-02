import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { Bindings } from '../../types/env';
import { AdminSetupController } from '../../controllers/admin/setup.controller';

const setup = new OpenAPIHono<{ Bindings: Bindings }>();
const controller = new AdminSetupController();

// Simple GET endpoint for initial setup with hardcoded credentials
// This is only accessible if the database is empty.
setup.openapi(
  createRoute({
    method: 'get',
    path: '/init',
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.object({
              success: z.boolean(),
              data: z.object({
                message: z.string(),
                id: z.string(),
                email: z.string(),
                note: z.string(),
              }),
            }),
          },
        },
        description: 'Admin user created successfully',
      },
      400: {
        description: 'Database not empty',
      },
    },
    summary: 'Initialize platform with hardcoded first admin user',
  }),
  async (c) => {
    return controller.init(c);
  }
);

// POST endpoint to reset and recreate the default admin user
// This deletes any existing admin@trackmun.app user and creates a fresh one.
setup.openapi(
  createRoute({
    method: 'post',
    path: '/reset-init',
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.object({
              success: z.boolean(),
              data: z.object({
                message: z.string(),
                id: z.string(),
                email: z.string(),
                note: z.string(),
              }),
            }),
          },
        },
        description: 'Admin user reset and created successfully',
      },
      500: {
        description: 'Failed to reset admin user',
      },
    },
    summary: 'Reset and reinitialize the default admin user',
  }),
  async (c) => {
    return controller.resetInit(c);
  }
);

export default setup;
