import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { Bindings } from '../../types/env';
import { SetupController } from '../../controllers/admin/setup.controller';

const setup = new OpenAPIHono<{ Bindings: Bindings }>();
const controller = new SetupController();

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

export default setup;
