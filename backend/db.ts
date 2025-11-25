import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

let client: ReturnType<typeof postgres> | null = null;
let dbInstance: PostgresJsDatabase<typeof schema> | null = null;
let initError: string | null = null;
let initialized = false;

function initializeDb() {
  if (initialized) return;
  initialized = true;

  const connectionString = process.env.DATABASE_URL;

  console.log('[DB] Initializing database connection...');
  console.log('[DB] DATABASE_URL exists:', !!connectionString);
  
  if (connectionString) {
    const maskedUrl = connectionString.replace(/:[^:@]+@/, ':***@');
    console.log('[DB] Connection string (masked):', maskedUrl);
  }

  if (!connectionString) {
    console.warn('[DB] No DATABASE_URL found - database features will be disabled');
    initError = 'DATABASE_URL not configured';
    return;
  }

  try {
    client = postgres(connectionString, { 
      prepare: false,
      connect_timeout: 10,
      idle_timeout: 20,
      max_lifetime: 60 * 30,
      ssl: 'require',
    });
    dbInstance = drizzle(client, { schema });
    console.log('[DB] Postgres client created successfully');
  } catch (error) {
    console.error('[DB] Failed to create postgres client:', error);
    initError = error instanceof Error ? error.message : 'Unknown error';
    client = null;
    dbInstance = null;
  }
}

// Initialize on first access
initializeDb();

export const db = dbInstance;
export const isDbReady = !!dbInstance;

export function getDbStatus(): { ready: boolean; error: string | null; hasUrl: boolean } {
  return {
    ready: !!dbInstance,
    error: initError,
    hasUrl: !!process.env.DATABASE_URL,
  };
}

console.log('[DB] Database ready:', isDbReady);
