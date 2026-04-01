import { Context } from 'hono';
import { Bindings } from '../../types/env';
import { DelegateSetupService } from '../../services/delegates/setup.service';
import { getDb } from '../../db/client';
import { getSupabaseAdmin } from '../../lib/supabase-admin';
import { users, delegateProfiles } from '../../db/schema';
import { eq } from 'drizzle-orm';

export class DelegateSetupController {
  private readonly DEFAULT_EMAIL = 'delegate@trackmun.app';
  private readonly DEFAULT_PASSWORD = 'Password123!';
  private readonly DEFAULT_NAME = 'Test Delegate';
  private readonly DEFAULT_COUNTRY = 'United States';

  init = async (c: Context<{ Bindings: Bindings }>) => {
    const db = getDb();
    const service = new DelegateSetupService(db);

    // Check if delegates already exist
    const hasDelegates = await service.hasDelegates();
    if (hasDelegates) {
      return c.json({
        success: false,
        error: 'Delegates already exist. Initialization can only be performed when no delegates are present.',
      }, 400);
    }

    // Check if user with this email already exists
    const existingUser = await db.select().from(users).where(eq(users.email, this.DEFAULT_EMAIL)).get();
    if (existingUser) {
      return c.json({
        success: false,
        error: 'A user with this email already exists. Setup has already been completed.',
      }, 400);
    }

    return this.createDelegateUser(c, db);
  };

  resetInit = async (c: Context<{ Bindings: Bindings }>) => {
    const db = getDb();

    console.log('[DelegateSetupController] Resetting delegate user...');

    // Find existing user
    const existingUser = await db.select().from(users).where(eq(users.email, this.DEFAULT_EMAIL)).get();
    if (existingUser) {
      console.log('[DelegateSetupController] Deleting related records...');
      
      // Delete in order of foreign key dependencies
      // 1. Delete delegate profile first
      console.log('[DelegateSetupController] Deleting delegate profile...');
      await db.delete(delegateProfiles).where(eq(delegateProfiles.userId, existingUser.id)).run();
      
      // 2. Delete from Supabase
      console.log('[DelegateSetupController] Deleting from Supabase...');
      const supabase = getSupabaseAdmin(c.env);
      try {
        await supabase.deleteUser(existingUser.id);
      } catch (e) {
        console.warn('[DelegateSetupController] Failed to delete user from Supabase (might not exist):', e);
      }
      
      // 3. Finally delete the user from Turso
      console.log('[DelegateSetupController] Deleting user from Turso...');
      await db.delete(users).where(eq(users.id, existingUser.id)).run();
      
      console.log('[DelegateSetupController] Existing user and related records deleted successfully.');
    } else {
      console.log('[DelegateSetupController] No existing user found, will create fresh.');
    }

    return this.createDelegateUser(c, db);
  };

  private async createDelegateUser(c: Context<{ Bindings: Bindings }>, db: ReturnType<typeof getDb>) {
    const service = new DelegateSetupService(db);

    try {
      console.log('[DelegateSetupController] Starting delegate setup...');
      const supabase = getSupabaseAdmin(c.env);

      // 1. Create user via Supabase
      console.log('[DelegateSetupController] Creating user via Supabase...');
      const user = await supabase.createUser({
        email: this.DEFAULT_EMAIL,
        password: this.DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: { name: this.DEFAULT_NAME }
      });

      if (!user || !user.id) {
        console.error('[DelegateSetupController] Supabase createUser returned null or no ID');
        throw new Error('Failed to create delegate user via Supabase');
      }

      console.log('[DelegateSetupController] User created successfully:', user.id);

      // 2. Create user in Turso
      console.log('[DelegateSetupController] Creating user in Turso...');
      await db.insert(users).values({
        id: user.id,
        email: this.DEFAULT_EMAIL,
        name: this.DEFAULT_NAME,
        role: 'delegate',
        registrationStatus: 'approved',
        emailVerified: true
      }).run();

      try {
        await supabase.syncTrackmunJwtMetadata(
          user.id,
          {
            role: 'delegate',
            registrationStatus: 'approved',
            council: null,
          },
          { user_metadata: { name: this.DEFAULT_NAME } }
        );
      } catch (e) {
        console.error('[DelegateSetupController] syncTrackmunJwtMetadata failed:', e);
      }

      // 3. Create delegate profile with country
      await service.createDelegateProfile(user.id, this.DEFAULT_COUNTRY);
      console.log('[DelegateSetupController] Delegate profile created successfully.');

      return c.json({
        success: true,
        data: {
          message: 'Delegate user created successfully.',
          id: user.id,
          email: this.DEFAULT_EMAIL,
          country: this.DEFAULT_COUNTRY,
          note: 'This is a test delegate account for initial setup. You can now log in with these credentials.'
        }
      });
    } catch (error: any) {
      console.error('Delegate setup error:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
  };
}
