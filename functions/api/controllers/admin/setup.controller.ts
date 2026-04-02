import { Context } from 'hono';
import { Bindings } from '../../types/env';
import { getDb } from '../../db/client';
import { users } from '../../db/schema';
import { SetupService } from '../../services/admin/setup.service';

const DEFAULT_EMAIL = 'admin@trackmun.app';
const DEFAULT_PASSWORD = 'Password123!';
const DEFAULT_NAME = 'System Admin';

export class AdminSetupController {
  init = async (c: Context<{ Bindings: Bindings }>) => {
    const db = getDb();
    const setup = new SetupService(db);

    const userCount = await db.select().from(users).get();
    if (userCount) {
      return c.json(
        {
          success: false,
          error: 'Database is not empty. Initialization can only be performed on an empty database.',
        },
        400
      );
    }

    console.log('[AdminSetupController] Starting admin setup...');
    const result = await setup.provisionAdminUser(c.env, DEFAULT_EMAIL, DEFAULT_PASSWORD, DEFAULT_NAME);
    if (!result.ok) {
      console.error('[AdminSetupController] provisionAdminUser failed:', result.error);
      return c.json({ success: false, error: result.error }, 500);
    }

    console.log('[AdminSetupController] Turso seed finished.');
    return c.json({
      success: true,
      data: {
        message: 'Admin user created successfully.',
        id: result.id,
        email: result.email,
        note: 'Please change your password immediately.',
      },
    });
  };

  resetInit = async (c: Context<{ Bindings: Bindings }>) => {
    const db = getDb();
    const setup = new SetupService(db);

    console.log('[AdminSetupController] Resetting admin user...');
    await setup.removeAdminSeedIfExists(c.env, DEFAULT_EMAIL);
    console.log('[AdminSetupController] Existing admin removed or was absent; provisioning fresh.');

    const result = await setup.provisionAdminUser(c.env, DEFAULT_EMAIL, DEFAULT_PASSWORD, DEFAULT_NAME);
    if (!result.ok) {
      console.error('[AdminSetupController] provisionAdminUser failed:', result.error);
      return c.json({ success: false, error: result.error }, 500);
    }

    return c.json({
      success: true,
      data: {
        message: 'Admin user created successfully.',
        id: result.id,
        email: result.email,
        note: 'Please change your password immediately.',
      },
    });
  };
}
