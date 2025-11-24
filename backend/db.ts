import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

let client: ReturnType<typeof postgres> | null = null;
let db: ReturnType<typeof drizzle> | null = null;
let isDbReady = false;

try {
  if (connectionString) {
    console.log('[DB] Initializing database connection...');
    client = postgres(connectionString, { prepare: false });
    db = drizzle(client, { schema });
    isDbReady = true;
    console.log('[DB] Database connection initialized successfully');
  } else {
    console.warn('[DB] DATABASE_URL not set. Database operations will not be available.');
    console.warn('[DB] Please add DATABASE_URL to your env file.');
    console.warn('[DB] Get it from: Neon Dashboard -> Connection String (copy the full connection string)');
  }
} catch (error) {
  console.error('[DB] Failed to initialize database:', error);
  console.warn('[DB] Database operations will not be available.');
}

export { db, isDbReady };
export default db;
