import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../create-context';
import { eq } from 'drizzle-orm';

import { db, isDbReady, testConnection } from '../../db';
import { users } from '../../schema';

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
      email: z.string().optional(),
      fullName: z.string().optional(),
    }))
    .mutation(async ({ input }): Promise<{ token: string; user: { id: string; email: string; name: string | null; isPremium: boolean } }> => {
      const { identityToken, email, fullName } = input;

      console.log('[Auth] Apple Login attempt');
      console.log('[Auth] Token length:', identityToken.length);
      console.log('[Auth] Email:', email);
      console.log('[Auth] Full name:', fullName);
      console.log('[Auth] DB ready:', isDbReady);

      const appleId = 'apple_' + identityToken.substring(0, 32);
      const userEmail = email || 'user@privaterelay.appleid.com';
      const userName = fullName || null;
      
      if (!isDbReady || !db) {
        console.log('[Auth] Database not ready, returning fallback user');
        return {
          token: 'session_' + appleId,
          user: {
            id: appleId,
            email: userEmail,
            name: userName,
            isPremium: false,
          },
        };
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
          
          const response = {
            token: 'session_' + String(user.id),
            user: {
              id: String(user.id),
              email: String(user.email || userEmail),
              name: user.name ? String(user.name) : userName,
              isPremium: Boolean(user.isPremium),
            },
          };
          console.log('[Auth] Returning existing user response');
          return response;
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
          
          const response = {
            token: 'session_' + String(user.id),
            user: {
              id: String(user.id),
              email: String(user.email || userEmail),
              name: user.name ? String(user.name) : userName,
              isPremium: false,
            },
          };
          console.log('[Auth] Returning new user response');
          return response;
        }
        
        console.error('[Auth] Failed to create user - no rows returned');
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create user in database',
        });
      } catch (dbError: unknown) {
        const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown database error';
        console.error('[Auth] Database error:', errorMessage);
        
        // If it's already a TRPC error, rethrow it
        if (dbError instanceof TRPCError) {
          throw dbError;
        }
        
        // Return fallback user on database error
        console.log('[Auth] Returning fallback user due to DB error');
        return {
          token: 'session_' + appleId,
          user: {
            id: appleId,
            email: userEmail,
            name: userName,
            isPremium: false,
          },
        };
      }
    }),

  deleteAccount: protectedProcedure
    .mutation(async ({ ctx }): Promise<{ success: boolean }> => {
      const userId = ctx.user.id;
      console.log('[Auth] Deleting account for user:', userId);
      
      if (!isDbReady || !db) {
        console.warn('[Auth] Database not connected. Cannot delete from DB.');
        return { success: true };
      }
      
      try {
        await db.delete(users).where(eq(users.id, userId));
        console.log('[Auth] User deleted from database');
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Auth] Delete error:', errorMessage);
      }
      
      return { success: true };
    }),
});
