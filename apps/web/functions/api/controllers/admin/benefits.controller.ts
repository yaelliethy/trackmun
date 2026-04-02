import { Context } from 'hono';
import { BenefitsService } from '../../services/admin/benefits.service';
import { Bindings } from '../../types/env';
import { AuthContext } from '../../middleware/auth';
import { getDb } from '../../db/client';

type AdminContext = Context<{ Bindings: Bindings; Variables: AuthContext }>;

export class BenefitsController {
  private getService() {
    return new BenefitsService(getDb());
  }

  listBenefits = async (c: AdminContext) => {
    const service = this.getService();
    const result = await service.listBenefits();
    return c.json({ success: true as const, data: result }, 200);
  };

  createBenefit = async (c: AdminContext) => {
    const body = await c.req.json();
    const service = this.getService();
    
    // Simplistic input validation inline since it's already zod-validated via OpenAPI
    const benefit = await service.createBenefit(body.name);

    return c.json({ success: true as const, data: benefit }, 201);
  };

  deleteBenefit = async (c: AdminContext) => {
    const id = c.req.param('id') ?? '';
    const service = this.getService();
    
    await service.deleteBenefit(id);
    return c.json({ success: true as const, data: null }, 200);
  };
}

export const benefitsController = new BenefitsController();
