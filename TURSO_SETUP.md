# Настройка Turso Database

Turso - это edge-совместимая SQLite база данных, которая идеально подходит для serverless приложений.

## Шаг 1: Создание аккаунта

1. Перейдите на [turso.tech](https://turso.tech)
2. Нажмите "Sign Up" и создайте аккаунт
3. Бесплатный план включает:
   - 500 баз данных
   - 9GB хранилища
   - 500 миллионов строк в месяц

## Шаг 2: Установка CLI (опционально, но рекомендуется)

```bash
# macOS
brew install tursodatabase/tap/turso

# Linux
curl -sSfL https://get.tur.so/install.sh | bash

# Windows (через WSL)
curl -sSfL https://get.tur.so/install.sh | bash
```

После установки авторизуйтесь:
```bash
turso auth login
```

## Шаг 3: Создание базы данных

### Через CLI:
```bash
turso db create my-app-db
```

### Через Dashboard:
1. Перейдите в [Turso Dashboard](https://turso.tech/app)
2. Нажмите "Create Database"
3. Выберите регион (рекомендуется ближайший к вашим пользователям)
4. Дайте имя базе данных

## Шаг 4: Получение URL и токена

### Получить URL базы данных:
```bash
turso db show my-app-db --url
```

Результат будет выглядеть так:
```
libsql://my-app-db-username.turso.io
```

### Создать Auth Token:
```bash
turso db tokens create my-app-db
```

Сохраните токен - он показывается только один раз!

### Через Dashboard:
1. Откройте вашу базу данных в Dashboard
2. Перейдите в раздел "Tokens"
3. Нажмите "Create Token"
4. Скопируйте токен

## Шаг 5: Настройка переменных окружения

В файле `env` добавьте полученные данные:

```env
TURSO_DATABASE_URL=libsql://my-app-db-username.turso.io
TURSO_AUTH_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
```

## Проверка подключения

После добавления переменных окружения, перезапустите приложение.

В консоли должны появиться логи:
```
[Turso DB] ========== Turso Database ==========
[Turso DB] URL exists: true
[Turso DB] Auth token exists: true
[Turso DB] Client created, initializing tables...
[Turso DB] Tables created successfully
[Turso DB] Current user count: 0
[Turso DB] Database ready!
```

## Просмотр данных

### Через CLI:
```bash
turso db shell my-app-db
```

Затем выполните SQL запросы:
```sql
SELECT * FROM users;
```

### Через Dashboard:
1. Откройте базу данных в Dashboard
2. Перейдите в раздел "Data Browser"
3. Просматривайте и редактируйте данные

## Структура таблицы users

База данных автоматически создаёт таблицу при первом подключении:

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  apple_id TEXT UNIQUE NOT NULL,
  is_premium INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

## Troubleshooting

### Ошибка "TURSO_DATABASE_URL not configured"
- Убедитесь, что переменная окружения добавлена в файл `env`
- Перезапустите сервер

### Ошибка подключения
- Проверьте правильность URL (должен начинаться с `libsql://`)
- Проверьте не истёк ли токен
- Создайте новый токен если нужно

### База данных не создаётся
- Проверьте лимиты вашего плана в Dashboard
- Попробуйте создать базу в другом регионе

## Полезные команды CLI

```bash
# Список всех баз данных
turso db list

# Информация о базе данных
turso db show my-app-db

# Удаление базы данных
turso db destroy my-app-db

# Создание нового токена
turso db tokens create my-app-db

# Отзыв токена
turso db tokens revoke my-app-db <token-name>
```
