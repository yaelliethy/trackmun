import { drizzle } from 'drizzle-orm/libsql';
import { createClient, type Client, type InStatement } from '@libsql/client';
import * as schema from './schema';

let clientInstance: Client | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

export interface TursoConfig {
  url: string;
  authToken?: string;
}

function wrapClient(client: Client): Client {
  const originalExecute = client.execute.bind(client);
  client.execute = async (stmt: InStatement) => {
    const start = Date.now();
    try {
      const result = await originalExecute(stmt);
      const duration = Date.now() - start;
      const sql = typeof stmt === 'string' ? stmt : stmt.sql;
      // Truncate long SQL for cleaner logs
      const summarizedSql = sql.length > 100 ? `${sql.substring(0, 100)}...` : sql;
      console.log(`[DB Query] ${duration}ms: ${summarizedSql}`);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.error(`[DB Query Error] ${duration}ms: ${error}`);
      throw error;
    }
  };

  const originalBatch = client.batch.bind(client);
  client.batch = async (stmts: InStatement[], mode?: "read" | "write") => {
    const start = Date.now();
    try {
      const result = await originalBatch(stmts, mode);
      const duration = Date.now() - start;
      console.log(`[DB Batch] ${duration}ms (${stmts.length} statements)`);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.error(`[DB Batch Error] ${duration}ms: ${error}`);
      throw error;
    }
  };

  return client;
}

export function initializeDb(config: TursoConfig) {
  if (dbInstance) {
    return dbInstance;
  }

  // For Docker local networking, replace localhost with the service name
  const finalUrl = config.url.includes('localhost') && config.url.includes('8080')
    ? config.url.replace('localhost', 'trackmun-sqld')
    : config.url;

  if (!finalUrl) {
    throw new Error('TURSO_DATABASE_URL is missing in environment variables.');
  }

  try {
    console.log(`[Cold Start] Initializing database with URL: ${finalUrl}`);
    
    let rawClient = createClient({
      url: finalUrl,
      authToken: config.authToken,
    });

    clientInstance = wrapClient(rawClient);
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

/** Underlying libSQL client (e.g. for `batch()` single round-trip). */
export function getLibsqlClient(): Client {
  if (!clientInstance) {
    throw new Error('Database not initialized. Call initializeDb first.');
  }
  return clientInstance;
}

export type { InStatement };

export type DbType = ReturnType<typeof drizzle<typeof schema>>;
