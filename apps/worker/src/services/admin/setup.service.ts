import { DbType } from '../../db/client';
import { users } from '../../db/schema';
import { count, eq } from 'drizzle-orm';

export class SetupService {
  constructor(private db: DbType) {}

  async isDatabaseEmpty(): Promise<boolean> {
    const result = await this.db.select({ value: count() }).from(users).get();
    return (result?.value || 0) === 0;
  }

  async seedAdmin(id: string, email: string, name: string) {
    await this.db
      .insert(users)
      .values({
        id,
        email,
        name,
        role: 'admin',
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
