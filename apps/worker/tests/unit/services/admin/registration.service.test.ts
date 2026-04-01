import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  COUNCIL_PREFERENCE_ALREADY_EXISTS,
  RegistrationService,
} from '#src/services/admin/registration.service';
import type { DbType } from '#src/db/client';

describe('RegistrationService council preference uniqueness', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Drizzle chain mocks
  let mockDb: any;
  let selectAll: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    selectAll = vi.fn();
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      all: selectAll,
    };
    mockDb = {
      select: vi.fn(() => selectChain),
      insert: vi.fn(() => ({
        values: vi.fn().mockReturnThis(),
        onConflictDoUpdate: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue(undefined),
      })),
      update: vi.fn(() => ({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue(undefined),
      })),
      delete: vi.fn(() => ({
        where: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue(undefined),
      })),
    };
  });

  it('createQuestion rejects second council_preference', async () => {
    selectAll.mockResolvedValue([{ id: 'existing-q' }]);
    const service = new RegistrationService(mockDb as DbType);

    await expect(
      service.createQuestion({
        stepId: 's1',
        label: 'Prefs',
        type: 'council_preference',
        options: null,
        required: true,
        displayOrder: 0,
        councilPreferenceCount: 2,
      })
    ).rejects.toThrow(COUNCIL_PREFERENCE_ALREADY_EXISTS);
  });

  it('createQuestion allows council_preference when none exist', async () => {
    selectAll.mockResolvedValue([]);
    const insertRun = vi.fn().mockResolvedValue(undefined);
    mockDb.insert = vi.fn(() => ({
      values: vi.fn().mockReturnThis(),
      run: insertRun,
    }));

    const service = new RegistrationService(mockDb as DbType);
    const result = await service.createQuestion({
      stepId: 's1',
      label: 'Prefs',
      type: 'council_preference',
      options: null,
      required: true,
      displayOrder: 0,
      councilPreferenceCount: 1,
    });

    expect(result.type).toBe('council_preference');
    expect(insertRun).toHaveBeenCalled();
  });

  it('updateQuestion rejects changing type to council_preference when another exists', async () => {
    selectAll.mockResolvedValue([
      { id: 'other' },
      { id: 'editing' },
    ]);
    const service = new RegistrationService(mockDb as DbType);

    await expect(
      service.updateQuestion('editing', { type: 'council_preference' })
    ).rejects.toThrow(COUNCIL_PREFERENCE_ALREADY_EXISTS);
  });

  it('updateQuestion allows council_preference when only this row would be', async () => {
    selectAll.mockResolvedValue([{ id: 'editing' }]);
    const updateRun = vi.fn().mockResolvedValue(undefined);
    mockDb.update = vi.fn(() => ({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      run: updateRun,
    }));

    const service = new RegistrationService(mockDb as DbType);
    await service.updateQuestion('editing', { type: 'council_preference' });

    expect(updateRun).toHaveBeenCalled();
  });
});
