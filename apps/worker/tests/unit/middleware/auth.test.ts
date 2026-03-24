import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withAuth } from '#src/middleware/auth';
import { AuthService } from '#src/services/auth/auth.service';
import * as dbClient from '#src/db/client';
import * as jwtLib from '#src/lib/verify-better-auth-jwt';

vi.mock('#src/db/client', () => ({
  getDb: vi.fn(),
}));

function b64urlSegment(obj: object): string {
  return btoa(JSON.stringify(obj))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function makeThreePartToken(payload: Record<string, unknown>): string {
  return `${b64urlSegment({ alg: 'EdDSA', typ: 'JWT' })}.${b64urlSegment(payload)}.sig`;
}

function createMockContext(
  authHeader: string | undefined,
  env: { IMPERSONATION_SECRET: string; BETTER_AUTH_URL: string }
) {
  const vars = new Map<string, unknown>();
  return {
    req: {
      header: vi.fn((name: string) =>
        name === 'Authorization' ? authHeader : undefined
      ),
    },
    env,
    get: (k: string) => vars.get(k),
    set: (k: string, v: unknown) => {
      vars.set(k, v);
    },
    vars,
    json: vi.fn((body: unknown, status?: number) => ({ body, status })),
  };
}

describe('withAuth', () => {
  const secret = 'impersonation-test-secret-32chars-min';
  const betterAuthUrl = 'https://auth.example.com';
  const getDb = vi.mocked(dbClient.getDb);

  beforeEach(() => {
    getDb.mockReset();
  });

  it('returns 401 when Authorization header is missing', async () => {
    const c = createMockContext(undefined, {
      IMPERSONATION_SECRET: secret,
      BETTER_AUTH_URL: betterAuthUrl,
    });
    const next = vi.fn();
    await withAuth(c as never, next);
    expect(next).not.toHaveBeenCalled();
    expect(c.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, code: 'UNAUTHORIZED' }),
      401
    );
  });

  it('returns 401 when Bearer format is invalid', async () => {
    const c = createMockContext('Basic xyz', {
      IMPERSONATION_SECRET: secret,
      BETTER_AUTH_URL: betterAuthUrl,
    });
    const next = vi.fn();
    await withAuth(c as never, next);
    expect(next).not.toHaveBeenCalled();
    expect(c.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'UNAUTHORIZED' }),
      401
    );
  });

  it('returns 401 when token is not three segments', async () => {
    const c = createMockContext('Bearer not-a-jwt', {
      IMPERSONATION_SECRET: secret,
      BETTER_AUTH_URL: betterAuthUrl,
    });
    const next = vi.fn();
    await withAuth(c as never, next);
    expect(next).not.toHaveBeenCalled();
    expect(c.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'UNAUTHORIZED' }),
      401
    );
  });

  it('accepts valid impersonation token and sets user + isImpersonating', async () => {
    const service = new AuthService({} as never);
    const token = await service.createImpersonationToken(
      {
        typ: 'impersonation',
        adminId: 'admin-1',
        actingAs: 'target-1',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        logId: 'log-1',
      },
      secret
    );

    const userRow = {
      id: 'target-1',
      email: 't@example.com',
      name: 'Target',
      role: 'chair',
      council: null,
      createdAt: 1,
    };
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue(userRow),
    };
    getDb.mockReturnValue({
      select: vi.fn(() => selectChain),
    } as never);

    const c = createMockContext(`Bearer ${token}`, {
      IMPERSONATION_SECRET: secret,
      BETTER_AUTH_URL: betterAuthUrl,
    });
    const next = vi.fn().mockResolvedValue(undefined);
    await withAuth(c as never, next);

    expect(next).toHaveBeenCalled();
    expect(c.vars.get('isImpersonating')).toBe(true);
    expect(c.vars.get('adminId')).toBe('admin-1');
    expect(c.vars.get('user')).toMatchObject({
      id: 'target-1',
      email: 't@example.com',
      role: 'chair',
    });
  });

  it('accepts Better Auth path when verify returns sub and user exists in D1', async () => {
    vi.spyOn(jwtLib, 'verifyBetterAuthAccessToken').mockResolvedValueOnce({
      sub: 'user-ba',
    });

    const userRow = {
      id: 'user-ba',
      email: 'ba@example.com',
      name: 'BA User',
      role: 'delegate',
      council: null,
      createdAt: 2,
    };
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue(userRow),
    };
    getDb.mockReturnValue({
      select: vi.fn(() => selectChain),
    } as never);

    const token = makeThreePartToken({ sub: 'user-ba' });
    const c = createMockContext(`Bearer ${token}`, {
      IMPERSONATION_SECRET: secret,
      BETTER_AUTH_URL: betterAuthUrl,
    });
    const next = vi.fn().mockResolvedValue(undefined);
    await withAuth(c as never, next);

    expect(jwtLib.verifyBetterAuthAccessToken).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
    expect(c.vars.get('isImpersonating')).toBe(false);
    expect(c.vars.get('user')).toMatchObject({ id: 'user-ba' });
  });

  it('returns 401 when Better Auth verifies but user is not in D1', async () => {
    vi.spyOn(jwtLib, 'verifyBetterAuthAccessToken').mockResolvedValueOnce({
      sub: 'ghost',
    });

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue(undefined),
    };
    getDb.mockReturnValue({
      select: vi.fn(() => selectChain),
    } as never);

    const token = makeThreePartToken({ sub: 'ghost' });
    const c = createMockContext(`Bearer ${token}`, {
      IMPERSONATION_SECRET: secret,
      BETTER_AUTH_URL: betterAuthUrl,
    });
    const next = vi.fn();
    await withAuth(c as never, next);

    expect(next).not.toHaveBeenCalled();
    expect(c.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'UNAUTHORIZED' }),
      401
    );
  });
});
