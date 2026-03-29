import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { Bindings } from '../../types/env';
import { AuthContext, withAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { RegistrationStepSchema, RegistrationQuestionSchema, SettingsSchema } from '@trackmun/shared';
import { registrationController } from '../../controllers/admin/registration.controller';

const routes = new OpenAPIHono<{ Bindings: Bindings; Variables: AuthContext }>();

routes.use('*', withAuth, requireRole('admin'));

// Settings
routes.openapi(createRoute({
  method: 'get', path: '/settings', responses: { 200: { description: 'Get settings', content: { 'application/json': { schema: z.object({ success: z.literal(true), data: SettingsSchema }) } } } }
}), registrationController.getSettings);

routes.openapi(createRoute({
  method: 'put', path: '/settings', request: { body: { content: { 'application/json': { schema: SettingsSchema } } } }, responses: { 200: { description: 'Update settings', content: { 'application/json': { schema: z.object({ success: z.literal(true), data: SettingsSchema }) } } } }
}), registrationController.updateSettings);

// Steps
routes.openapi(createRoute({
  method: 'get', path: '/steps', responses: { 200: { description: 'List steps', content: { 'application/json': { schema: z.object({ success: z.literal(true), data: z.array(RegistrationStepSchema) }) } } } }
}), registrationController.listSteps);

routes.openapi(createRoute({
  method: 'post', path: '/steps', request: { body: { content: { 'application/json': { schema: z.object({ title: z.string().min(1), description: z.string().optional().nullable(), order: z.number().int() }) } } } }, responses: { 201: { description: 'Create step', content: { 'application/json': { schema: z.object({ success: z.literal(true), data: RegistrationStepSchema }) } } } }
}), registrationController.createStep);

routes.openapi(createRoute({
  method: 'put', path: '/steps/{id}', request: { params: z.object({ id: z.string() }), body: { content: { 'application/json': { schema: z.object({ title: z.string().optional(), description: z.string().optional().nullable(), order: z.number().int().optional() }) } } } }, responses: { 200: { description: 'Update step', content: { 'application/json': { schema: z.object({ success: z.literal(true), data: z.null() }) } } } }
}), registrationController.updateStep);

routes.openapi(createRoute({
  method: 'delete', path: '/steps/{id}', request: { params: z.object({ id: z.string() }) }, responses: { 200: { description: 'Delete step', content: { 'application/json': { schema: z.object({ success: z.literal(true), data: z.null() }) } } } }
}), registrationController.deleteStep);

// Questions
routes.openapi(createRoute({
  method: 'get', path: '/questions', responses: { 200: { description: 'List questions', content: { 'application/json': { schema: z.object({ success: z.literal(true), data: z.array(RegistrationQuestionSchema) }) } } } }
}), registrationController.listQuestions);

routes.openapi(createRoute({
  method: 'post', path: '/questions', request: { body: { content: { 'application/json': { schema: z.object({ stepId: z.string(), label: z.string().min(1), type: z.enum(['text', 'long_text', 'choices', 'dropdown', 'council_preference']), options: z.string().optional().nullable(), required: z.boolean(), displayOrder: z.number(), councilPreferenceCount: z.number().int().min(1).optional() }) } } } }, responses: { 201: { description: 'Create question', content: { 'application/json': { schema: z.object({ success: z.literal(true), data: RegistrationQuestionSchema }) } } } }
}), registrationController.createQuestion);

routes.openapi(createRoute({
  method: 'put', path: '/questions/{id}', request: { params: z.object({ id: z.string() }), body: { content: { 'application/json': { schema: z.object({ label: z.string().optional(), type: z.enum(['text', 'long_text', 'choices', 'dropdown', 'council_preference']).optional(), options: z.string().optional().nullable(), required: z.boolean().optional(), displayOrder: z.number().optional(), councilPreferenceCount: z.number().int().min(1).optional() }) } } } }, responses: { 200: { description: 'Update question', content: { 'application/json': { schema: z.object({ success: z.literal(true), data: z.null() }) } } } }
}), registrationController.updateQuestion);

routes.openapi(createRoute({
  method: 'delete', path: '/questions/{id}', request: { params: z.object({ id: z.string() }) }, responses: { 200: { description: 'Delete question', content: { 'application/json': { schema: z.object({ success: z.literal(true), data: z.null() }) } } } }
}), registrationController.deleteQuestion);

export default routes;
