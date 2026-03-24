import { Context } from 'hono';
import { eq } from 'drizzle-orm';
import { getDb } from '../../db/client';
import { users } from '../../db/schema';
import { SetupService } from '../../services/admin/setup.service';
import { Bindings } from '../../types/env';
import { getAuth } from '../../lib/auth';

export class SetupController {
  init = async (c: Context<{ Bindings: Bindings }>) => {
    const db = getDb();
    const service = new SetupService(db);

    // 1. Check if database is empty
    const isEmpty = await service.isDatabaseEmpty();
    if (!isEmpty) {
      return c.json({ 
        success: false, 
        error: 'Database is not empty. Initialization can only be performed on an empty database.' 
      }, 400);
    }

    const email = 'admin@trackmun.app';
    const password = 'Password123!';
    const name = 'System Admin';

    try {
      console.log('[SetupController] Starting admin setup...');
      const auth = getAuth(c.env, db);
      
      // 2. Create user via better-auth (role defaults to 'delegate')
      console.log('[SetupController] Creating user via better-auth...');
      const user = await auth.api.signUpEmail({
        body: { email, password, name }
      });

      if (!user) {
        console.error('[SetupController] better-auth signUpEmail returned null');
        throw new Error('Failed to create admin user via better-auth');
      }

      console.log('[SetupController] User created successfully:', user.user.id);

      // 3. Promote to admin — better-auth ignores role in signUpEmail body
      await service.promoteToAdmin(user.user.id);
      console.log('[SetupController] Promotion call finished.');
      return c.json({
        success: true,
        data: {
          message: 'Admin user created successfully.',
          id: user.user.id,
          email,
          note: 'Please change your password immediately.'
        }
      });
    } catch (error: any) {
      console.error('Setup error:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
  };
}
