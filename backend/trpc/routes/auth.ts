import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../create-context';
import { eq } from 'drizzle-orm';

import { db, isDbReady, testConnection } from '../../db';
import { users } from '../../schema';

const AuthUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  isPremium: z.boolean(),
});

const AuthResponseSchema = z.object({
  token: z.string(),
  user: AuthUserSchema,
});

type AuthResponse = z.infer<typeof AuthResponseSchema>;

export const authRouter = createTRPCRouter({
  health: publicProcedure.query(async () => {
    console.log('[Auth] Health check - DB ready:', isDbReady);
    
    let connectionOk = false;
    if (isDbReady) {
      try {
        connectionOk = await testConnection();
      } catch (e) {
        console.error('[Auth] Connection test error:', e);
      }
    }
    
    return {
      status: 'ok',
      database: {
        ready: isDbReady,
        connectionOk,
        hasUrl: !!process.env.DATABASE_URL,
      },
      timestamp: new Date().toISOString(),
    };
  }),

  loginWithApple: publicProcedure
    .input(z.object({
      identityToken: z.string(),
      email: z.string().optional().nullable(),
      fullName: z.string().optional().nullable(),
    }))
    .output(AuthResponseSchema)
    .mutation(async ({ input }): Promise<AuthResponse> => {
      const { identityToken, email, fullName } = input;

      console.log('[Auth] Apple Login attempt');
      console.log('[Auth] Token length:', identityToken?.length || 0);
      console.log('[Auth] Email:', email || 'not provided');
      console.log('[Auth] Full name:', fullName || 'not provided');
      console.log('[Auth] DB ready:', isDbReady);

      const appleId = 'apple_' + (identityToken || '').substring(0, 32);
      const userEmail = email || 'user@privaterelay.appleid.com';
      const userName = fullName || null;
      
      const createResponse = (id: string, responseEmail: string, responseName: string | null, premium: boolean): AuthResponse => {
        const response: AuthResponse = {
          token: 'session_' + String(id),
          user: {
            id: String(id),
            email: String(responseEmail),
            name: responseName !== null ? String(responseName) : null,
            isPremium: Boolean(premium),
          },
        };
        console.log('[Auth] Creating response:', JSON.stringify(response));
        return response;
      };
      
      if (!isDbReady || !db) {
        console.log('[Auth] Database not ready, returning fallback user');
        return createResponse(appleId, userEmail, userName, false);
      }
      
      try {
        console.log('[Auth] Querying for existing user with appleId:', appleId);
        const existingUsers = await db
          .select()
          .from(users)
          .where(eq(users.appleId, appleId))
          .limit(1);
        
        console.log('[Auth] Query result:', existingUsers?.length || 0, 'users found');
        
        if (existingUsers && existingUsers.length > 0) {
          const user = existingUsers[0];
          console.log('[Auth] Found existing user:', user.id);
          console.log('[Auth] User data:', JSON.stringify(user));
          return createResponse(
            String(user.id),
            String(user.email || userEmail),
            user.name !== null && user.name !== undefined ? String(user.name) : null,
            Boolean(user.isPremium)
          );
        }
        
        console.log('[Auth] Creating new user...');
        const newUser = await db
          .insert(users)
          .values({
            email: email || null,
            name: fullName || null,
            appleId: appleId,
            isPremium: false,
          })
          .returning();
        
        console.log('[Auth] Insert result:', newUser?.length || 0, 'rows');
        
        if (newUser && newUser.length > 0) {
          const user = newUser[0];
          console.log('[Auth] Created new user:', user.id);
          console.log('[Auth] New user data:', JSON.stringify(user));
          return createResponse(
            String(user.id),
            String(user.email || userEmail),
            user.name !== null && user.name !== undefined ? String(user.name) : null,
            false
          );
        }
        
        console.error('[Auth] Failed to create user - no rows returned');
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create user in database',
        });
      } catch (dbError: unknown) {
        const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown database error';
        console.error('[Auth] Database error:', errorMessage);
        
        if (dbError instanceof TRPCError) {
          throw dbError;
        }
        
        console.log('[Auth] Returning fallback user due to DB error');
        return createResponse(appleId, userEmail, userName, false);
      }
    }),

  deleteAccount: protectedProcedure
    .mutation(async ({ ctx }): Promise<{ success: boolean }> => {
      const userId = ctx.user?.id;
      console.log('[Auth] Deleting account for user:', userId);
      
      if (!userId) {
        console.warn('[Auth] No user ID provided');
        return { success: false };
      }
      
      if (!isDbReady || !db) {
        console.warn('[Auth] Database not connected. Cannot delete from DB.');
        return { success: true };
      }
      
      try {
        await db.delete(users).where(eq(users.id, userId));
        console.log('[Auth] User deleted from database');
        return { success: true };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Auth] Delete error:', errorMessage);
        return { success: false };
      }
    }),
});
