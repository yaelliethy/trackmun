import { MiddlewareHandler } from 'hono';
import { UserRole } from '@trackmun/shared';
import { AuthContext } from './auth';
import { Bindings } from '../types/env';

export const requireRole = (...roles: UserRole[]): MiddlewareHandler<{ Bindings: Bindings; Variables: AuthContext }> => {
  return async (c, next) => {
    const user = c.get('user');
    
    if (!user) {
      return c.json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);
    }

    if (!roles.includes(user.role)) {
      return c.json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, 403);
    }

    await next();
  };
};
