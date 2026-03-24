import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import {
  decodeJwtPayloadJson,
  verifyBetterAuthAccessToken,
} from '#src/lib/verify-better-auth-jwt';
import type { DbType } from '#src/db/client';

const ISSUER = 'https://auth.example.com';
const ISSUER_WITH_SLASH = 'https://auth.example.com/';

function mockDbWithJwksRow(row: { id: string; publicKey: string } | undefined) {
  const get = vi.fn().mockResolvedValue(row);
  return {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ get })),
      })),
    })),
  } as unknown as DbType;
}

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

describe('verifyBetterAuthAccessToken', () => {
  let kid: string;
  let publicJwkString: string;
  let privateKey: CryptoKey;

  beforeEach(async () => {
    kid = crypto.randomUUID();
    const { publicKey, privateKey: priv } = await generateKeyPair('EdDSA', {
      crv: 'Ed25519',
    });
    privateKey = priv;
    const jwk = { ...(await exportJWK(publicKey)), kid };
    publicJwkString = JSON.stringify(jwk);
  });

  it('returns null when header has no kid', async () => {
    const b64url = (obj: object) =>
      btoa(JSON.stringify(obj))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    const token = `${b64url({ alg: 'EdDSA', typ: 'JWT' })}.${b64url({ sub: 'u1' })}.sig`;
    const db = mockDbWithJwksRow({ id: kid, publicKey: publicJwkString });
    await expect(
      verifyBetterAuthAccessToken(token, db, ISSUER, ISSUER)
    ).resolves.toBeNull();
  });

  it('returns null when jwks row is missing', async () => {
    const token = await new SignJWT({ sub: 'u1' })
      .setProtectedHeader({ alg: 'EdDSA', kid })
      .setIssuer(ISSUER)
      .setAudience(ISSUER)
      .setExpirationTime('1h')
      .sign(privateKey);
    const db = mockDbWithJwksRow(undefined);
    await expect(
      verifyBetterAuthAccessToken(token, db, ISSUER, ISSUER)
    ).resolves.toBeNull();
  });

  it('returns null when publicKey JSON is invalid', async () => {
    const token = await new SignJWT({ sub: 'u1' })
      .setProtectedHeader({ alg: 'EdDSA', kid })
      .setIssuer(ISSUER)
      .setAudience(ISSUER)
      .setExpirationTime('1h')
      .sign(privateKey);
    const db = mockDbWithJwksRow({ id: kid, publicKey: 'not-json' });
    await expect(
      verifyBetterAuthAccessToken(token, db, ISSUER, ISSUER)
    ).resolves.toBeNull();
  });

  it('returns null when signature or iss/aud is wrong', async () => {
    const token = await new SignJWT({ sub: 'u1' })
      .setProtectedHeader({ alg: 'EdDSA', kid })
      .setIssuer(ISSUER)
      .setAudience(ISSUER)
      .setExpirationTime('1h')
      .sign(privateKey);
    const db = mockDbWithJwksRow({ id: kid, publicKey: publicJwkString });
    const parts = token.split('.');
    parts[2] = parts[2] === 'abc' ? 'def' : 'abc';
    const tampered = parts.join('.');
    await expect(
      verifyBetterAuthAccessToken(tampered, db, ISSUER, ISSUER)
    ).resolves.toBeNull();
    await expect(
      verifyBetterAuthAccessToken(token, db, 'https://evil.example', ISSUER)
    ).resolves.toBeNull();
    await expect(
      verifyBetterAuthAccessToken(token, db, ISSUER, 'https://wrong-aud.example')
    ).resolves.toBeNull();
  });

  it('returns payload when valid and normalizes issuer trailing slash', async () => {
    const token = await new SignJWT({ sub: 'user-xyz', role: 'delegate' })
      .setProtectedHeader({ alg: 'EdDSA', kid })
      .setIssuer(ISSUER)
      .setAudience(ISSUER)
      .setExpirationTime('1h')
      .sign(privateKey);
    const db = mockDbWithJwksRow({ id: kid, publicKey: publicJwkString });
    const payload = await verifyBetterAuthAccessToken(
      token,
      db,
      ISSUER_WITH_SLASH,
      ISSUER_WITH_SLASH
    );
    expect(payload).not.toBeNull();
    expect(payload?.sub).toBe('user-xyz');
    expect(payload?.role).toBe('delegate');
  });
});
