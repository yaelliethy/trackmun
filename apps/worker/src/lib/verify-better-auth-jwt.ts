import { importJWK, jwtVerify } from 'jose';
import { eq } from 'drizzle-orm';
import type { DbType } from '../db/client';
import { jwkss } from '../db/schema';

function base64UrlToJson<T>(segment: string | undefined): T | null {
  if (!segment) return null;
  try {
    const pad = segment.length % 4 === 0 ? '' : '='.repeat(4 - (segment.length % 4));
    const b64 = segment.replace(/-/g, '+').replace(/_/g, '/') + pad;
    return JSON.parse(atob(b64)) as T;
  } catch {
    return null;
  }
}

export function decodeJwtPayloadJson(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  return base64UrlToJson<Record<string, unknown>>(parts[1]);
}

function decodeJwtHeaderSegment(token: string): { kid?: string; alg?: string } | null {
  const parts = token.split('.');
  return base64UrlToJson<{ kid?: string; alg?: string }>(parts[0]);
}

/**
 * better-auth JWT plugin signs access tokens with EdDSA (JWKS in D1), not HMAC with BETTER_AUTH_SECRET.
 */
export async function verifyBetterAuthAccessToken(
  token: string,
  db: DbType,
  issuer: string,
  audience: string
): Promise<Record<string, unknown> | null> {
  const header = decodeJwtHeaderSegment(token);
  if (!header?.kid) return null;

  const row = await db.select().from(jwkss).where(eq(jwkss.id, header.kid)).get();
  if (!row) return null;

  const alg = header.alg ?? 'EdDSA';
  let publicKey: CryptoKey;
  try {
    const key = await importJWK(JSON.parse(row.publicKey), alg);
    if (key instanceof Uint8Array) return null;
    publicKey = key;
  } catch {
    return null;
  }

  const normalizedIssuer = issuer.replace(/\/$/, '');
  const normalizedAudience = audience.replace(/\/$/, '');

  try {
    const { payload } = await jwtVerify(token, publicKey, {
      issuer: normalizedIssuer,
      audience: normalizedAudience,
    });
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}
