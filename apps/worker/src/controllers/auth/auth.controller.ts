import { Context } from 'hono';
import { AuthService } from '../../services/auth';
import { Bindings } from '../../types/env';
import { AuthContext } from '../../middleware/auth';
import { getDb } from '../../db/client';

export class AuthController {
  private getService() {
    return new AuthService(getDb());
  }

  getCurrentUser = async (c: Context<{ Bindings: Bindings; Variables: AuthContext }>) => {
    return c.json({ success: true as const, data: c.get('user') }, 200);
  };

  impersonateUser = async (c: Context<{ Bindings: Bindings; Variables: AuthContext }>) => {
    const admin = c.get('user');
    const { userId: targetId } = c.req.valid('param' as never);
    const service = this.getService();
    
    const targetUser = await service.getUserById(targetId);
    if (!targetUser) {
      return c.json({ success: false, error: 'Target user not found' }, 404);
    }

    // Restrict impersonation to oc and chair roles only
    if (targetUser.role !== 'oc' && targetUser.role !== 'chair') {
      return c.json({ success: false, error: 'Can only impersonate OC members or chairs' }, 403);
    }

    const logId = await service.logImpersonation(admin.id, targetId);

    const payload = {
      typ: 'impersonation',
      adminId: admin.id,
      actingAs: targetId,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      logId,
    };

    const token = await service.createImpersonationToken(payload, c.env.IMPERSONATION_SECRET);

    return c.json({
      success: true,
      data: { token },
    });
  };

  unimpersonateUser = async (c: Context<{ Bindings: Bindings; Variables: AuthContext; }>) => {
    if (!c.get('isImpersonating')) {
      return c.json({ success: false as const, error: 'Not currently impersonating' }, 400);
    }
    return c.json({ success: true as const, data: null }, 200);
  };
}
