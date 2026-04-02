import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import type { Config } from 'drizzle-kit';

/** Matches `docker-compose.yml` sqld port on the host when pushing from your machine. */
const DEFAULT_LOCAL_SQLD_URL = 'http://127.0.0.1:8080';
const DEFAULT_LOCAL_AUTH_TOKEN = 'placeholder';

loadEnv({ path: resolve(process.cwd(), '.dev.vars') });

export default {
  schema: './functions/api/db/schema.ts',
  out: './migrations',
  driver: 'libsql',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL ?? DEFAULT_LOCAL_SQLD_URL,
    authToken: process.env.TURSO_AUTH_TOKEN ?? DEFAULT_LOCAL_AUTH_TOKEN,
  },
  dialect: 'sqlite',
} satisfies Config;
