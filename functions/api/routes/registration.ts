import type { Context } from 'hono';
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { Bindings } from '../types/env';
import type { AuthContext } from '../middleware/auth';
import { registrationController } from '../controllers/admin/registration.controller';
import { getCountriesList } from '@trackmun/shared';

const routes = new OpenAPIHono<{ Bindings: Bindings; Variables: AuthContext }>();

// No auth required for these endpoints as they are used during registration

routes.openapi(createRoute({
  method: 'get', path: '/settings', responses: { 200: { description: 'Get settings', content: { 'application/json': { schema: z.object({ success: z.boolean(), data: z.any() }) } } } }
}), registrationController.getSettings);

routes.openapi(createRoute({
  method: 'get', path: '/steps', responses: { 200: { description: 'Get steps', content: { 'application/json': { schema: z.object({ success: z.boolean(), data: z.any() }) } } } }
}), registrationController.listSteps);

routes.openapi(createRoute({
  method: 'get', path: '/questions', responses: { 200: { description: 'Get questions', content: { 'application/json': { schema: z.object({ success: z.boolean(), data: z.any() }) } } } }
}), registrationController.listQuestions);

routes.openapi(createRoute({
  method: 'get', path: '/councils/full', responses: { 200: { description: 'Get full councils', content: { 'application/json': { schema: z.object({ success: z.boolean(), data: z.any() }) } } } }
}), registrationController.getFullCouncils as any);

routes.openapi(createRoute({
  method: 'post', path: '/payment-proof', request: { body: { content: { 'application/json': { schema: z.object({ filename: z.string(), contentType: z.string(), size: z.number().optional() }) } } } }, responses: { 200: { description: 'Get url', content: { 'application/json': { schema: z.object({ success: z.boolean(), data: z.any() }) } } } }
}), registrationController.getPublicPaymentProofUrl as any);

routes.openapi(createRoute({
  method: 'get', path: '/countries', responses: { 200: { description: 'Get countries', content: { 'application/json': { schema: z.object({ success: z.boolean(), data: z.any() }) } } } }
}), async (c: Context<{ Bindings: Bindings; Variables: AuthContext }>) => {
  return c.json({ success: true, data: getCountriesList() }, 200);
});

export default routes;
