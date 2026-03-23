import { VerifyFirebaseAuthEnv } from '@hono/firebase-auth';

export type Bindings = VerifyFirebaseAuthEnv & {
  DB: D1Database;
  MEDIA: R2Bucket;
  FIREBASE_PROJECT_ID: string;
  IMPERSONATION_SECRET: string;
  PUBLIC_JWK_CACHE_KEY: string;
  PUBLIC_JWK_CACHE_KV: KVNamespace;
};
