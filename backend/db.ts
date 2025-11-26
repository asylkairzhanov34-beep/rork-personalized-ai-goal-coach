import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

console.log('[DB] ========== Database Module Loading ==========');

let client: ReturnType<typeof postgres> | null = null;
let dbInstance: PostgresJsDatabase<typeof schema> | null = null;
let initError: string | null = null;
let initialized = false;

function initializeDb() {
  if (initialized) {
    console.log('[DB] Already initialized, skipping');
    return;
  }
  initialized = true;

  const connectionString = process.env.DATABASE_URL;

  console.log('[DB] DATABASE_URL exists:', !!connectionString);

  if (!connectionString) {
    console.warn('[DB] No DATABASE_URL - database features disabled');
    initError = 'DATABASE_URL not configured';
    return;
  }

  const maskedUrl = connectionString.replace(/:[^:@]+@/, ':***@');
  console.log('[DB] Connection string (masked):', maskedUrl);

  try {
    client = postgres(connectionString, {
      prepare: false,
      ssl: 'require',
      connect_timeout: 30,
      idle_timeout: 20,
      max_lifetime: 60 * 30,
      max: 10,
    });

    dbInstance = drizzle(client, { schema });
    initError = null;
    console.log('[DB] Postgres client created successfully');
  } catch (error) {
    console.error('[DB] Failed to create postgres client:', error);
    initError = error instanceof Error ? error.message : 'Unknown error';
    client = null;
    dbInstance = null;
  }
}

initializeDb();

export const db: PostgresJsDatabase<typeof schema> | null = dbInstance;
export const isDbReady = !!dbInstance;

let connectionTested = false;
let connectionOk = false;

export async function testConnection(): Promise<boolean> {
  if (!client) {
    console.log('[DB] No client available for test');
    return false;
  }

  if (connectionTested) {
    console.log('[DB] Using cached connection test result:', connectionOk);
    return connectionOk;
  }

  try {
    console.log('[DB] Testing connection...');
    await client`SELECT 1 as test`;
    connectionOk = true;
    connectionTested = true;
    console.log('[DB] Connection test: SUCCESS');
    return true;
  } catch (error) {
    console.error('[DB] Connection test failed:', error);
    connectionOk = false;
    connectionTested = true;
    initError = error instanceof Error ? error.message : 'Connection test failed';
    return false;
  }
}

export function getDbStatus(): {
  ready: boolean;
  error: string | null;
  hasUrl: boolean;
  connectionTested: boolean;
  connectionOk: boolean;
} {
  return {
    ready: !!dbInstance,
    error: initError,
    hasUrl: !!process.env.DATABASE_URL,
    connectionTested,
    connectionOk,
  };
}

console.log('[DB] Module loaded, ready:', isDbReady);
console.log('[DB] ========== Database Module Ready ==========');
