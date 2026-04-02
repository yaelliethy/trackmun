import { Context } from 'hono';
import {
  COUNCIL_PREFERENCE_ALREADY_EXISTS,
  RegistrationService,
} from '../../services/admin/registration.service';
import { Bindings } from '../../types/env';
import { AuthContext } from '../../middleware/auth';
import { getDb } from '../../db/client';
import { UploadService } from '../../services/upload.service';

type AdminContext = Context<{ Bindings: Bindings; Variables: AuthContext }>;

export class RegistrationController {
  private getService() {
    return new RegistrationService(getDb());
  }

  getSettings = async (c: AdminContext) => {
    const service = this.getService();
    const result = await service.getSettings();
    return c.json({ success: true as const, data: result }, 200);
  };

  updateSettings = async (c: AdminContext) => {
    const body = await c.req.json();
    const service = this.getService();
    const result = await service.updateSettings(body);
    return c.json({ success: true as const, data: result }, 200);
  };

  listSteps = async (c: AdminContext) => {
    const service = this.getService();
    const result = await service.listSteps();
    return c.json({ success: true as const, data: result }, 200);
  };

  createStep = async (c: AdminContext) => {
    const body = await c.req.json();
    const service = this.getService();
    const result = await service.createStep(body);
    return c.json({ success: true as const, data: result }, 201);
  };

  updateStep = async (c: AdminContext) => {
    const body = await c.req.json();
    const id = c.req.param('id') || '';
    const service = this.getService();
    await service.updateStep(id, body);
    return c.json({ success: true as const, data: null }, 200);
  };

  deleteStep = async (c: AdminContext) => {
    const id = c.req.param('id') || '';
    const service = this.getService();
    await service.deleteStep(id);
    return c.json({ success: true as const, data: null }, 200);
  };

  listQuestions = async (c: AdminContext) => {
    const service = this.getService();
    // Optional query param filter could be added
    const result = await service.listQuestions();
    return c.json({ success: true as const, data: result }, 200);
  };

  createQuestion = async (c: AdminContext) => {
    const body = await c.req.json();
    const service = this.getService();
    try {
      const result = await service.createQuestion(body);
      return c.json({ success: true as const, data: result }, 201);
    } catch (e: unknown) {
      if (e instanceof Error && e.message === COUNCIL_PREFERENCE_ALREADY_EXISTS) {
        return c.json({ success: false as const, error: e.message }, 400);
      }
      throw e;
    }
  };

  updateQuestion = async (c: AdminContext) => {
    const body = await c.req.json();
    const id = c.req.param('id') || '';
    const service = this.getService();
    try {
      await service.updateQuestion(id, body);
      return c.json({ success: true as const, data: null }, 200);
    } catch (e: unknown) {
      if (e instanceof Error && e.message === COUNCIL_PREFERENCE_ALREADY_EXISTS) {
        return c.json({ success: false as const, error: e.message }, 400);
      }
      throw e;
    }
  };

  deleteQuestion = async (c: AdminContext) => {
    const id = c.req.param('id') || '';
    const service = this.getService();
    await service.deleteQuestion(id);
    return c.json({ success: true as const, data: null }, 200);
  };

  getPublicPaymentProofUrl = async (c: Context<{ Bindings: Bindings }>) => {
    const body = await c.req.json();
    const uploadService = new UploadService(getDb());
    const result = await uploadService.generatePublicPresignedUrl(
      c.env,
      body.filename,
      body.contentType
    );
    return c.json({ success: true as const, data: result }, 200);
  };

  getResponses = async (c: AdminContext) => {
    const service = this.getService();
    const result = await service.getResponses();
    return c.json({ success: true as const, data: result }, 200);
  };

  getResponse = async (c: AdminContext) => {
    const userId = c.req.param('userId') || '';
    const service = this.getService();
    const result = await service.getResponse(userId);
    if (!result) return c.json({ success: false as const, error: 'Not found' }, 404);
    return c.json({ success: true as const, data: result }, 200);
  };

  getFullCouncils = async (c: Context<{ Bindings: Bindings }>) => {
    const service = this.getService();
    const result = await service.getFullCouncils();
    return c.json({ success: true as const, data: result }, 200);
  };
}

export const registrationController = new RegistrationController();
