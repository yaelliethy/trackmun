import { describe, it, expect } from 'vitest';
import { requireRole } from './rbac';
import { Context } from 'hono';

describe('requireRole Middleware', () => {
  it('should call next() if user has the required role', async () => {
    let nextCalled = false;
    const next = async () => { nextCalled = true; };
    
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

  it('should return 403 if user does not have the required role', async () => {
    let nextCalled = false;
    const next = async () => { nextCalled = true; };
    
    let statusCode = 0;
    const mockContext = {
      get: (key: string) => {
        if (key === 'user') return { role: 'delegate' };
        return null;
      },
      json: (data: any, status: number) => {
        statusCode = status;
        return data;
      },
    } as unknown as Context;

    const middleware = requireRole('admin');
    await middleware(mockContext, next);
    
    expect(nextCalled).toBe(false);
    expect(statusCode).toBe(403);
  });

  it('should return 401 if user is not authenticated', async () => {
    let nextCalled = false;
    const next = async () => { nextCalled = true; };
    
    let statusCode = 0;
    const mockContext = {
      get: (key: string) => null,
      json: (data: any, status: number) => {
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
