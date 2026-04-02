import { Context } from 'hono';
import { AuthService } from '../../services/auth';
import { Bindings } from '../../types/env';
import { AuthContext } from '../../middleware/auth';
import { getDb } from '../../db/client';
import { RegisterUser } from '@trackmun/shared';
import { RegistrationService } from '../../services/admin/registration.service';

export class AuthController {
  private getService() {
    return new AuthService(getDb());
  }

  register = async (c: Context<{ Bindings: Bindings; Variables: AuthContext }>) => {
    const body = await c.req.json<RegisterUser>();
    const registrationSettings = await new RegistrationService(getDb()).getSettings();
    if (registrationSettings.registration_enabled === false) {
      return c.json(
        {
          success: false,
          error: 'Delegate registration is currently closed.',
          code: 'REGISTRATION_DISABLED',
        },
        403
      );
    }

    const service = this.getService();

    try {
      const user = await service.registerDelegate(c.env, body);

      return c.json({
        success: true,
        data: { user },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to register user';
      return c.json(
        {
          success: false,
          error: message,
        },
        400
      );
    }
  };

  signInWithEmail = async (c: Context<{ Bindings: Bindings; Variables: AuthContext }>) => {
    const body = await c.req.json<{ email: string; password: string }>();
    const service = this.getService();
    const result = await service.proxyPasswordSignIn(c.env, body.email, body.password);
    if (!result.ok) {
      const err = result.body as { error_description?: string; error?: string };
      const status =
        result.status === 401 || result.status === 403 || result.status === 400
          ? result.status
          : 400;
      return c.json(
        {
          success: false as const,
          error: err.error_description || err.error || 'Login failed',
          code: 'AUTH_FAILED' as const,
        },
        status
      );
    }
    return c.json({ success: true as const, data: result.body }, 200);
  };

  signOut = async (c: Context<{ Bindings: Bindings; Variables: AuthContext }>) => {
    const service = this.getService();
    await service.proxySignOut(c.env, c.req.header('Authorization'));
    return c.json({ success: true as const, data: null }, 200);
  };

  getCurrentUser = async (c: Context<{ Bindings: Bindings; Variables: AuthContext }>) => {
    return c.json({ success: true as const, data: c.get('user') }, 200);
  };

  impersonateUser = async (c: Context<{ Bindings: Bindings; Variables: AuthContext }>) => {
    const admin = c.get('user');
    const targetId = c.req.param('userId') || '';
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
