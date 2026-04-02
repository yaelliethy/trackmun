import { Context } from 'hono';
import { AdminService } from '../../services/admin';
import { Bindings } from '../../types/env';
import { AuthContext } from '../../middleware/auth';
import { UserRole } from '@trackmun/shared';
import { getDb } from '../../db/client';
import { getSupabaseAdmin } from '../../lib/supabase-admin';

type AdminContext = Context<{ Bindings: Bindings; Variables: AuthContext }>;

export class AdminController {
  constructor(private role: UserRole) {}

  private getService() {
    return new AdminService(getDb());
  }

  listUsers = async (c: AdminContext) => {
    const page = Number(c.req.query('page')) || 1;
    const limit = Number(c.req.query('limit')) || 20;

    const filters = {
      search: c.req.query('search'),
      registrationStatus: c.req.query('registrationStatus') as any,
      council: c.req.query('council'),
      depositPaymentStatus: c.req.query('depositPaymentStatus') as any,
      fullPaymentStatus: c.req.query('fullPaymentStatus') as any,
    };

    const service = this.getService();
    const result = await service.getUsersByRole(this.role, page, limit, filters);

    return c.json({ success: true as const, data: result }, 200);
  };

  createUser = async (c: AdminContext) => {
    const body = await c.req.json();
    const service = this.getService();
    const result = await service.createProvisionedUser(c.env, this.role, {
      email: body.email,
      password: body.password,
      name: body.name,
      council: body.council ?? null,
    });

    if (!result.ok) {
      return c.json({ success: false as const, error: result.error }, 400);
    }
    return c.json({ success: true as const, data: result.user }, 201);
  };

  updateUser = async (c: AdminContext) => {
    const id = c.req.param('id') ?? '';
    const body = await c.req.json();

    const service = this.getService();
    const supabase = getSupabaseAdmin(c.env);
    const user = await service.updateUser(id, body, supabase);

    if (!user) {
      return c.json({ success: false as const, error: 'User not found' }, 404);
    }

    return c.json({ success: true as const, data: user }, 200);
  };

  deleteUser = async (c: AdminContext) => {
    const id = c.req.param('id') ?? '';
    const admin = c.get('user');

    const service = this.getService();
    const supabase = getSupabaseAdmin(c.env);
    try {
      await service.deleteUser(id, admin.id, supabase);
      return c.json({ success: true as const, data: null }, 200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Delete failed';
      return c.json({ success: false as const, error: message }, 400);
    }
  };
}
