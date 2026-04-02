import { Context } from 'hono';
import { ChairsService } from '../../services/chairs/chairs.service';
import { Bindings } from '../../types/env';
import { AuthContext } from '../../middleware/auth';
import { getDb } from '../../db/client';

type ChairContext = Context<{ Bindings: Bindings; Variables: AuthContext }>;

export class ChairsController {
  private getService() {
    return new ChairsService(getDb());
  }

  getSettings = async (c: ChairContext) => {
    const result = await this.getService().getSettings();
    return c.json({ success: true as const, data: result }, 200);
  };

  getRequests = async (c: ChairContext) => {
    const user = c.get('user');
    if (!user?.council) return c.json({ success: true as const, data: [] }, 200);
    const result = await this.getService().getRequests(user.council);
    return c.json({ success: true as const, data: result }, 200);
  };

  acceptDelegate = async (c: ChairContext) => {
    const userId = c.req.param('id') || '';
    const user = c.get('user');
    await this.getService().acceptDelegate(userId, user.council!);
    return c.json({ success: true as const, data: null }, 200);
  };

  deferDelegate = async (c: ChairContext) => {
    const userId = c.req.param('id') || '';
    await this.getService().deferDelegate(userId);
    return c.json({ success: true as const, data: null }, 200);
  };

  rejectDelegate = async (c: ChairContext) => {
    const userId = c.req.param('id') || '';
    await this.getService().rejectDelegate(userId);
    return c.json({ success: true as const, data: null }, 200);
  };

  getAssignedDelegates = async (c: ChairContext) => {
    const user = c.get('user');
    if (!user?.council) return c.json({ success: true as const, data: [] }, 200);
    const search = c.req.query('search');
    const country = c.req.query('country');
    const result = await this.getService().getAssignedDelegates(user.council, { search, country });
    return c.json({ success: true as const, data: result }, 200);
  };

  assignCountry = async (c: ChairContext) => {
    const userId = c.req.param('id') || '';
    const body = await c.req.json();
    await this.getService().assignCountry(userId, body.country);
    return c.json({ success: true as const, data: null }, 200);
  };

  addAward = async (c: ChairContext) => {
    const userId = c.req.param('id') || '';
    const user = c.get('user');
    const body = await c.req.json();
    await this.getService().addAward(
      userId,
      user.council!,
      body.awardType,
      body.notes,
      user.id
    );
    return c.json({ success: true as const, data: null }, 200);
  };

  removeAward = async (c: ChairContext) => {
    const userId = c.req.param('id') || '';
    await this.getService().removeAward(userId);
    return c.json({ success: true as const, data: null }, 200);
  };

  removeDelegate = async (c: ChairContext) => {
    const userId = c.req.param('id') || '';
    await this.getService().removeDelegate(userId);
    return c.json({ success: true as const, data: null }, 200);
  };

  getActivePeriod = async (c: ChairContext) => {
    const result = await this.getService().getActivePeriod();
    if (!result) return c.json({ success: true as const, data: null }, 200);
    return c.json({ success: true as const, data: result }, 200);
  };

  recordAttendance = async (c: ChairContext) => {
    const body = await c.req.json();
    const user = c.get('user');
    if (!user?.council) {
      return c.json(
        { success: false as const, error: 'Your account has no council assigned', code: 'NO_COUNCIL' },
        403
      );
    }
    try {
      const result = await this.getService().recordAttendance(body, user.id, user.council);
      return c.json({ success: true as const, data: result }, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to record attendance';
      if (message === 'Delegate not found') {
        return c.json({ success: false as const, error: message, code: 'NOT_FOUND' }, 404);
      }
      if (
        message === 'Only delegates can be checked in for attendance' ||
        message === 'Delegate registration is not approved' ||
        message === 'This delegate is not assigned to your council'
      ) {
        return c.json({ success: false as const, error: message, code: 'FORBIDDEN' }, 403);
      }
      throw err;
    }
  };

  searchDelegates = async (c: ChairContext) => {
    const user = c.get('user');
    const query = c.req.query('q') || '';
    if (!user?.council) return c.json({ success: true as const, data: [] }, 200);
    const result = await this.getService().searchDelegates(query, user.council);
    return c.json({ success: true as const, data: result }, 200);
  };

  getResponse = async (c: ChairContext) => {
    const userId = c.req.param('id') || '';
    const result = await this.getService().getDelegateRegistrationResponse(userId);
    if (!result) return c.json({ success: false as const, error: 'Not found' }, 404);
    return c.json({ success: true as const, data: result }, 200);
  };
}

export const chairsController = new ChairsController();
