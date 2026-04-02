import { DbType } from '../../db/client';
import { delegateProfiles, users } from '../../db/schema';
import { count, eq } from 'drizzle-orm';
import { Bindings } from '../../types/env';
import { getSupabaseAdmin } from '../../lib/supabase-admin';

const SEED_EMAIL = 'delegate@trackmun.app';
const SEED_PASSWORD = 'Password123!';
const SEED_NAME = 'Test Delegate';
const SEED_COUNTRY = 'United States';

export class DelegateSetupService {
  constructor(private db: DbType) {}

  getSeedEmail(): string {
    return SEED_EMAIL;
  }

  async hasDelegates(): Promise<boolean> {
    const result = await this.db.select({ value: count() }).from(delegateProfiles).get();
    return (result?.value || 0) > 0;
  }

  async findUserByEmail(email: string) {
    return this.db.select().from(users).where(eq(users.email, email)).get();
  }

  async createDelegateProfile(userId: string, country: string) {
    await this.db
      .insert(delegateProfiles)
      .values({
        userId,
        country,
        depositPaymentStatus: 'pending',
        fullPaymentStatus: 'pending',
      })
      .run();
  }

  async removeSeedDelegateIfExists(env: Bindings): Promise<void> {
    const existingUser = await this.findUserByEmail(SEED_EMAIL);
    if (!existingUser) return;

    await this.db.delete(delegateProfiles).where(eq(delegateProfiles.userId, existingUser.id)).run();

    const supabase = getSupabaseAdmin(env);
    try {
      await supabase.deleteUser(existingUser.id);
    } catch (e) {
      console.warn('[DelegateSetupService] Failed to delete user from Supabase (might not exist):', e);
    }

    await this.db.delete(users).where(eq(users.id, existingUser.id)).run();
  }

  async provisionSeedDelegate(env: Bindings): Promise<
    | { ok: true; id: string; email: string; country: string }
    | { ok: false; error: string; status: number }
  > {
    try {
      const supabase = getSupabaseAdmin(env);
      const user = await supabase.createUser({
        email: SEED_EMAIL,
        password: SEED_PASSWORD,
        email_confirm: true,
        user_metadata: { name: SEED_NAME },
      });

      if (!user?.id) {
        return { ok: false, error: 'Failed to create delegate user via Supabase', status: 500 };
      }

      await this.db
        .insert(users)
        .values({
          id: user.id,
          email: SEED_EMAIL,
          name: SEED_NAME,
          role: 'delegate',
          registrationStatus: 'approved',
          emailVerified: true,
        })
        .run();

      try {
        await supabase.syncTrackmunJwtMetadata(
          user.id,
          {
            role: 'delegate',
            registrationStatus: 'approved',
            council: null,
          },
          { user_metadata: { name: SEED_NAME } }
        );
      } catch (e) {
        console.error('[DelegateSetupService] syncTrackmunJwtMetadata failed:', e);
      }

      await this.createDelegateProfile(user.id, SEED_COUNTRY);

      return { ok: true, id: user.id, email: SEED_EMAIL, country: SEED_COUNTRY };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Delegate setup failed';
      return { ok: false, error: message, status: 500 };
    }
  }
}
