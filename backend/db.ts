import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Connection string from environment variables
const connectionString = process.env.DATABASE_URL;

console.log('[DB] Initializing database connection...');
console.log('[DB] DATABASE_URL exists:', !!connectionString);
console.log('[DB] DATABASE_URL length:', connectionString?.length || 0);

let client: ReturnType<typeof postgres> | null = null;
let initError: string | null = null;

try {
  if (connectionString) {
    client = postgres(connectionString, { prepare: false });
    console.log('[DB] Postgres client created successfully');
  } else {
    console.warn('[DB] No DATABASE_URL found - database features will be disabled');
    initError = 'DATABASE_URL not configured';
  }
} catch (error) {
  console.error('[DB] Failed to create postgres client:', error);
  initError = error instanceof Error ? error.message : 'Unknown error';
  client = null;
}

export const db = client ? drizzle(client, { schema }) : null;
export const isDbReady = !!db;

export function getDbStatus(): { ready: boolean; error: string | null; hasUrl: boolean } {
  return {
    ready: isDbReady,
    error: initError,
    hasUrl: !!connectionString,
  };
}

console.log('[DB] Database ready:', isDbReady);
