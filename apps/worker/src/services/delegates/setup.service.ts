import { DbType } from '../../db/client';
import { users, delegateProfiles } from '../../db/schema';
import { count } from 'drizzle-orm';

export class DelegateSetupService {
  constructor(private db: DbType) {}

  async hasDelegates(): Promise<boolean> {
    const result = await this.db.select({ value: count() }).from(delegateProfiles).get();
    return (result?.value || 0) > 0;
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
}
