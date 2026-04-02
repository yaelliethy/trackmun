import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChairsService } from '#src/services/chairs/chairs.service';
import type { DbType } from '#src/db/client';

describe('ChairsService', () => {
  let mockDb: any;
  let selectResult: any;
  let updateRun: any;

  beforeEach(() => {
    updateRun = vi.fn().mockResolvedValue({ success: true });
    
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      get: vi.fn(() => selectResult),
      all: vi.fn(() => Array.isArray(selectResult) ? selectResult : [selectResult]),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
    };

    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      run: updateRun,
    };

    mockDb = {
      select: vi.fn(() => selectChain),
      update: vi.fn(() => updateChain),
    };
  });

  describe('removeAward', () => {
    it('runs transaction updating profile and deleting award rows', async () => {
      const deleteRun = vi.fn().mockResolvedValue({ success: true });
      mockDb.delete = vi.fn(() => ({
        where: vi.fn().mockReturnThis(),
        run: deleteRun,
      }));
      mockDb.transaction = vi.fn(async (fn: (tx: typeof mockDb) => Promise<void>) => {
        await fn({
          update: mockDb.update,
          delete: mockDb.delete,
        } as typeof mockDb);
      });

      const service = new ChairsService(mockDb as DbType);
      await service.removeAward('user-1');

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(updateRun).toHaveBeenCalled();
      expect(deleteRun).toHaveBeenCalled();
    });
  });

  describe('acceptDelegate', () => {
    it('throws error if council is at full capacity', async () => {
      // Mock user found
      // Mock council with capacity 2
      // Mock 2 users already approved in that council
      const mockUser = { id: 'user-1', registrationStatus: 'pending' };
      const mockCouncil = { name: 'UNSC', capacity: 2 };
      const alreadyAccepted = [{ id: 'u1' }, { id: 'u2' }];

      let callCount = 0;
      mockDb.select = vi.fn(() => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn(() => {
          callCount++;
          if (callCount === 1) return mockUser;
          if (callCount === 2) return mockCouncil;
          return null;
        }),
        all: vi.fn(() => alreadyAccepted)
      }));

      const service = new ChairsService(mockDb as DbType);
      await expect(service.acceptDelegate('user-1', 'UNSC')).rejects.toThrow('Council is at full capacity');
    });

    it('allows acceptance if capacity is not reached', async () => {
      const mockUser = { id: 'user-1', registrationStatus: 'pending', role: 'delegate' };
      const mockCouncil = { name: 'UNSC', capacity: 5 };
      const alreadyAccepted = [{ id: 'u1' }];

      let getCallCount = 0;
      mockDb.select = vi.fn(() => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn(() => {
          getCallCount++;
          if (getCallCount === 1) return mockUser;
          if (getCallCount === 2) return mockCouncil;
          return { ...mockUser, registrationStatus: 'approved', council: 'UNSC' }; // Final fetch
        }),
        all: vi.fn(() => alreadyAccepted)
      }));

      const service = new ChairsService(mockDb as DbType);
      const result = await service.acceptDelegate('user-1', 'UNSC');
      
      expect(updateRun).toHaveBeenCalled();
      expect(result?.registrationStatus).toBe('approved');
    });
  });

  describe('deferDelegate', () => {
    it('increments preference tracker', async () => {
      const mockProfile = { userId: 'user-1', currentPreferenceTracker: 1 };
      mockDb.select = vi.fn(() => ({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          get: vi.fn(() => mockProfile)
      }));

      const service = new ChairsService(mockDb as DbType);
      await service.deferDelegate('user-1');

      expect(updateRun).toHaveBeenCalled();
    });

    it('throws error if already at second preference', async () => {
        const mockProfile = { userId: 'user-1', currentPreferenceTracker: 2 };
        mockDb.select = vi.fn(() => ({
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            get: vi.fn(() => mockProfile)
        }));
  
        const service = new ChairsService(mockDb as DbType);
        await expect(service.deferDelegate('user-1')).rejects.toThrow('Delegate cannot be deferred further');
      });
  });
});
