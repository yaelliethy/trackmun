import { Context } from 'hono';
import { AdminService } from '../../services/admin';
import { Bindings } from '../../types/env';
import { AuthContext } from '../../middleware/auth';
import { UserRole } from '@trackmun/shared';
import { getDb } from '../../db/client';
import { getSupabaseAdmin } from '../../lib/supabase-admin';
import { users } from '../../db/schema';

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
    const supabase = getSupabaseAdmin(c.env);

    try {
      const res = await supabase.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
        user_metadata: {
          name: body.name,
        },
      });

      if (!res || !res.id) {
        return c.json({ success: false as const, error: 'Failed to create user in Supabase' }, 400);
      }

      const db = getDb();
      // Create user in Turso
      await db.insert(users).values({
        id: res.id,
        email: body.email,
        name: body.name,
        role: this.role as any,
        council: body.council,
        registrationStatus: 'approved', // Admin-created users are auto-approved
        emailVerified: true,
      }).run();

      const service = this.getService();
      const user = await service.updateUser(res.id, {
        role: this.role as any,
        council: body.council,
      });

      return c.json({ success: true as const, data: user }, 201);
    } catch (e: any) {
      return c.json({ success: false as const, error: e.message || 'Internal error' }, 400);
    }
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
