import { DbType } from '../../db/client';
import { users, delegateProfiles, councils } from '../../db/schema';
import { count, eq } from 'drizzle-orm';
import { Bindings } from '../../types/env';
import { getSupabaseAdmin } from '../../lib/supabase-admin';

export class SetupService {
  constructor(private db: DbType) {}

  async isDatabaseEmpty(): Promise<boolean> {
    const result = await this.db.select({ value: count() }).from(users).get();
    return (result?.value || 0) === 0;
  }

  async removeAdminSeedIfExists(env: Bindings, email: string): Promise<void> {
    const existingUser = await this.db.select().from(users).where(eq(users.email, email)).get();
    if (!existingUser) return;

    await this.db.delete(delegateProfiles).where(eq(delegateProfiles.userId, existingUser.id)).run();

    try {
      await getSupabaseAdmin(env).deleteUser(existingUser.id);
    } catch (err) {
      console.warn('[SetupService] Supabase deleteUser failed (user may only exist in DB):', err);
    }

    await this.db.delete(users).where(eq(users.id, existingUser.id)).run();
  }

  async provisionAdminUser(
    env: Bindings,
    email: string,
    password: string,
    name: string
  ): Promise<{ ok: true; id: string; email: string } | { ok: false; error: string }> {
    try {
      const supabase = getSupabaseAdmin(env);
      const user = await supabase.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });

      if (!user?.id) {
        return { ok: false, error: 'Failed to create admin user via Supabase' };
      }

      await this.seedInitialData();
      await this.seedAdmin(user.id, email, name);

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
        console.error('[SetupService] syncTrackmunJwtMetadata failed:', e);
      }

      return { ok: true, id: user.id, email };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      return { ok: false, error: message };
    }
  }

  async seedInitialData() {
    const now = new Date();
    
    // Seed standard councils with short names for the identification system
    const standardCouncils = [
      { id: crypto.randomUUID(), name: 'Security Council', shortName: 'UNSC', capacity: 15 },
      { id: crypto.randomUUID(), name: 'Human Rights Council', shortName: 'HRC', capacity: 47 },
      { id: crypto.randomUUID(), name: 'Economic and Social Council', shortName: 'ECOSOC', capacity: 54 },
      { id: crypto.randomUUID(), name: 'Disarmament and International Security', shortName: 'DISEC', capacity: 193 },
      { id: crypto.randomUUID(), name: 'General Assembly', shortName: 'GA', capacity: 193 },
      { id: crypto.randomUUID(), name: 'Legal Committee', shortName: 'LEGAL', capacity: 193 },
      { id: crypto.randomUUID(), name: 'Economic and Financial Committee', shortName: 'ECOFIN', capacity: 193 },
    ];

    await this.db.insert(councils).values(standardCouncils.map(c => ({
      ...c,
      createdAt: now,
      updatedAt: now,
    }))).onConflictDoNothing({ target: councils.name }).run();
  }

  async seedAdmin(id: string, email: string, name: string) {
    await this.db
      .insert(users)
      .values({
        id,
        email,
        name,
        role: 'admin',
        registrationStatus: 'approved',
        emailVerified: true,
      })
      .run();
  }
  async promoteToAdmin(id: string) {
    const result = await this.db
    .update(users)
    .set({ role: 'admin', emailVerified: true })
    .where(eq(users.id, id))
    .run();
      return result;
  }
}
