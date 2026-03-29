import { Context } from 'hono';
import { getDb } from '../../db/client';
import { SetupService } from '../../services/admin/setup.service';
import { Bindings } from '../../types/env';
import { getSupabaseAdmin } from '../../lib/supabase-admin';

  init = async (c: Context<{ Bindings: Bindings }>) => {
    const db = getDb();

    // Check if database is empty
    const userCount = await db.select().from(users).get();
    if (userCount) {
      return c.json({
        success: false,
        error: 'Database is not empty. Initialization can only be performed on an empty database.',
      }, 400);
    }

    return this.createAdminUser(c, db);
  };

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
      console.error('Admin setup error:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
  }
}
