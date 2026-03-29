import { DbType } from '../../db/client';
import { conferenceDays, attendancePeriods } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { ConferenceDay, AttendancePeriod } from '@trackmun/shared';

export class AttendanceService {
  constructor(private db: DbType) {}

  async listDays(): Promise<ConferenceDay[]> {
    const days = await this.db.select().from(conferenceDays).all();
    const periods = await this.db.select().from(attendancePeriods).all();

    return days.map(d => ({
      id: d.id,
      name: d.name,
      date: d.date,
      periods: periods.filter(p => p.dayId === d.id).map(p => ({
        id: p.id,
        dayId: p.dayId,
        startTime: p.startTime,
        endTime: p.endTime,
      })),
    }));
  }

  async createDay(name: string, date: string): Promise<ConferenceDay> {
    const today = new Date().toISOString().slice(0, 10);
    if (date < today) {
      throw new Error('Date must be today or in the future');
    }

    const id = crypto.randomUUID();
    const now = new Date();
    await this.db.insert(conferenceDays).values({
      id,
      name,
      date,
      createdAt: now,
      updatedAt: now,
    } as any).run();

    return { id, name, date, periods: [] };
  }

  async deleteDay(id: string): Promise<boolean> {
    await this.db.delete(conferenceDays).where(eq(conferenceDays.id, id)).run();
    // Periods will cascade delete theoretically, but SQLite FKs might need to be enabled or we manually delete:
    await this.db.delete(attendancePeriods).where(eq(attendancePeriods.dayId, id)).run();
    return true;
  }

  async replacePeriods(dayId: string, newPeriods: { startTime: string, endTime: string }[]): Promise<AttendancePeriod[]> {
    const now = new Date();
    
    // Validate periods
    for (let i = 0; i < newPeriods.length; i++) {
      const p = newPeriods[i];
      if (p.startTime >= p.endTime) {
        throw new Error(`Period ${i + 1}: Start time must be before end time`);
      }
      
      for (let j = i + 1; j < newPeriods.length; j++) {
        const other = newPeriods[j];
        if (p.startTime < other.endTime && other.startTime < p.endTime) {
          throw new Error(`Period ${i + 1} and Period ${j + 1} overlap`);
        }
      }
    }

    // Delete existing
    await this.db.delete(attendancePeriods).where(eq(attendancePeriods.dayId, dayId)).run();
    
    if (newPeriods.length === 0) {
      return [];
    }

    const inserts = newPeriods.map(p => ({
      id: crypto.randomUUID(),
      dayId: dayId,
      startTime: p.startTime,
      endTime: p.endTime,
      createdAt: now,
      updatedAt: now,
    }));

    await this.db.insert(attendancePeriods).values(inserts as any[]).run();

    return inserts.map(i => ({
      id: i.id,
      dayId: i.dayId,
      startTime: i.startTime,
      endTime: i.endTime,
    }));
  }
}
