import { drizzle } from 'drizzle-orm/libsql';
import { createClient, type Client } from '@libsql/client';
import * as schema from './schema';

let clientInstance: Client | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

export interface TursoConfig {
  url: string;
  authToken?: string;
}

export function initializeDb(config: TursoConfig) {
  if (clientInstance) {
    return dbInstance!;
  }

  clientInstance = createClient({
    url: config.url,
    authToken: config.authToken,
  });

  dbInstance = drizzle(clientInstance, { schema });
  return dbInstance;
}

export function getDb(): DbType {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initializeDb first.');
  }
  return dbInstance as DbType;
}

export type DbType = ReturnType<typeof drizzle<typeof schema>>;
