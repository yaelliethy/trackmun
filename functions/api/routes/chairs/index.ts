import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { Bindings } from '../../types/env';
import { AuthContext, withAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { chairsController } from '../../controllers/chairs/chairs.controller';

const routes = new OpenAPIHono<{ Bindings: Bindings; Variables: AuthContext }>();

// Use authentication and require role
routes.use('*', withAuth, requireRole('chair', 'admin'));

routes.openapi(createRoute({
  method: 'get', path: '/settings', responses: { 200: { description: 'Get settings', content: { 'application/json': { schema: z.object({ success: z.boolean(), data: z.any() }) } } } }
}), chairsController.getSettings);

routes.openapi(createRoute({
  method: 'get', path: '/requests', responses: { 200: { description: '', content: { 'application/json': { schema: z.object({ success: z.boolean(), data: z.any() }) } } } }
}), chairsController.getRequests);

routes.openapi(createRoute({
  method: 'post', path: '/requests/{id}/accept', request: { params: z.object({ id: z.string() }) }, responses: { 200: { description: '', content: { 'application/json': { schema: z.object({ success: z.boolean(), data: z.null() }) } } } }
}), chairsController.acceptDelegate);

routes.openapi(createRoute({
  method: 'post', path: '/requests/{id}/defer', request: { params: z.object({ id: z.string() }) }, responses: { 200: { description: '', content: { 'application/json': { schema: z.object({ success: z.boolean(), data: z.null() }) } } } }
}), chairsController.deferDelegate);

routes.openapi(createRoute({
  method: 'post', path: '/requests/{id}/reject', request: { params: z.object({ id: z.string() }) }, responses: { 200: { description: '', content: { 'application/json': { schema: z.object({ success: z.boolean(), data: z.null() }) } } } }
}), chairsController.rejectDelegate);

routes.openapi(createRoute({
  method: 'get', path: '/delegates', responses: { 200: { description: '', content: { 'application/json': { schema: z.object({ success: z.boolean(), data: z.any() }) } } } }
}), chairsController.getAssignedDelegates);

routes.openapi(createRoute({
  method: 'put', path: '/delegates/{id}/country', request: { params: z.object({ id: z.string() }), body: { content: { 'application/json': { schema: z.object({ country: z.string() }) } } } }, responses: { 200: { description: '', content: { 'application/json': { schema: z.object({ success: z.boolean(), data: z.null() }) } } } }
}), chairsController.assignCountry);

routes.openapi(createRoute({
  method: 'post', path: '/delegates/{id}/awards', request: { params: z.object({ id: z.string() }), body: { content: { 'application/json': { schema: z.object({ awardType: z.string(), notes: z.string().nullable() }) } } } }, responses: { 200: { description: '', content: { 'application/json': { schema: z.object({ success: z.boolean(), data: z.null() }) } } } }
}), chairsController.addAward);

routes.openapi(createRoute({
  method: 'delete', path: '/delegates/{id}/awards', request: { params: z.object({ id: z.string() }) }, responses: { 200: { description: '', content: { 'application/json': { schema: z.object({ success: z.boolean(), data: z.null() }) } } } }
}), chairsController.removeAward);

routes.openapi(createRoute({
  method: 'delete', path: '/delegates/{id}', request: { params: z.object({ id: z.string() }) }, responses: { 200: { description: '', content: { 'application/json': { schema: z.object({ success: z.boolean(), data: z.null() }) } } } }
}), chairsController.removeDelegate);

routes.openapi(createRoute({
  method: 'get', path: '/attendance/active', responses: { 200: { description: '', content: { 'application/json': { schema: z.object({ success: z.boolean(), data: z.any() }) } } } }
}), chairsController.getActivePeriod);

routes.openapi(createRoute({
  method: 'post', path: '/attendance/record', request: { body: { content: { 'application/json': { schema: z.object({ delegateId: z.string(), periodId: z.string(), sessionLabel: z.string() }) } } } }, responses: { 200: { description: '', content: { 'application/json': { schema: z.object({ success: z.boolean(), data: z.any() }) } } } }
}), chairsController.recordAttendance as any);

routes.openapi(createRoute({
  method: 'get', path: '/delegates/search', responses: { 200: { description: '', content: { 'application/json': { schema: z.object({ success: z.boolean(), data: z.any() }) } } } }
}), chairsController.searchDelegates);

routes.openapi(createRoute({
  method: 'get', path: '/delegates/{id}/responses', request: { params: z.object({ id: z.string() }) }, responses: { 200: { description: '', content: { 'application/json': { schema: z.object({ success: z.boolean(), data: z.any() }) } } }, 404: { description: 'Not found', content: { 'application/json': { schema: z.object({ success: z.boolean(), error: z.string() }) } } } }
}), chairsController.getResponse);

export default routes;
