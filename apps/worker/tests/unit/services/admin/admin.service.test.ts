import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminService } from '#src/services/admin/admin.service';
import type { DbType } from '#src/db/client';

describe('AdminService', () => {
  let selectChain: {
    from: ReturnType<typeof vi.fn>;
    where: ReturnType<typeof vi.fn>;
    orderBy: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
    offset: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    all: ReturnType<typeof vi.fn>;
  };
  let updateRun: ReturnType<typeof vi.fn>;
  let deleteRun: ReturnType<typeof vi.fn>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Drizzle chain mocks
  let mockDb: any;

  beforeEach(() => {
    selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      get: vi.fn(),
      all: vi.fn(),
    };
    updateRun = vi.fn().mockResolvedValue(undefined);
    deleteRun = vi.fn().mockResolvedValue(undefined);
    mockDb = {
      select: vi.fn(() => selectChain),
      update: vi.fn(() => ({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        run: updateRun,
      })),
      delete: vi.fn(() => ({
        where: vi.fn().mockReturnThis(),
        run: deleteRun,
      })),
    };
  });

  it('getUsersByRole maps rows and total', async () => {
    const createdAt = new Date('2025-06-01T00:00:00.000Z');
    selectChain.all.mockResolvedValue([
      {
        id: 'u1',
        email: 'd@x.com',
        name: 'Del',
        role: 'delegate',
        council: null,
        createdAt,
      },
    ]);
    selectChain.get.mockResolvedValue({ count: 42 });

    const service = new AdminService(mockDb as DbType);
    const result = await service.getUsersByRole('delegate', 1, 20);

    expect(result.total).toBe(42);
    expect(result.users).toHaveLength(1);
    expect(result.users[0]).toEqual({
      id: 'u1',
      email: 'd@x.com',
      name: 'Del',
      role: 'delegate',
      created_at: createdAt.getTime(),
    });
    expect(result.users[0].council).toBeUndefined();
  });

  it('updateUser returns user without DB update when input is empty', async () => {
    const createdAt = new Date();
    selectChain.get.mockResolvedValue({
      id: 'u1',
      email: 'e@e.com',
      name: 'N',
      role: 'oc',
      council: 'GA',
      createdAt,
    });

    const service = new AdminService(mockDb as DbType);
    const user = await service.updateUser('u1', {});

    expect(mockDb.update).not.toHaveBeenCalled();
    expect(user).toEqual({
      id: 'u1',
      email: 'e@e.com',
      name: 'N',
      role: 'oc',
      council: 'GA',
      created_at: createdAt.getTime(),
    });
  });

  it('updateUser applies partial updates', async () => {
    const createdAt = new Date();
    selectChain.get.mockResolvedValue({
      id: 'u1',
      email: 'e@e.com',
      name: 'New',
      role: 'chair',
      council: null,
      createdAt,
    });

    const service = new AdminService(mockDb as DbType);
    const user = await service.updateUser('u1', { name: 'New', role: 'chair' });

    expect(mockDb.update).toHaveBeenCalled();
    expect(updateRun).toHaveBeenCalled();
    expect(user?.name).toBe('New');
    expect(user?.role).toBe('chair');
  });

  it('deleteUser throws when admin targets self', async () => {
    const service = new AdminService(mockDb as DbType);
    await expect(service.deleteUser('same', 'same')).rejects.toThrow('Cannot delete yourself');
    expect(deleteRun).not.toHaveBeenCalled();
  });

  it('deleteUser deletes other user', async () => {
    const service = new AdminService(mockDb as DbType);
    await expect(service.deleteUser('victim', 'admin')).resolves.toBe(true);
    expect(deleteRun).toHaveBeenCalled();
  });
});
