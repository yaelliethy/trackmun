import { drizzle } from 'drizzle-orm/d1';
import type { D1Database } from '@cloudflare/workers-types';
import * as schema from './schema';

let dbInstance: ReturnType<typeof drizzle> | null = null;

export function initializeDb(d1: D1Database) {
  dbInstance = drizzle(d1, { schema });
  return dbInstance;
}

export function getDb(): DbType {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initializeDb first.');
  }
  return dbInstance as DbType;
}

export type DbType = ReturnType<typeof drizzle<typeof schema>>;
