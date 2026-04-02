import { Context } from 'hono';
import { OcService } from '../../services/oc/oc.service';
import { Bindings } from '../../types/env';
import { AuthContext } from '../../middleware/auth';
import { getDb } from '../../db/client';

type OcContext = Context<{ Bindings: Bindings; Variables: AuthContext }>;

export class OcController {
  private getService() {
    return new OcService(getDb());
  }

  getActivePeriod = async (c: OcContext) => {
    const service = this.getService();
    const period = await service.getActivePeriod();
    return c.json({ success: true as const, data: period }, 200);
  };

  recordAttendance = async (c: OcContext) => {
    const oc = c.get('user');
    const body = await c.req.json();
    const { delegateId, periodId, sessionLabel } = body as {
      delegateId: string;
      periodId: string;
      sessionLabel: string;
    };

    if (!delegateId || !periodId || !sessionLabel) {
      return c.json(
        { success: false as const, error: 'delegateId, periodId and sessionLabel are required', code: 'INVALID_INPUT' },
        400
      );
    }

    const service = this.getService();
    const result = await service.recordAttendance(delegateId, periodId, sessionLabel, oc.id);
    return c.json({ success: true as const, data: result }, 200);
  };

  listBenefits = async (c: OcContext) => {
    const db = getDb();
    const { benefits } = await import('../../db/schema');
    const rows = await db.select().from(benefits).all();
    return c.json({ success: true as const, data: rows }, 200);
  };

  getBenefitStatus = async (c: OcContext) => {
    const delegateId = c.req.param('delegateId') ?? '';
    const service = this.getService();
    const result = await service.getBenefitsWithStatus(delegateId);
    return c.json({ success: true as const, data: result }, 200);
  };

  redeemBenefit = async (c: OcContext) => {
    const oc = c.get('user');
    const body = await c.req.json();
    const { delegateId, benefitId } = body as { delegateId: string; benefitId: string };

    if (!delegateId || !benefitId) {
      return c.json(
        { success: false as const, error: 'delegateId and benefitId are required', code: 'INVALID_INPUT' },
        400
      );
    }

    const service = this.getService();
    const result = await service.redeemBenefit(delegateId, benefitId, oc.id);
    return c.json({ success: true as const, data: result }, 200);
  };

  searchDelegates = async (c: OcContext) => {
    const q = c.req.query('q') ?? '';
    if (q.trim().length < 1) {
      return c.json({ success: true as const, data: [] }, 200);
    }
    const service = this.getService();
    const results = await service.searchDelegates(q.trim());
    return c.json({ success: true as const, data: results }, 200);
  };
}

export const ocController = new OcController();
