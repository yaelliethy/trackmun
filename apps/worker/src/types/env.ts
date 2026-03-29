export type Bindings = {
  // Turso Database
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
  // Cloudflare R2
  MEDIA: R2Bucket;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_ENDPOINT: string;
  // Better Auth
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  // Frontend
  FRONTEND_URL: string;
  // Impersonation
  IMPERSONATION_SECRET: string;
  /** When `"production"`, Better Auth uses secure cross-site cookies. */
  ENVIRONMENT?: string;
};
