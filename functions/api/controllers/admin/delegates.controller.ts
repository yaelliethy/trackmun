import { AdminController } from './base.controller';
import { Context } from 'hono';
import { Bindings } from '../../types/env';
import { AuthContext } from '../../middleware/auth';
import { getDb } from '../../db/client';
import { AdminService } from '../../services/admin';

class DelegateAdminController extends AdminController {
  constructor() {
    super('delegate');
  }

  updatePayment = async (c: Context<{ Bindings: Bindings; Variables: AuthContext }>) => {
    const id = c.req.param('id') || '';
    const body = await c.req.json();
    const service = new AdminService(getDb());
    const result = await service.updateDelegatePaymentProfile(id, {
      depositPaymentStatus: body.depositPaymentStatus,
      fullPaymentStatus: body.fullPaymentStatus,
    });
    if (result === 'not_found') {
      return c.json({ success: false as const, error: 'Delegate profile not found' }, 404);
    }
    return c.json({ success: true as const, data: null }, 200);
  };
}

export const delegatesController = new DelegateAdminController();
