import { Context } from 'hono';
import { AdminService } from '../../services/admin';
import { Bindings } from '../../types/env';
import { AuthContext } from '../../middleware/auth';
import { UserRole } from '@trackmun/shared';
import { getDb } from '../../db/client';

type AdminContext = Context<{ Bindings: Bindings; Variables: AuthContext }>;

export class AdminController {
  constructor(private role: UserRole) {}

  private getService() {
    return new AdminService(getDb());
  }

  listUsers = async (c: AdminContext) => {
    const page = Number(c.req.query('page')) || 1;
    const limit = Number(c.req.query('limit')) || 20;

    const service = this.getService();
    const result = await service.getUsersByRole(this.role, page, limit);

    return c.json({ success: true as const, data: result }, 200);
  };

  updateUser = async (c: AdminContext) => {
    const id = c.req.param('id') ?? '';
    const body = await c.req.json();

    const service = this.getService();
    const user = await service.updateUser(id, body);

    if (!user) {
      return c.json({ success: false as const, error: 'User not found' }, 404);
    }

    return c.json({ success: true as const, data: user }, 200);
  };

  deleteUser = async (c: AdminContext) => {
    const id = c.req.param('id') ?? '';
    const admin = c.get('user');

    const service = this.getService();
    try {
      await service.deleteUser(id, admin.id);
      return c.json({ success: true as const, data: null }, 200);
    } catch (error: any) {
      return c.json({ success: false as const, error: error.message as string }, 400);
    }
  };
}
