import { Context } from 'hono';
import { getDb } from '../../db/client';
import { SetupService } from '../../services/admin/setup.service';
import { Bindings } from '../../types/env';
import { getSupabaseAdmin } from '../../lib/supabase-admin';

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
      const supabase = getSupabaseAdmin(c.env);
      
      // 2. Create user via Supabase
      console.log('[SetupController] Creating user via Supabase...');
      const user = await supabase.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name }
      });

      if (!user || !user.id) {
        console.error('[SetupController] Supabase createUser returned null or no ID');
        throw new Error('Failed to create admin user via Supabase');
      }

      console.log('[SetupController] User created successfully:', user.id);

      // 3. Seed to Turso with admin role
      await service.seedAdmin(user.id, email, name);
      console.log('[SetupController] Seed call finished.');
      return c.json({
        success: true,
        data: {
          message: 'Admin user created successfully.',
          id: user.id,
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
