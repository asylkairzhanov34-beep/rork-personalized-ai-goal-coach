import { z } from 'zod';
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
    .mutation(async ({ input }) => {
      const { identityToken, email, fullName } = input;

      console.log('[Auth] Apple Login attempt');
      console.log('[Auth] Token length:', identityToken.length);
      console.log('[Auth] Email:', email);
      console.log('[Auth] Full name:', fullName);
      console.log('[Auth] DB ready:', isDbReady);

      const appleId = 'apple_' + identityToken.substring(0, 32);
      
      if (!isDbReady || !db) {
        console.log('[Auth] Database not ready, returning fallback user');
        return {
          token: 'session_' + appleId,
          user: {
            id: appleId,
            email: email || 'user@privaterelay.appleid.com',
            name: fullName || null,
            isPremium: false,
          },
        };
      }
      
      try {
        const existingUsers = await db
          .select()
          .from(users)
          .where(eq(users.appleId, appleId))
          .limit(1);
        
        if (existingUsers && existingUsers.length > 0) {
          const user = existingUsers[0];
          console.log('[Auth] Found existing user:', user.id);
          
          return {
            token: 'session_' + user.id,
            user: {
              id: user.id,
              email: user.email || email || 'user@privaterelay.appleid.com',
              name: user.name || fullName || null,
              isPremium: user.isPremium || false,
            },
          };
        }
        
        const newUser = await db
          .insert(users)
          .values({
            email: email || null,
            name: fullName || null,
            appleId: appleId,
            isPremium: false,
          })
          .returning();
        
        if (newUser && newUser.length > 0) {
          const user = newUser[0];
          console.log('[Auth] Created new user in Supabase:', user.id);
          
          return {
            token: 'session_' + user.id,
            user: {
              id: user.id,
              email: user.email || email || 'user@privaterelay.appleid.com',
              name: user.name || fullName || null,
              isPremium: false,
            },
          };
        }
        
        throw new Error('Failed to create user');
      } catch (dbError: any) {
        console.error('[Auth] Database error:', dbError?.message || dbError);
        
        return {
          token: 'session_' + appleId,
          user: {
            id: appleId,
            email: email || 'user@privaterelay.appleid.com',
            name: fullName || null,
            isPremium: false,
          },
        };
      }
    }),

  deleteAccount: protectedProcedure
    .mutation(async ({ ctx }) => {
      const userId = ctx.user.id;
      console.log('[Auth] Deleting account for user:', userId);
      
      if (!isDbReady || !db) {
        console.warn('[Auth] Database not connected. Cannot delete from DB.');
        return { success: true };
      }
      
      try {
        await db.delete(users).where(eq(users.id, userId));
        console.log('[Auth] User deleted from database');
      } catch (error: any) {
        console.error('[Auth] Delete error:', error?.message || error);
      }
      
      return { success: true };
    }),
});
