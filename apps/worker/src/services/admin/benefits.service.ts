import { DbType } from '../../db/client';
import { benefits } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { Benefit } from '@trackmun/shared';

export class BenefitsService {
  constructor(private db: DbType) {}

  async listBenefits(): Promise<Benefit[]> {
    const records = await this.db.select().from(benefits).all();
    return records.map(r => ({
      id: r.id,
      name: r.name,
      createdAt: typeof r.createdAt === 'number' ? r.createdAt : r.createdAt.getTime(),
      updatedAt: typeof r.updatedAt === 'number' ? r.updatedAt : r.updatedAt.getTime(),
    }));
  }

  async createBenefit(name: string): Promise<Benefit> {
    const id = crypto.randomUUID();
    const now = new Date();
    
    await this.db.insert(benefits).values({
      id,
      name,
      createdAt: now,
      updatedAt: now,
    } as any).run();

    return { id, name, createdAt: now.getTime(), updatedAt: now.getTime() };
  }

  async deleteBenefit(id: string): Promise<boolean> {
    await this.db.delete(benefits).where(eq(benefits.id, id)).run();
    return true;
  }
}
