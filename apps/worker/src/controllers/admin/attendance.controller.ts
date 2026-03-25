import { Context } from 'hono';
import { AttendanceService } from '../../services/admin/attendance.service';
import { Bindings } from '../../types/env';
import { AuthContext } from '../../middleware/auth';
import { getDb } from '../../db/client';

type AdminContext = Context<{ Bindings: Bindings; Variables: AuthContext }>;

export class AttendanceController {
  private getService() {
    return new AttendanceService(getDb());
  }

  listDays = async (c: AdminContext) => {
    const service = this.getService();
    const result = await service.listDays();
    return c.json({ success: true as const, data: result }, 200);
  };

  createDay = async (c: AdminContext) => {
    const body = await c.req.json();
    const service = this.getService();
    
    const day = await service.createDay(body.name, body.date);
    return c.json({ success: true as const, data: day }, 201);
  };

  deleteDay = async (c: AdminContext) => {
    const id = c.req.param('id') ?? '';
    const service = this.getService();
    
    await service.deleteDay(id);
    return c.json({ success: true as const, data: null }, 200);
  };

  replacePeriods = async (c: AdminContext) => {
    const id = c.req.param('id') ?? '';
    const body = await c.req.json();
    const service = this.getService();
    
    const newPeriods = await service.replacePeriods(id, body.periods || []);
    return c.json({ success: true as const, data: newPeriods }, 200);
  };
}

export const attendanceController = new AttendanceController();
