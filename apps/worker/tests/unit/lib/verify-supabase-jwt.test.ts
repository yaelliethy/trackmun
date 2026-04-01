import { describe, it, expect, vi, beforeEach } from 'vitest';
import { decodeJwtPayloadJson, verifySupabaseJwt } from '#src/lib/verify-supabase-jwt';

// Helper to create an ES256 JWT for testing
async function createEs256Token(payload: any, kid: string, privateKey: CryptoKey): Promise<string> {
  const header = { alg: 'ES256', typ: 'JWT', kid };
  const encodedHeader = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const data = `${encodedHeader}.${encodedPayload}`;

  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    privateKey,
    encoder.encode(data)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${data}.${encodedSignature}`;
}

describe('verify-supabase-jwt', () => {
  const SUPABASE_URL = 'https://example.supabase.co';
  let mockKV: any;
  let keyPair: CryptoKeyPair;

  beforeEach(async () => {
    mockKV = {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    keyPair = (await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify']
    )) as CryptoKeyPair;
  });

  describe('decodeJwtPayloadJson', () => {
    it('decodes a valid JWT payload', () => {
      const payload = { sub: '123', email: 'test@example.com' };
      const token = `header.${btoa(JSON.stringify(payload)).replace(/=/g, '')}.signature`;
      expect(decodeJwtPayloadJson(token)).toEqual(payload);
    });

    it('returns null for invalid payload', () => {
      expect(decodeJwtPayloadJson('a.invalid-base64.c')).toBeNull();
    });
  });

  describe('verifySupabaseJwt', () => {
    it('verifies a valid ES256 token with KV hit', async () => {
      const kid = 'test-kid';
      const payload = { sub: 'user-123', exp: Math.floor(Date.now() / 1000) + 3600 };
      const token = await createEs256Token(payload, kid, keyPair.privateKey);
      
      const jwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
      const jwks = { keys: [{ ...jwk, kid, alg: 'ES256', use: 'sig' }] };

      mockKV.get.mockResolvedValue(jwks);

      const result = await verifySupabaseJwt(token, mockKV, SUPABASE_URL);
      expect(result).toEqual(payload);
      expect(mockKV.get).toHaveBeenCalled();
    });

    it('verifies a valid ES256 token with KV miss (fetch)', async () => {
      const kid = 'test-kid';
      const payload = { sub: 'user-123', exp: Math.floor(Date.now() / 1000) + 3600 };
      const token = await createEs256Token(payload, kid, keyPair.privateKey);
      
      const jwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
      const jwks = { keys: [{ ...jwk, kid, alg: 'ES256', use: 'sig' }] };

      mockKV.get.mockResolvedValue(null);
      
      // Mock global fetch
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => jwks
      }));

      const result = await verifySupabaseJwt(token, mockKV, SUPABASE_URL);
      expect(result).toEqual(payload);
      expect(mockKV.put).toHaveBeenCalled();
      
      vi.unstubAllGlobals();
    });

    it('returns null for expired tokens', async () => {
      const kid = 'test-kid';
      const payload = { sub: 'user-123', exp: Math.floor(Date.now() / 1000) - 3600 };
      const token = await createEs256Token(payload, kid, keyPair.privateKey);
      
      const jwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
      const jwks = { keys: [{ ...jwk, kid, alg: 'ES256', use: 'sig' }] };

      mockKV.get.mockResolvedValue(jwks);

      const result = await verifySupabaseJwt(token, mockKV, SUPABASE_URL);
      expect(result).toBeNull();
    });

    it('returns null for invalid signatures', async () => {
      const kid = 'test-kid';
      const payload = { sub: 'user-123', exp: Math.floor(Date.now() / 1000) + 3600 };
      const token = await createEs256Token(payload, kid, keyPair.privateKey);
      const tamperedToken = token.substring(0, token.length - 10) + 'invalidabc';
      
      const jwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
      const jwks = { keys: [{ ...jwk, kid, alg: 'ES256', use: 'sig' }] };

      mockKV.get.mockResolvedValue(jwks);

      const result = await verifySupabaseJwt(tamperedToken, mockKV, SUPABASE_URL);
      expect(result).toBeNull();
    });
  });
});
