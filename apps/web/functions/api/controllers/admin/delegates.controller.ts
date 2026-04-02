import { AdminController } from './base.controller';
import { Context } from 'hono';
import { Bindings } from '../../types/env';
import { AuthContext } from '../../middleware/auth';
import { getDb } from '../../db/client';
import { delegateProfiles } from '../../db/schema';
import { eq } from 'drizzle-orm';

class DelegateAdminController extends AdminController {
  constructor() {
    super('delegate');
  }

  updatePayment = async (c: Context<{ Bindings: Bindings; Variables: AuthContext }>) => {
    const id = c.req.param('id') || '';
    const body = await c.req.json();
    const db = getDb();

    const profile = await db.select().from(delegateProfiles).where(eq(delegateProfiles.userId, id)).get();
    if (!profile) return c.json({ success: false as const, error: 'Delegate profile not found' }, 404);

    const updates: Partial<typeof delegateProfiles.$inferInsert> = {};
    if (body.depositPaymentStatus) updates.depositPaymentStatus = body.depositPaymentStatus;
    if (body.fullPaymentStatus) updates.fullPaymentStatus = body.fullPaymentStatus;

    if (Object.keys(updates).length > 0) {
      await db.update(delegateProfiles).set(updates).where(eq(delegateProfiles.userId, id)).run();
    }
    
    return c.json({ success: true as const, data: null }, 200);
  }
}

export const delegatesController = new DelegateAdminController();
