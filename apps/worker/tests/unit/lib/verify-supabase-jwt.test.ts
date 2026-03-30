import { describe, it, expect } from 'vitest';
import { SignJWT } from 'jose';
import {
  decodeJwtPayloadJson,
  verifySupabaseJwt,
} from '#src/lib/verify-supabase-jwt';

const SECRET = 'test-jwt-secret-at-least-32-chars-long';
const ENCODED_SECRET = new TextEncoder().encode(SECRET);
/** Unused for HS256 tests; invalid host so JWKS fallback fails fast if reached */
const DUMMY_SUPABASE_URL = 'http://127.0.0.1:1';

describe('decodeJwtPayloadJson', () => {
  it('returns null for missing middle segment', () => {
    expect(decodeJwtPayloadJson('only.one')).toBeNull();
    expect(decodeJwtPayloadJson('')).toBeNull();
  });

  it('returns null for invalid base64 payload', () => {
    expect(decodeJwtPayloadJson('a.b!!!.c')).toBeNull();
  });

  it('parses well-formed JWT payload segment', () => {
    const payload = { sub: 'user-1', typ: 'access' };
    const encoded = btoa(JSON.stringify(payload))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    const token = `hdr.${encoded}.sig`;
    expect(decodeJwtPayloadJson(token)).toEqual(payload);
  });
});

describe('verifySupabaseJwt', () => {
  it('returns null when signature is wrong', async () => {
    const token = await new SignJWT({ sub: 'u1' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(ENCODED_SECRET);
    
    const tampered = token.substring(0, token.length - 5) + 'abcde';
    await expect(
      verifySupabaseJwt(tampered, SECRET, DUMMY_SUPABASE_URL)
    ).resolves.toBeNull();
  });

  it('returns null when secret is wrong', async () => {
    const token = await new SignJWT({ sub: 'u1' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(ENCODED_SECRET);
    
    await expect(
      verifySupabaseJwt(token, 'wrong-secret-at-least-32-chars-long', DUMMY_SUPABASE_URL)
    ).resolves.toBeNull();
  });

  it('returns payload when valid', async () => {
    const payload = { sub: 'user-xyz', role: 'delegate' };
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(ENCODED_SECRET);
    
    const verified = await verifySupabaseJwt(token, SECRET, DUMMY_SUPABASE_URL);
    expect(verified).not.toBeNull();
    expect(verified?.sub).toBe('user-xyz');
    expect(verified?.role).toBe('delegate');
  });
});
