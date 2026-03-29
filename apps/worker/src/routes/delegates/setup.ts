import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { Bindings } from '../../types/env';
import { DelegateSetupController } from '../../controllers/delegates/setup.controller';

const setup = new OpenAPIHono<{ Bindings: Bindings }>();
const controller = new DelegateSetupController();

// Simple GET endpoint for initial delegate setup with hardcoded credentials
// This is only accessible if no delegates exist in the delegate_profiles table.
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
                country: z.string(),
                note: z.string(),
              }),
            }),
          },
        },
        description: 'Delegate user created successfully',
      },
      400: {
        description: 'Delegates already exist',
      },
    },
    summary: 'Initialize platform with hardcoded first delegate user',
  }),
  async (c) => {
    return controller.init(c);
  }
);

// POST endpoint to reset and recreate the default delegate user
// This deletes any existing delegate@trackmun.app user and creates a fresh one.
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
                country: z.string(),
                note: z.string(),
              }),
            }),
          },
        },
        description: 'Delegate user reset and created successfully',
      },
      500: {
        description: 'Failed to reset delegate user',
      },
    },
    summary: 'Reset and reinitialize the default delegate user',
  }),
  async (c) => {
    return controller.resetInit(c);
  }
);

export default setup;
