import { Context } from 'hono';
import { Bindings } from '../types/env';
import { AuthContext } from '../middleware/auth';
import { UploadService } from '../services/upload.service';
import { getDb } from '../db/client';

export class UploadController {
  private getService() {
    return new UploadService(getDb());
  }

  getPresignedUrl = async (c: Context<{ Bindings: Bindings; Variables: AuthContext }>) => {
    const body = await c.req.json();
    const user = c.get('user');
    const service = this.getService();

    try {
      const result = await service.generatePresignedUrl(
        c.env,
        user.id,
        body.filename,
        body.contentType
      );
      return c.json({ success: true as const, data: result }, 200);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Upload failed';
      return c.json({ success: false as const, error: message }, 400);
    }
  };

  confirmPaymentProof = async (c: Context<{ Bindings: Bindings; Variables: AuthContext }>) => {
    const body = await c.req.json();
    const user = c.get('user');
    const service = this.getService();

    try {
      await service.confirmPaymentProof(user.id, body.r2Key);
      return c.json({ success: true as const, data: null }, 200);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Confirmation failed';
      return c.json({ success: false as const, error: message }, 400);
    }
  };
}

export const uploadController = new UploadController();
