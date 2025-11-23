import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../create-context';
// import { db } from '../../db';
// import { users } from '../../schema';
// import { eq } from 'drizzle-orm';
// import verifyAppleToken from 'verify-apple-id-token';

export const authRouter = createTRPCRouter({
  // Маршрут для входа через Apple
  loginWithApple: publicProcedure
    .input(z.object({
      identityToken: z.string(),
      email: z.string().optional(),
      fullName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { identityToken, email, fullName } = input;

      console.log('Attempting Apple Login with token length:', identityToken.length);

      // 1. Верификация токена
      // В реальном приложении раскомментируйте и настройте:
      /*
      const jwtClaims = await verifyAppleToken({
        idToken: identityToken,
        clientId: 'app.personalized-ai-goal-coach', // Ваш Bundle ID
        nonce: '...', // Если используете nonce
      });

      const appleId = jwtClaims.sub; // Уникальный ID пользователя от Apple
      const realEmail = jwtClaims.email || email;
      */

      // Эмуляция для примера (пока нет БД):
      // const appleId = 'simulated_apple_id_' + Math.random().toString(36).substr(2, 9);

      // 2. Поиск или создание пользователя в БД
      /*
      let user = await db.query.users.findFirst({
        where: eq(users.appleId, appleId)
      });

      if (!user) {
        [user] = await db.insert(users).values({
          appleId,
          email: realEmail,
          name: fullName,
          isPremium: false
        }).returning();
      }
      */

      // 3. Создание сессии (JWT token для вашего приложения)
      // const sessionToken = createSessionToken(user.id);

      // Возвращаем данные клиенту
      return {
        token: 'simulated_session_token',
        user: {
          id: 'simulated_db_id',
          email: email || 'apple@hidden.com',
          name: fullName,
        }
      };
    }),

  // Маршрут для удаления аккаунта (ОБЯЗАТЕЛЬНО для App Store)
  deleteAccount: publicProcedure
    .mutation(async ({ ctx }) => {
      // const userId = ctx.user.id;
      // await db.delete(users).where(eq(users.id, userId));
      return { success: true };
    }),
});
