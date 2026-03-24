import { User, UserRole, UpdateUserSchema } from '@trackmun/shared';
import { DbType } from '../../db/client';
import { users } from '../../db/schema';
import { eq, count } from 'drizzle-orm';
import { z } from 'zod';

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

export class AdminService {
  constructor(private db: DbType) {}

  async getUsersByRole(
    role: UserRole,
    page: number = 1,
    limit: number = 20
  ): Promise<{ users: User[]; total: number }> {
    const offset = (page - 1) * limit;

    const userList = await this.db
      .select()
      .from(users)
      .where(eq(users.role, role))
      .orderBy(users.createdAt)
      .limit(limit)
      .offset(offset)
      .all();

    const totalResult = await this.db
      .select({ count: count() })
      .from(users)
      .where(eq(users.role, role))
      .get();

    return {
      users: userList.map((user: any) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as UserRole,
        council: user.council || undefined,
        created_at:
          user.createdAt instanceof Date ? user.createdAt.getTime() : user.createdAt,
      })),
      total: totalResult?.count || 0,
    };
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<User | null> {
    const updates: Record<string, any> = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.council !== undefined) updates.council = input.council;
    if (input.role !== undefined) updates.role = input.role;

    if (Object.keys(updates).length === 0) {
      return this.getUserById(id);
    }

    await this.db.update(users).set(updates).where(eq(users.id, id)).run();

    return this.getUserById(id);
  }

  async deleteUser(id: string, adminId: string): Promise<boolean> {
    if (id === adminId) {
      throw new Error('Cannot delete yourself');
    }

    await this.db.delete(users).where(eq(users.id, id)).run();

    return true;
  }

  private async getUserById(id: string): Promise<User | null> {
    const user = await this.db.select().from(users).where(eq(users.id, id)).get();

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      council: user.council || undefined,
      created_at:
        user.createdAt instanceof Date ? user.createdAt.getTime() : user.createdAt,
    };
  }
}
