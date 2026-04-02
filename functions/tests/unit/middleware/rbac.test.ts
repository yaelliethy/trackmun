import { describe, it, expect, vi } from 'vitest';
import { requireRole } from '#src/middleware/rbac';
import type { Context } from 'hono';

describe('requireRole Middleware', () => {
  it('calls next() when user has the required role', async () => {
    let nextCalled = false;
    const next = async () => {
      nextCalled = true;
    };

    const mockContext = {
      get: (key: string) => {
        if (key === 'user') return { role: 'admin' };
        return null;
      },
      json: () => {},
    } as unknown as Context;

    const middleware = requireRole('admin');
    await middleware(mockContext, next);

    expect(nextCalled).toBe(true);
  });

  it('returns 403 when user does not have the required role', async () => {
    let nextCalled = false;
    const next = async () => {
      nextCalled = true;
    };

    let statusCode = 0;
    const mockContext = {
      get: (key: string) => {
        if (key === 'user') return { role: 'delegate' };
        return null;
      },
      json: (data: unknown, status: number) => {
        statusCode = status;
        return data;
      },
    } as unknown as Context;

    const middleware = requireRole('admin');
    await middleware(mockContext, next);

    expect(nextCalled).toBe(false);
    expect(statusCode).toBe(403);
  });

  it('returns 401 when user is not authenticated', async () => {
    let nextCalled = false;
    const next = async () => {
      nextCalled = true;
    };

    let statusCode = 0;
    const mockContext = {
      get: vi.fn().mockReturnValue(null),
      json: (data: unknown, status: number) => {
        statusCode = status;
        return data;
      },
    } as unknown as Context;

    const middleware = requireRole('admin');
    await middleware(mockContext, next);

    expect(nextCalled).toBe(false);
    expect(statusCode).toBe(401);
  });
});
