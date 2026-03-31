import { jwtVerify, createRemoteJWKSet } from 'jose';

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

function decodeJwtHeaderAlg(token: string): string | null {
  const parts = token.split('.');
  const header = base64UrlToJson<{ alg?: string }>(parts[0]);
  return header?.alg ?? null;
}

function tryDecodeBase64Secret(secret: string): Uint8Array | null {
  const trimmed = secret.trim();
  if (!/^[A-Za-z0-9+/]+=*$/.test(trimmed) || trimmed.length < 32) {
    return null;
  }
  try {
    const normalized = trimmed.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(normalized);
    return decoded.length >= 16 ? Uint8Array.from(decoded, (c) => c.charCodeAt(0)) : null;
  } catch {
    return null;
  }
}

async function verifyHs256(token: string, jwtSecret: string): Promise<Record<string, unknown> | null> {
  if (!jwtSecret?.trim()) return null;

  const trimmed = jwtSecret.trim();
  const keys: Uint8Array[] = [new TextEncoder().encode(trimmed)];
  const decoded = tryDecodeBase64Secret(trimmed);
  if (decoded) {
    const utf8 = keys[0];
    let same = utf8.length === decoded.length;
    if (same) {
      for (let i = 0; i < utf8.length; i++) {
        if (utf8[i] !== decoded[i]) {
          same = false;
          break;
        }
      }
    }
    if (!same) {
      keys.push(decoded);
    }
  }

  for (const key of keys) {
    try {
      const { payload } = await jwtVerify(token, key, {
        algorithms: ['HS256'],
      });
      return payload as Record<string, unknown>;
    } catch {
      // try next key material
    }
  }
  return null;
}

const jwksByBaseUrl = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getRemoteJwkSet(supabaseUrl: string): ReturnType<typeof createRemoteJWKSet> | null {
  const base = supabaseUrl.replace(/\/$/, '');
  if (!base) return null;
  let set = jwksByBaseUrl.get(base);
  if (!set) {
    set = createRemoteJWKSet(new URL(`${base}/auth/v1/.well-known/jwks.json`));
    jwksByBaseUrl.set(base, set);
  }
  return set;
}

async function verifyEs256Jwks(
  token: string,
  supabaseUrl: string
): Promise<Record<string, unknown> | null> {
  const jwks = getRemoteJwkSet(supabaseUrl);
  if (!jwks) return null;
  try {
    const { payload } = await jwtVerify(token, jwks);
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Verify Supabase access tokens.
 *
 * 1. **HS256** — legacy / symmetric JWT secret (Settings → API → JWT Secret).
 * 2. **ES256 (JWKS)** — newer Supabase projects; verified via `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`.
 *
 * Both paths are tried so local (HS256) and hosted (often ES256) behave the same.
 */
export async function verifySupabaseJwt(
  token: string,
  jwtSecret: string,
  supabaseUrl: string
): Promise<Record<string, unknown> | null> {
  const alg = decodeJwtHeaderAlg(token);

  if (alg === 'HS256') {
    const p = await verifyHs256(token, jwtSecret);
    if (p) return p;
  }

  if (alg === 'ES256' || alg === 'RS256') {
    const p = await verifyEs256Jwks(token, supabaseUrl);
    if (p) return p;
  }

  // Unknown or missing alg header: try HS256 and JWKS in parallel (same wall time as slower branch only)
  const [hs, es] = await Promise.all([
    verifyHs256(token, jwtSecret),
    verifyEs256Jwks(token, supabaseUrl),
  ]);
  if (hs) return hs;
  if (es) return es;

  console.error('Supabase JWT verification failed (tried HS256 and JWKS)');
  return null;
}
