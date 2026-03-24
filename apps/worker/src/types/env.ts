export type Bindings = {
  DB: D1Database;
  MEDIA: R2Bucket;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  FRONTEND_URL: string;
  IMPERSONATION_SECRET: string;
  /** When `"production"`, Better Auth uses secure cross-site cookies. */
  ENVIRONMENT?: string;
};
