import { createClient, Client } from '@libsql/client';

console.log('[Turso DB] ========== Turso Database ==========');

interface UserOutput {
  id: string;
  email: string | null;
  name: string | null;
  appleId: string;
  isPremium: boolean;
  createdAt: Date;
  updatedAt: Date;
}

let client: Client | null = null;
let dbReady = false;
let dbError: string | null = null;

function getEnvVar(name: string): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[name];
  }
  return undefined;
}

async function initializeDb(): Promise<void> {
  const url = getEnvVar('TURSO_DATABASE_URL');
  const authToken = getEnvVar('TURSO_AUTH_TOKEN');

  console.log('[Turso DB] URL exists:', !!url);
  console.log('[Turso DB] Auth token exists:', !!authToken);

  if (!url) {
    dbError = 'TURSO_DATABASE_URL not configured';
    console.error('[Turso DB] Error:', dbError);
    return;
  }

  try {
    client = createClient({
      url,
      authToken: authToken || undefined,
    });

    console.log('[Turso DB] Client created, initializing tables...');
    
    await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        name TEXT,
        apple_id TEXT UNIQUE NOT NULL,
        is_premium INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_users_apple_id ON users(apple_id)
    `);

    console.log('[Turso DB] Tables created successfully');
    
    const result = await client.execute('SELECT COUNT(*) as count FROM users');
    const count = result.rows[0]?.count ?? 0;
    console.log('[Turso DB] Current user count:', count);

    dbReady = true;
    dbError = null;
    console.log('[Turso DB] Database ready!');
    
  } catch (error) {
    dbError = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Turso DB] Initialization error:', dbError);
  }
}

initializeDb();

function generateId(): string {
  return 'user_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function rowToUser(row: Record<string, unknown>): UserOutput {
  return {
    id: String(row.id),
    email: row.email ? String(row.email) : null,
    name: row.name ? String(row.name) : null,
    appleId: String(row.apple_id),
    isPremium: Boolean(row.is_premium),
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
  };
}

export async function findUserByAppleId(appleId: string): Promise<UserOutput | null> {
  if (!client || !dbReady) {
    console.log('[Turso DB] Database not ready for findUserByAppleId');
    return null;
  }

  try {
    const result = await client.execute({
      sql: 'SELECT * FROM users WHERE apple_id = ?',
      args: [appleId],
    });

    if (result.rows.length === 0) {
      console.log('[Turso DB] No user found with apple_id:', appleId.substring(0, 20) + '...');
      return null;
    }

    const user = rowToUser(result.rows[0] as unknown as Record<string, unknown>);
    console.log('[Turso DB] Found user:', user.id);
    return user;
  } catch (error) {
    console.error('[Turso DB] findUserByAppleId error:', error);
    return null;
  }
}

export async function findUserById(id: string): Promise<UserOutput | null> {
  if (!client || !dbReady) {
    console.log('[Turso DB] Database not ready for findUserById');
    return null;
  }

  try {
    const result = await client.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [id],
    });

    if (result.rows.length === 0) {
      console.log('[Turso DB] No user found with id:', id);
      return null;
    }

    return rowToUser(result.rows[0] as unknown as Record<string, unknown>);
  } catch (error) {
    console.error('[Turso DB] findUserById error:', error);
    return null;
  }
}

export async function createUser(data: {
  email: string | null;
  name: string | null;
  appleId: string;
}): Promise<UserOutput> {
  console.log('[Turso DB] createUser called');
  console.log('[Turso DB] Database ready:', dbReady);
  console.log('[Turso DB] Client exists:', !!client);

  if (!client || !dbReady) {
    throw new Error('Database not ready: ' + (dbError || 'Unknown error'));
  }

  const existing = await findUserByAppleId(data.appleId);
  if (existing) {
    console.log('[Turso DB] User already exists:', existing.id);
    return existing;
  }

  const id = generateId();
  const now = new Date().toISOString();

  try {
    await client.execute({
      sql: `INSERT INTO users (id, email, name, apple_id, is_premium, created_at, updated_at)
            VALUES (?, ?, ?, ?, 0, ?, ?)`,
      args: [id, data.email, data.name, data.appleId, now, now],
    });

    console.log('[Turso DB] User created successfully:', id);

    const newUser = await findUserById(id);
    if (!newUser) {
      throw new Error('Failed to retrieve created user');
    }

    return newUser;
  } catch (error) {
    console.error('[Turso DB] createUser error:', error);
    throw error;
  }
}

export async function updateUser(
  id: string,
  data: Partial<{ email: string | null; name: string | null; isPremium: boolean }>
): Promise<UserOutput | null> {
  if (!client || !dbReady) {
    console.log('[Turso DB] Database not ready for updateUser');
    return null;
  }

  try {
    const updates: string[] = [];
    const args: (string | number | null)[] = [];

    if (data.email !== undefined) {
      updates.push('email = ?');
      args.push(data.email);
    }
    if (data.name !== undefined) {
      updates.push('name = ?');
      args.push(data.name);
    }
    if (data.isPremium !== undefined) {
      updates.push('is_premium = ?');
      args.push(data.isPremium ? 1 : 0);
    }

    if (updates.length === 0) {
      return findUserById(id);
    }

    updates.push("updated_at = datetime('now')");
    args.push(id);

    await client.execute({
      sql: `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      args,
    });

    console.log('[Turso DB] User updated:', id);
    return findUserById(id);
  } catch (error) {
    console.error('[Turso DB] updateUser error:', error);
    return null;
  }
}

export async function deleteUser(id: string): Promise<boolean> {
  if (!client || !dbReady) {
    console.log('[Turso DB] Database not ready for deleteUser');
    return false;
  }

  try {
    const result = await client.execute({
      sql: 'DELETE FROM users WHERE id = ?',
      args: [id],
    });

    const deleted = (result.rowsAffected ?? 0) > 0;
    console.log('[Turso DB] User deleted:', id, deleted);
    return deleted;
  } catch (error) {
    console.error('[Turso DB] deleteUser error:', error);
    return false;
  }
}

export function getDbStatus() {
  return {
    ready: dbReady,
    type: 'turso',
    error: dbError,
    clientExists: !!client,
  };
}

export const isDbReady = () => dbReady;

console.log('[Turso DB] ==========================================');
