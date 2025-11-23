// backend/db.ts
// Это заготовка для подключения к PostgreSQL.
// Раскомментируйте код после установки зависимостей: npm install postgres drizzle-orm

/*
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// URL подключения берется из переменных окружения
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // Это нормально при сборке без env, но в рантайме нужна ошибка
  console.warn('DATABASE_URL is not set. Database features will not work.');
}

// Создаем клиент
// prepare: false нужен для совместимости с Serverless (Neon, Supabase через пул)
const client = postgres(connectionString || '', { prepare: false });

export const db = drizzle(client);
*/

// Временная заглушка, чтобы файл компилировался
export const db = null;
