# Neon Database Setup Guide

## Шаг 1: Создание аккаунта и проекта Neon

1. Перейдите на https://neon.tech
2. Нажмите "Sign Up" и создайте аккаунт (можно через GitHub, Google или Email)
3. После входа нажмите "Create Project"
4. Настройки проекта:
   - **Project name**: `goal-coach-app` (или любое название)
   - **Database name**: `goal_coach_db`
   - **Region**: выберите ближайший к вашим пользователям (например, `AWS eu-central-1` для Европы)
   - **Postgres version**: оставьте последнюю (16)
5. Нажмите "Create Project"

## Шаг 2: Получение Connection String

1. После создания проекта вы увидите Dashboard
2. В разделе "Connection Details" найдите строку подключения
3. Выберите формат: **Connection string**
4. Нажмите "Show password" чтобы увидеть полную строку
5. Скопируйте строку, она выглядит так:
   ```
   postgresql://username:password@ep-xxxxx.region.aws.neon.tech/goal_coach_db?sslmode=require
   ```

**ВАЖНО**: Сохраните эту строку - она понадобится для следующего шага.

## Шаг 3: Настройка переменной окружения

Создайте или обновите файл `env` в корне проекта:

```env
DATABASE_URL=postgresql://username:password@ep-xxxxx.region.aws.neon.tech/goal_coach_db?sslmode=require
```

**Замените** `postgresql://username:password@ep-xxxxx.region.aws.neon.tech/goal_coach_db?sslmode=require` на вашу реальную строку из Neon.

## Шаг 4: Создание таблицы users

1. В Neon Dashboard перейдите в раздел **SQL Editor**
2. Выполните следующий SQL запрос:

```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  apple_id TEXT UNIQUE,
  password_hash TEXT,
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Создание индекса для быстрого поиска по apple_id
CREATE INDEX IF NOT EXISTS idx_users_apple_id ON users(apple_id);

-- Создание индекса для быстрого поиска по email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

3. Нажмите "Run" для выполнения

## Шаг 5: Проверка подключения

После добавления `DATABASE_URL` в env файл, перезапустите приложение.
В логах backend должно появиться сообщение об успешном подключении к базе данных.

---

## Дополнительно: Branching в Neon (опционально)

Neon поддерживает Git-подобное ветвление баз данных:

1. **Production branch**: `main` - основная база для production
2. **Development branch**: создайте ветку для разработки

В Dashboard:
1. Перейдите в "Branches"
2. Нажмите "Create Branch"
3. Назовите ветку `dev`
4. Используйте отдельную connection string для dev окружения

---

## Что дать мне после настройки

После выполнения шагов 1-4, пришлите мне:

**1. DATABASE_URL** - строка подключения к Neon (формат: `postgresql://...`)

Пример того, что нужно прислать:
```
DATABASE_URL=postgresql://goal_coach_user:abc123xyz@ep-cool-paper-123456.us-east-1.aws.neon.tech/goal_coach_db?sslmode=require
```

После этого я добавлю её в настройки проекта и проверю подключение.

---

## Безопасность

- Никогда не публикуйте DATABASE_URL в публичных репозиториях
- Используйте разные базы для development и production
- Neon автоматически шифрует соединения (sslmode=require)
