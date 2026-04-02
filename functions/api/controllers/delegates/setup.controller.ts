import { Context } from 'hono';
import { Bindings } from '../../types/env';
import { DelegateSetupService } from '../../services/delegates/setup.service';
import { getDb } from '../../db/client';

export class DelegateSetupController {
  init = async (c: Context<{ Bindings: Bindings }>) => {
    const db = getDb();
    const service = new DelegateSetupService(db);

    if (await service.hasDelegates()) {
      return c.json(
        {
          success: false,
          error:
            'Delegates already exist. Initialization can only be performed when no delegates are present.',
        },
        400
      );
    }

    const existingUser = await service.findUserByEmail(service.getSeedEmail());
    if (existingUser) {
      return c.json(
        {
          success: false,
          error: 'A user with this email already exists. Setup has already been completed.',
        },
        400
      );
    }

    const result = await service.provisionSeedDelegate(c.env);
    if (!result.ok) {
      return c.json({ success: false, error: result.error }, 500);
    }

    return c.json({
      success: true,
      data: {
        message: 'Delegate user created successfully.',
        id: result.id,
        email: result.email,
        country: result.country,
        note: 'This is a test delegate account for initial setup. You can now log in with these credentials.',
      },
    });
  };

  resetInit = async (c: Context<{ Bindings: Bindings }>) => {
    const db = getDb();
    const service = new DelegateSetupService(db);

    console.log('[DelegateSetupController] Resetting delegate user...');
    await service.removeSeedDelegateIfExists(c.env);
    console.log('[DelegateSetupController] Seed delegate removed or was absent; provisioning fresh.');

    const result = await service.provisionSeedDelegate(c.env);
    if (!result.ok) {
      return c.json({ success: false, error: result.error }, 500);
    }

    return c.json({
      success: true,
      data: {
        message: 'Delegate user created successfully.',
        id: result.id,
        email: result.email,
        country: result.country,
        note: 'This is a test delegate account for initial setup. You can now log in with these credentials.',
      },
    });
  };
}
