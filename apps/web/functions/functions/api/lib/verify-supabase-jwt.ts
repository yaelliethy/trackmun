/**
 * Supabase JWT Verification with KV Caching for JWKS
 *
 * This implementation uses native Web Crypto (SubtleCrypto) to verify ES256 (P-256)
 * tokens from Supabase, caching the public key in Cloudflare KV to avoid
 * frequent network calls to the JWKS endpoint.
 */

export interface JWK {
  kty: string;
  ext?: boolean;
  key_ops?: string[];
  alg?: string;
  kid?: string;
  crv?: string;
  x?: string;
  y?: string;
  use?: string;
}

export interface JWKS {
  keys: JWK[];
}

function base64UrlDecode(str: string): Uint8Array {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

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

function decodeJwtHeader(token: string): { alg?: string; kid?: string } | null {
  const parts = token.split('.');
  return base64UrlToJson<{ alg?: string; kid?: string }>(parts[0]);
}

/**
 * Fetch and cache JWKS from Supabase
 */
async function getSupabasePublicKeys(
  supabaseUrl: string,
  kv: KVNamespace
): Promise<Map<string, CryptoKey>> {
  const cacheKey = `jwks:${supabaseUrl}`;
  let jwks: JWKS | null = null;

  // 1. Try KV cache
  try {
    const cached = await kv.get(cacheKey, 'json');
    if (cached) {
      jwks = cached as JWKS;
    }
  } catch (e) {
    console.error('KV GET failed:', e);
  }

  if (!jwks) {
    // 2. Fetch from Supabase
    const url = `${supabaseUrl.replace(/\/$/, '')}/auth/v1/.well-known/jwks.json`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch JWKS from ${url}`);
    }
    jwks = (await response.json()) as JWKS;

    // 3. Cache in KV for 1 hour
    try {
      await kv.put(cacheKey, JSON.stringify(jwks), { expirationTtl: 3600 });
    } catch (e) {
      console.error('KV PUT failed:', e);
      // Non-fatal, just means no caching for this request
    }
  }

  const keys = new Map<string, CryptoKey>();
  for (const key of jwks.keys) {
    if (key.kty === 'EC' && key.crv === 'P-256' && key.x && key.y && key.kid) {
      const cryptoKey = await crypto.subtle.importKey(
        'jwk',
        key,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['verify']
      );
      keys.set(key.kid, cryptoKey);
    }
  }

  return keys;
}

/**
 * Verify a JWT using ECDSA ES256 (P-256)
 */
export async function verifySupabaseJwt(
  token: string,
  kv: KVNamespace,
  supabaseUrl: string
): Promise<Record<string, unknown> | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const header = decodeJwtHeader(token);
  const alg = header?.alg;
  console.log(`Verifying JWT with algorithm: ${alg}, kid: ${header?.kid}`);

  if (!header || header.alg !== 'ES256' || !header.kid) {
    // If not ES256, maybe it's HS256 (not supported here anymore for access tokens)
    return null;
  }

  const startTime = performance.now();
  try {
    const publicKeys = await getSupabasePublicKeys(supabaseUrl, kv);
    const publicKey = publicKeys.get(header.kid);

    if (!publicKey) {
      // Key ID not found, maybe JWKS is stale? Clear KV cache for next time
      try {
        await kv.delete(`jwks:${supabaseUrl}`);
      } catch (e) {
        console.error('KV DELETE failed:', e);
      }
      return null;
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(`${parts[0]}.${parts[1]}`);
    const signature = base64UrlDecode(parts[2]);

    const isValid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: { name: 'SHA-256' } },
      publicKey,
      signature,
      data
    );

    const duration = (performance.now() - startTime).toFixed(2);
    console.log(`[Auth] JWT verified in ${duration}ms (alg: ${alg})`);

    if (isValid) {
      const payload = decodeJwtPayloadJson(token);
      
      // Check expiration
      if (payload && typeof payload.exp === 'number') {
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp < now) return null;
      }
      
      return payload;
    }
  } catch (err) {
    console.error('JWT verification error:', err);
  }

  return null;
}

/** 
 * Alias for getClaims to match user request pattern
 */
export const getClaims = async (token: string, kv: KVNamespace, url: string) => {
  const payload = await verifySupabaseJwt(token, kv, url);
  return { data: payload, error: payload ? null : new Error('Invalid or missing claims') };
};
