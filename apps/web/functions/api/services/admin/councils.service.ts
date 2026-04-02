import { DbType } from '../../db/client';
import { councils } from '../../db/schema';
import { eq } from 'drizzle-orm';
import type { Council } from '@trackmun/shared';

export class CouncilsService {
  constructor(private db: DbType) {}

  async list(): Promise<Council[]> {
    const rows = await this.db.select().from(councils).orderBy(councils.name).all();
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      shortName: r.shortName ?? null,
      capacity: r.capacity ?? undefined,
      createdAt:
        r.createdAt instanceof Date ? r.createdAt.getTime() : r.createdAt,
      updatedAt:
        r.updatedAt instanceof Date ? r.updatedAt.getTime() : r.updatedAt,
    }));
  }

  async create(name: string, shortName?: string, capacity?: number): Promise<Council> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('Council name is required');
    }
    const id = crypto.randomUUID();
    const now = new Date();
    await this.db
      .insert(councils)
      .values({
        id,
        name: trimmed,
        shortName: shortName?.trim().toUpperCase() ?? null,
        capacity: capacity ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    return {
      id,
      name: trimmed,
      shortName: shortName?.trim().toUpperCase() ?? null,
      capacity: capacity ?? undefined,
      createdAt: now.getTime(),
      updatedAt: now.getTime(),
    };
  }

  async update(id: string, name: string, shortName?: string, capacity?: number): Promise<Council | null> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('Council name is required');
    }
    const now = new Date();
    await this.db
      .update(councils)
      .set({ 
        name: trimmed, 
        shortName: shortName?.trim().toUpperCase() ?? undefined, 
        capacity: capacity ?? null,
        updatedAt: now 
      })
      .where(eq(councils.id, id))
      .run();
    const row = await this.db.select().from(councils).where(eq(councils.id, id)).get();
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      shortName: row.shortName ?? null,
      capacity: row.capacity ?? undefined,
      createdAt:
        row.createdAt instanceof Date ? row.createdAt.getTime() : row.createdAt,
      updatedAt:
        row.updatedAt instanceof Date ? row.updatedAt.getTime() : row.updatedAt,
    };
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(councils).where(eq(councils.id, id)).run();
  }
}
