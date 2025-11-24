# Инструкция по подключению Neon (PostgreSQL) и Apple Auth

Эта инструкция поможет вам настроить реальную базу данных и аутентификацию для релиза в App Store.

## Шаг 1: База данных Neon (PostgreSQL)

1. Перейдите на [neon.tech](https://neon.tech) и зарегистрируйтесь/войдите.
2. Создайте новый проект (New Project).
   - Name: `rork-app` (или любое другое)
   - Region: Выберите ближайший к вашим пользователям (например, Frankfurt для СНГ/Европы).
3. После создания вы увидите "Connection String" (строку подключения).
   - Она выглядит так: `postgres://neondb_owner:AbCdEf123456@ep-cool-frog-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require`
   - **Скопируйте её.**

4. В корне вашего проекта найдите файл `.env` (если его нет, создайте, используя `env.example` как шаблон).
5. Вставьте скопированную строку в переменную `DATABASE_URL`:
   ```env
   DATABASE_URL=postgres://neondb_owner:AbCdEf123456@ep-cool-frog-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```

6. **Примените структуру базы данных (Миграция):**
   Откройте терминал в папке проекта и выполните команды:
   ```bash
   # Установка необходимых пакетов (если еще не установлены)
   npm install drizzle-orm postgres
   npm install -D drizzle-kit

   # Загрузка структуры таблиц в базу данных Neon
   npx drizzle-kit push
   ```
   *Если команда прошла успешно, вы увидите сообщение о применении изменений.*

## Шаг 2: Apple Authentication (Sign in with Apple)

Для релиза Apple требует, чтобы вход через Apple работал корректно.

1. **Apple Developer Account:**
   - Перейдите на [developer.apple.com/account](https://developer.apple.com/account).
   - Certificates, Identifiers & Profiles -> Identifiers.
   - Найдите ваш App ID (Bundle ID: `app.rork.personalized-ai-goal-coach` - проверьте в `app.json`).
   - Убедитесь, что в списке "Capabilities" включена галочка **Sign In with Apple**.
   - Нажмите Save (и Edit, если нужно настроить, но для iOS Native настроек обычно не требуется, кроме включения).

2. **Настройка Backend (Верификация токена):**
   Чтобы сервер мог доверять токену от приложения, нужно проверять его подпись.

   - **Установите пакет для проверки:**
     ```bash
     npm install verify-apple-id-token
     ```

   - **Отредактируйте файл** `backend/trpc/routes/auth.ts`:
     1. Раскомментируйте строку импорта:
        ```typescript
        import verifyAppleToken from 'verify-apple-id-token';
        ```
     2. Раскомментируйте блок `try { ... }` внутри `loginWithApple`.
     3. Найдите строку `clientId: 'app.personalized-ai-goal-coach'` и убедитесь, что она совпадает с вашим **Bundle ID** из `app.json` (`bundleIdentifier` или `ios.bundleIdentifier`).
     
     *Пример кода, который должен получиться:*
     ```typescript
     // ...
     try {
       const jwtClaims = await verifyAppleToken({
         idToken: identityToken,
         clientId: 'app.rork.personalized-ai-goal-coach', // ВАШ BUNDLE ID
       });
       // ...
     } catch (error) {
        console.error('Apple Token Verification Failed:', error);
        throw new Error('Invalid Apple Identity Token');
     }
     // ...
     ```

## Шаг 3: Удаление аккаунта (Обязательно для App Store)

Apple **требует**, чтобы пользователь мог удалить свой аккаунт и все данные.

1. Убедитесь, что кнопка "Удалить аккаунт" в приложении (`app/(tabs)/profile.tsx`) работает и вызывает метод API `deleteAccount`.
2. В `backend/trpc/routes/auth.ts`, метод `deleteAccount` должен реально удалять пользователя из БД (сейчас там стоит заглушка, если БД не подключена).
   - После подключения Neon (Шаг 1), код:
     ```typescript
     await db.delete(users).where(eq(users.id, userId));
     ```
     начнет работать автоматически (так как `isDbReady` станет `true`).

## Шаг 4: Финальная проверка перед сборкой

1. Проверьте `.env` на наличие `DATABASE_URL`.
2. Проверьте `app.json`:
   - `ios.bundleIdentifier`: должен совпадать с тем, что в Apple Developer.
   - `ios.infoPlist`: должны быть описания для `NSFaceIDUsageDescription` (если используется) и других прав.
3. Проверьте ссылки:
   - В `AuthScreen.tsx` уже установлена ссылка на Notion Privacy Policy.
   - Убедитесь, что эта ссылка открывается и содержит актуальную информацию.

Теперь приложение готово к сборке (`eas build`) и тестированию в TestFlight!
