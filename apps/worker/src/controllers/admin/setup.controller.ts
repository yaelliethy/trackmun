import { Context } from 'hono';
import { Bindings } from '../../types/env';
import { getDb } from '../../db/client';
import { users, delegateProfiles } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { getSupabaseAdmin } from '#src/lib/supabase-admin';
import { SetupService } from '../../services/admin/setup.service';

export class AdminSetupController {
  private readonly DEFAULT_EMAIL = 'admin@trackmun.app';
  private readonly DEFAULT_PASSWORD = 'Password123!';
  private readonly DEFAULT_NAME = 'System Admin';

  init = async (c: Context<{ Bindings: Bindings }>) => {
    const db = getDb();

    const userCount = await db.select().from(users).get();
    if (userCount) {
      return c.json(
        {
          success: false,
          error: 'Database is not empty. Initialization can only be performed on an empty database.',
        },
        400
      );
    }

    return this.createAdminUser(c, db);
  };

  resetInit = async (c: Context<{ Bindings: Bindings }>) => {
    const db = getDb();

    console.log('[AdminSetupController] Resetting admin user...');

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, this.DEFAULT_EMAIL))
      .get();
    if (existingUser) {
      console.log('[AdminSetupController] Deleting existing admin data...');

      await db
        .delete(delegateProfiles)
        .where(eq(delegateProfiles.userId, existingUser.id))
        .run();

      try {
        const supabase = getSupabaseAdmin(c.env);
        await supabase.deleteUser(existingUser.id);
      } catch (err) {
        console.warn(
          '[AdminSetupController] Supabase deleteUser failed (user may only exist in DB):',
          err
        );
      }

      await db.delete(users).where(eq(users.id, existingUser.id)).run();

      console.log('[AdminSetupController] Existing admin deleted successfully.');
    } else {
      console.log('[AdminSetupController] No existing admin found, will create fresh.');
    }

    return this.createAdminUser(c, db);
  };

  private async createAdminUser(
    c: Context<{ Bindings: Bindings }>,
    db: ReturnType<typeof getDb>
  ) {
    try {
      console.log('[AdminSetupController] Starting admin setup...');
      const supabase = getSupabaseAdmin(c.env);
      const service = new SetupService(db);

      const email = this.DEFAULT_EMAIL;
      const password = this.DEFAULT_PASSWORD;
      const name = this.DEFAULT_NAME;

      console.log('[AdminSetupController] Creating user via Supabase...');
      const user = await supabase.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });

      if (!user || !user.id) {
        console.error('[AdminSetupController] Supabase createUser returned null or no ID');
        throw new Error('Failed to create admin user via Supabase');
      }

      console.log('[AdminSetupController] User created successfully:', user.id);

      await service.seedAdmin(user.id, email, name);
      console.log('[AdminSetupController] Turso seed finished.');

      try {
        await supabase.syncTrackmunJwtMetadata(
          user.id,
          {
            role: 'admin',
            registrationStatus: 'approved',
            council: null,
          },
          { user_metadata: { name } }
        );
      } catch (e) {
        console.error('[AdminSetupController] syncTrackmunJwtMetadata failed:', e);
      }

      return c.json({
        success: true,
        data: {
          message: 'Admin user created successfully.',
          id: user.id,
          email,
          note: 'Please change your password immediately.',
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Admin setup error:', error);
      return c.json({ success: false, error: message }, 500);
    }
  }
}
