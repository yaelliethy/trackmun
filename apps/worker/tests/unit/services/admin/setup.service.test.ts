import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SetupService } from '#src/services/admin/setup.service';
import type { DbType } from '#src/db/client';

describe('SetupService', () => {
  let get: ReturnType<typeof vi.fn>;
  let run: ReturnType<typeof vi.fn>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Drizzle chain mocks
  let mockDb: any;

  beforeEach(() => {
    get = vi.fn();
    run = vi.fn().mockResolvedValue(undefined);
    mockDb = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          get,
        })),
      })),
      insert: vi.fn(() => ({
        values: vi.fn(() => ({ run })),
      })),
      update: vi.fn(() => ({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        run,
      })),
    };
  });

  it('isDatabaseEmpty returns true when user count is 0', async () => {
    get.mockResolvedValue({ value: 0 });
    const service = new SetupService(mockDb as DbType);
    await expect(service.isDatabaseEmpty()).resolves.toBe(true);
  });

  it('isDatabaseEmpty returns false when users exist', async () => {
    get.mockResolvedValue({ value: 3 });
    const service = new SetupService(mockDb as DbType);
    await expect(service.isDatabaseEmpty()).resolves.toBe(false);
  });

  it('seedAdmin inserts admin user', async () => {
    const service = new SetupService(mockDb as DbType);
    await service.seedAdmin('id-1', 'a@b.com', 'Admin');
    expect(mockDb.insert).toHaveBeenCalled();
    expect(run).toHaveBeenCalled();
    const valuesFn = mockDb.insert.mock.results[0].value.values;
    expect(valuesFn).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'id-1',
        email: 'a@b.com',
        name: 'Admin',
        role: 'admin',
      })
    );
  });

  it('promoteToAdmin updates role', async () => {
    const service = new SetupService(mockDb as DbType);
    await service.promoteToAdmin('user-1');
    expect(mockDb.update).toHaveBeenCalled();
    expect(run).toHaveBeenCalled();
  });
});
