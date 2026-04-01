import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { Bindings } from '../types/env';
import { RegistrationStepSchema, RegistrationQuestionSchema, SettingsSchema } from '@trackmun/shared';
import { registrationController } from '../controllers/admin/registration.controller';

const routes = new OpenAPIHono<{ Bindings: Bindings }>();

// Re-use controller methods but without auth context, this is fine since those methods don't use 'c.get("user")'
routes.openapi(createRoute({
  method: 'get',
  path: '/settings',
  responses: { 200: { description: 'Get settings', content: { 'application/json': { schema: z.object({ success: z.literal(true), data: SettingsSchema }) } } } }
}), registrationController.getSettings as any);

routes.openapi(createRoute({
  method: 'get',
  path: '/steps',
  responses: { 200: { description: 'Get steps', content: { 'application/json': { schema: z.object({ success: z.literal(true), data: z.array(RegistrationStepSchema) }) } } } }
}), registrationController.listSteps as any);

routes.openapi(createRoute({
  method: 'get',
  path: '/questions',
  responses: { 200: { description: 'Get questions', content: { 'application/json': { schema: z.object({ success: z.literal(true), data: z.array(RegistrationQuestionSchema) }) } } } }
}), registrationController.listQuestions as any);

routes.openapi(createRoute({
  method: 'post',
  path: '/payment-proof-url',
  request: { body: { content: { 'application/json': { schema: z.object({ filename: z.string(), contentType: z.string(), size: z.number() }) } } } },
  responses: { 200: { description: 'Get temp presigned URL', content: { 'application/json': { schema: z.object({ success: z.literal(true), data: z.object({ uploadUrl: z.string(), key: z.string() }) }) } } } }
}), registrationController.getPublicPaymentProofUrl as any);

export default routes;
