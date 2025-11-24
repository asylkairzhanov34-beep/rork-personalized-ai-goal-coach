import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Connection string from environment variables
const connectionString = process.env.DATABASE_URL;

// If DATABASE_URL is not set, we'll use a null client to prevent crash during build,
// but runtime operations will fail if not handled.
const client = connectionString ? postgres(connectionString, { prepare: false }) : null;

export const db = client ? drizzle(client, { schema }) : null;

export const isDbReady = !!db;
