import { Context } from 'hono';
import { Bindings } from '../../types/env';
import { AuthContext } from '../../middleware/auth';
import { getDb } from '../../db/client';
import { DelegateService } from '../../services/delegates/delegate.service';

type DelegateContext = Context<{ Bindings: Bindings; Variables: AuthContext }>;

export class DelegateController {
  private getService() {
    return new DelegateService(getDb());
  }

  getProfile = async (c: DelegateContext) => {
    const user = c.get('user');
    const service = this.getService();
    const data = await service.getProfile(user);
    if (!data) {
      return c.json({ success: false as const, error: 'Delegate profile not found' }, 404);
    }
    return c.json({ success: true as const, data }, 200);
  };

  listAttendance = async (c: DelegateContext) => {
    const user = c.get('user');
    const service = this.getService();
    const data = await service.listAttendance(user.id);
    return c.json({ success: true as const, data }, 200);
  };

  listBenefits = async (c: DelegateContext) => {
    const user = c.get('user');
    const service = this.getService();
    const data = await service.listBenefitRedemptions(user.id);
    return c.json({ success: true as const, data }, 200);
  };

  listAwards = async (c: DelegateContext) => {
    const user = c.get('user');
    const service = this.getService();
    const data = await service.listAwards(user.id);
    return c.json({ success: true as const, data }, 200);
  };
}

export const delegateController = new DelegateController();
