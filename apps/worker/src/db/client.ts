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

  // For Docker local networking, replace localhost with the service name
  const finalUrl = config.url.includes('localhost') && config.url.includes('8080')
    ? config.url.replace('localhost', 'trackmun-sqld')
    : config.url;

  console.log(`Initializing database with URL: ${finalUrl}`);

  if (!finalUrl) {
    throw new Error('TURSO_DATABASE_URL is missing in environment variables.');
  }

  try {
    clientInstance = createClient({
      url: finalUrl,
      authToken: config.authToken,
    });

    dbInstance = drizzle(clientInstance, { schema });
    return dbInstance;
  } catch (error: any) {
    console.error(`Failed to initialize LibSQL client with URL: ${config.url}`);
    throw error;
  }
}

export function getDb(): DbType {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initializeDb first.');
  }
  return dbInstance as DbType;
}

export type DbType = ReturnType<typeof drizzle<typeof schema>>;
