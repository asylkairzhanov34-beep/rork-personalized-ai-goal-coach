import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

let client: ReturnType<typeof postgres> | null = null;
let dbInstance: PostgresJsDatabase<typeof schema> | null = null;
let initError: string | null = null;
let initialized = false;
let connectionTested = false;

function initializeDb() {
  if (initialized) return;
  initialized = true;

  const connectionString = process.env.DATABASE_URL;

  console.log('[DB] Initializing Supabase database connection...');
  console.log('[DB] DATABASE_URL exists:', !!connectionString);
  
  if (connectionString) {
    const maskedUrl = connectionString.replace(/:[^:@]+@/, ':***@');
    console.log('[DB] Connection string (masked):', maskedUrl);
  }

  if (!connectionString) {
    console.warn('[DB] No DATABASE_URL found - database features will be disabled');
    initError = 'DATABASE_URL not configured. Set DATABASE_URL in environment variables.';
    return;
  }

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
    console.log('[DB] Supabase Postgres client created successfully');
    initError = null;
  } catch (error) {
    console.error('[DB] Failed to create Supabase postgres client:', error);
    initError = error instanceof Error ? error.message : 'Unknown error';
    client = null;
    dbInstance = null;
  }
}

initializeDb();

export const db: PostgresJsDatabase<typeof schema> | null = dbInstance;
export const isDbReady = !!dbInstance;

export async function testConnection(): Promise<boolean> {
  if (connectionTested) return isDbReady;
  connectionTested = true;
  
  if (!client) {
    console.log('[DB] No client to test');
    return false;
  }
  
  try {
    await client`SELECT 1`;
    console.log('[DB] Connection test successful');
    return true;
  } catch (error) {
    console.error('[DB] Connection test failed:', error);
    initError = error instanceof Error ? error.message : 'Connection test failed';
    return false;
  }
}

export function getDbStatus(): { ready: boolean; error: string | null; hasUrl: boolean } {
  return {
    ready: !!dbInstance,
    error: initError,
    hasUrl: !!process.env.DATABASE_URL,
  };
}

console.log('[DB] Supabase database ready:', isDbReady);
