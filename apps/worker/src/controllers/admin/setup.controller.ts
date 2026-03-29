import { Context } from 'hono';
import { Bindings } from '../../types/env';
import { getDb } from '../../db/client';
import { getAuth } from '../../lib/auth';
import { users, delegateProfiles, accounts, sessions, verifications } from '../../db/schema';
import { eq } from 'drizzle-orm';

export class AdminSetupController {
  private readonly DEFAULT_EMAIL = 'admin@trackmun.app';
  private readonly DEFAULT_PASSWORD = 'Password123!';
  private readonly DEFAULT_NAME = 'System Admin';

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

  resetInit = async (c: Context<{ Bindings: Bindings }>) => {
    const db = getDb();

    console.log('[AdminSetupController] Resetting admin user...');

    // Find and delete existing admin user and all related data
    const existingUser = await db.select().from(users).where(eq(users.email, this.DEFAULT_EMAIL)).get();
    if (existingUser) {
      console.log('[AdminSetupController] Deleting existing admin data...');
      
      // Delete in order of foreign key dependencies
      await db.delete(delegateProfiles).where(eq(delegateProfiles.userId, existingUser.id)).run();
      await db.delete(accounts).where(eq(accounts.userId, existingUser.id)).run();
      await db.delete(sessions).where(eq(sessions.userId, existingUser.id)).run();
      await db.delete(verifications).where(eq(verifications.identifier, existingUser.email)).run();
      await db.delete(users).where(eq(users.id, existingUser.id)).run();
      
      console.log('[AdminSetupController] Existing admin deleted successfully.');
    } else {
      console.log('[AdminSetupController] No existing admin found, will create fresh.');
    }

    return this.createAdminUser(c, db);
  };

  private async createAdminUser(c: Context<{ Bindings: Bindings }>, db: ReturnType<typeof getDb>) {
    try {
      console.log('[AdminSetupController] Starting admin setup...');
      const auth = getAuth(c.env, db);

      // Create user via better-auth (this handles password hashing and creates account)
      console.log('[AdminSetupController] Creating user via better-auth...');
      const user = await auth.api.signUpEmail({
        body: { 
          email: this.DEFAULT_EMAIL, 
          password: this.DEFAULT_PASSWORD, 
          name: this.DEFAULT_NAME 
        }
      });

      if (!user || !user.user) {
        console.error('[AdminSetupController] better-auth signUpEmail returned null');
        throw new Error('Failed to create admin user via better-auth');
      }

      console.log('[AdminSetupController] User created successfully:', user.user.id);

      // Promote to admin — better-auth ignores role in signUpEmail body
      console.log('[AdminSetupController] Promoting to admin...');
      await db.update(users)
        .set({ 
          role: 'admin',
          emailVerified: true,
          registrationStatus: 'approved'
        })
        .where(eq(users.id, user.user.id))
        .run();

      console.log('[AdminSetupController] Admin promotion complete.');

      return c.json({
        success: true,
        data: {
          message: 'Admin user created successfully.',
          id: user.user.id,
          email: this.DEFAULT_EMAIL,
          note: 'Please change your password immediately.'
        }
      });
    } catch (error: any) {
      console.error('Admin setup error:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
  }
}
