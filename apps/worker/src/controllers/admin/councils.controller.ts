import { Context } from 'hono';
import { CouncilsService } from '../../services/admin/councils.service';
import { Bindings } from '../../types/env';
import { AuthContext } from '../../middleware/auth';
import { getDb } from '../../db/client';

type AdminContext = Context<{ Bindings: Bindings; Variables: AuthContext }>;

export class CouncilsController {
  private getService() {
    return new CouncilsService(getDb());
  }

  list = async (c: AdminContext) => {
    const rows = await this.getService().list();
    return c.json({ success: true as const, data: rows }, 200);
  };

  create = async (c: AdminContext) => {
    const body = await c.req.json<{ name?: string; shortName?: string }>();
    const name = body.name ?? '';
    try {
      const row = await this.getService().create(name, body.shortName);
      return c.json({ success: true as const, data: row }, 201);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to create council';
      return c.json({ success: false as const, error: message }, 400);
    }
  };

  update = async (c: AdminContext) => {
    const id = c.req.param('id') ?? '';
    const body = await c.req.json<{ name?: string; shortName?: string }>();
    const name = body.name ?? '';
    try {
      const row = await this.getService().update(id, name, body.shortName);
      if (!row) {
        return c.json({ success: false as const, error: 'Council not found' }, 404);
      }
      return c.json({ success: true as const, data: row }, 200);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to update council';
      return c.json({ success: false as const, error: message }, 400);
    }
  };

  delete = async (c: AdminContext) => {
    const id = c.req.param('id') ?? '';
    await this.getService().delete(id);
    return c.json({ success: true as const, data: null }, 200);
  };
}

export const councilsController = new CouncilsController();
