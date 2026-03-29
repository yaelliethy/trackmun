import { Context } from 'hono';
import { Bindings } from '../../types/env';
import { DelegateSetupService } from '../../services/delegates/setup.service';
import { getDb } from '../../db/client';
import { getAuth } from '../../lib/auth';
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
      
      // 2. Delete from accounts table (better-auth)
      console.log('[DelegateSetupController] Deleting accounts...');
      const { accounts } = await import('../../db/schema');
      await db.delete(accounts).where(eq(accounts.userId, existingUser.id)).run();
      
      // 3. Delete from sessions table (better-auth)
      console.log('[DelegateSetupController] Deleting sessions...');
      const { sessions } = await import('../../db/schema');
      await db.delete(sessions).where(eq(sessions.userId, existingUser.id)).run();
      
      // 4. Delete from verifications table (better-auth)
      console.log('[DelegateSetupController] Deleting verifications...');
      const { verifications } = await import('../../db/schema');
      await db.delete(verifications).where(eq(verifications.identifier, existingUser.email)).run();
      
      // 5. Finally delete the user
      console.log('[DelegateSetupController] Deleting user...');
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
      const auth = getAuth(c.env, db);

      // 1. Create user via better-auth (this handles password hashing and creates account)
      console.log('[DelegateSetupController] Creating user via better-auth...');
      const user = await auth.api.signUpEmail({
        body: { 
          email: this.DEFAULT_EMAIL, 
          password: this.DEFAULT_PASSWORD, 
          name: this.DEFAULT_NAME 
        }
      });

      if (!user || !user.user) {
        console.error('[DelegateSetupController] better-auth signUpEmail returned null');
        throw new Error('Failed to create delegate user via better-auth');
      }

      console.log('[DelegateSetupController] User created successfully:', user.user.id);

      // 2. Mark email as verified and registration as approved in the database
      console.log('[DelegateSetupController] Marking email as verified and approved...');
      await db.update(users)
        .set({ 
          emailVerified: true,
          registrationStatus: 'approved'
        })
        .where(eq(users.id, user.user.id))
        .run();

      // 3. Create delegate profile with country
      await service.createDelegateProfile(user.user.id, this.DEFAULT_COUNTRY);
      console.log('[DelegateSetupController] Delegate profile created successfully.');

      return c.json({
        success: true,
        data: {
          message: 'Delegate user created successfully.',
          id: user.user.id,
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
