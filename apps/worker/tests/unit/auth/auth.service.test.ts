import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '#src/services/auth/auth.service';
import type { DbType } from '#src/db/client';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function verifyHmacJwt(token: string, secret: string): Promise<boolean> {
  const [header, payload, signature] = token.split('.');
  const data = `${header}.${payload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const normalizedSig = signature.replace(/-/g, '+').replace(/_/g, '/');
  const sigBuf = Uint8Array.from(atob(normalizedSig), (c) => c.charCodeAt(0));
  return crypto.subtle.verify('HMAC', key, sigBuf, encoder.encode(data));
}

function createSelectChain(result: unknown) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue(result),
    all: vi.fn().mockResolvedValue([]),
  };
}

describe('AuthService', () => {
  let selectChain: ReturnType<typeof createSelectChain>;
  let insertRun: ReturnType<typeof vi.fn>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Drizzle chain mocks
  let mockDb: any;

  beforeEach(() => {
    selectChain = createSelectChain(undefined);
    insertRun = vi.fn().mockResolvedValue(undefined);
    mockDb = {
      select: vi.fn(() => selectChain),
      insert: vi.fn(() => ({
        values: vi.fn(() => ({ run: insertRun })),
      })),
    };
  });

  describe('getUserById', () => {
    it('returns null when no row', async () => {
      selectChain.get.mockResolvedValue(undefined);
      const service = new AuthService(mockDb as DbType);
      await expect(service.getUserById('missing')).resolves.toBeNull();
    });

    it('maps row to User', async () => {
      const createdAt = new Date('2025-01-01T00:00:00.000Z');
      selectChain.get.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        name: 'Alice',
        role: 'chair',
        council: 'UNSC',
        createdAt,
      });
      const service = new AuthService(mockDb as DbType);
      const user = await service.getUserById('u1');
      expect(user).toEqual({
        id: 'u1',
        email: 'a@b.com',
        name: 'Alice',
        role: 'chair',
        council: 'UNSC',
        created_at: createdAt.getTime(),
      });
    });

    it('omits council when null', async () => {
      selectChain.get.mockResolvedValue({
        id: 'u2',
        email: 'b@b.com',
        name: 'Bob',
        role: 'delegate',
        council: null,
        createdAt: 0,
      });
      const service = new AuthService(mockDb as DbType);
      const user = await service.getUserById('u2');
      expect(user?.council).toBeUndefined();
    });
  });

  describe('logImpersonation', () => {
    it('inserts log row and returns a UUID', async () => {
      const service = new AuthService(mockDb as DbType);
      const logId = await service.logImpersonation('admin-1', 'target-1');
      expect(logId).toMatch(UUID_RE);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(insertRun).toHaveBeenCalled();
      const valuesCall = mockDb.insert.mock.results[0]?.value.values.mock.calls[0]?.[0];
      expect(valuesCall).toMatchObject({
        adminId: 'admin-1',
        targetId: 'target-1',
      });
      expect(typeof valuesCall.startedAt).toBe('number');
    });
  });

  describe('createImpersonationToken', () => {
    it('produces an HMAC JWT verifiable with the same secret', async () => {
      const service = new AuthService(mockDb as DbType);
      const secret = 'test-impersonation-secret-at-least-32-chars!!';
      const payload = {
        typ: 'impersonation',
        adminId: 'admin-1',
        actingAs: 'target-1',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        logId: 'log-1',
      };
      const token = await service.createImpersonationToken(payload, secret);
      expect(token.split('.')).toHaveLength(3);
      await expect(verifyHmacJwt(token, secret)).resolves.toBe(true);
      await expect(verifyHmacJwt(token, 'wrong-secret')).resolves.toBe(false);
    });
  });
});
