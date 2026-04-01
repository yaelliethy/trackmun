import { createClient } from '@supabase/supabase-js';
import { Bindings } from '../types/env';
import { getClaims as getClaimsInternal } from './verify-supabase-jwt';

/**
 * Custom Supabase-like helper for TrackMUN Worker.
 * Provides the `getClaims` method as requested while using the 
 * lightning-fast KV-cached ECC verification logic.
 */
export const getSupabase = (env: Bindings) => {
  const client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });

  // Inject getClaims helper as requested
  return {
    ...client,
    auth: {
      ...client.auth,
      getClaims: (token: string) => getClaimsInternal(token, env.JWKS_KV, env.SUPABASE_URL)
    }
  };
};
