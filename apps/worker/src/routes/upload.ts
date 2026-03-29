import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { Bindings } from '../types/env';
import { AuthContext, withAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { GetPresignedUrlRequestSchema, ConfirmPaymentProofSchema } from '@trackmun/shared';
import { uploadController } from '../controllers/upload.controller';

const routes = new OpenAPIHono<{ Bindings: Bindings; Variables: AuthContext }>();

// Only authenticated delegates can upload their payment proofs
routes.use('*', withAuth, requireRole('delegate', 'oc', 'chair', 'admin'));

routes.openapi(createRoute({
  method: 'post',
  path: '/payment-proof-url',
  request: {
    body: { content: { 'application/json': { schema: GetPresignedUrlRequestSchema } } }
  },
  responses: {
    200: {
      description: 'Get presigned URL',
      content: { 'application/json': { schema: z.object({ success: z.literal(true), data: z.object({ uploadUrl: z.string(), key: z.string() }) }) } }
    },
    400: {
      description: 'Bad request',
      content: { 'application/json': { schema: z.object({ success: z.literal(false), error: z.string() }) } }
    }
  }
}), uploadController.getPresignedUrl);

routes.openapi(createRoute({
  method: 'post',
  path: '/confirm-payment-proof',
  request: {
    body: { content: { 'application/json': { schema: ConfirmPaymentProofSchema } } }
  },
  responses: {
    200: {
      description: 'Confirm file is uploaded to R2',
      content: { 'application/json': { schema: z.object({ success: z.literal(true), data: z.null() }) } }
    },
    400: {
      description: 'Bad request',
      content: { 'application/json': { schema: z.object({ success: z.literal(false), error: z.string() }) } }
    }
  }
}), uploadController.confirmPaymentProof);

export default routes;
