import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../create-context';
import { eq } from 'drizzle-orm';
import { db, isDbReady, testConnection } from '../../db';
import { users } from '../../schema';

console.log('[Auth Router] Module loaded, DB ready:', isDbReady);

const AppleLoginInputSchema = z.object({
  identityToken: z.string().min(1, 'Identity token is required'),
  email: z.string().nullable().optional(),
  fullName: z.string().nullable().optional(),
});

type AuthResponse = {
  success: boolean;
  token: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    isPremium: boolean;
  };
};

function generateAppleId(identityToken: string): string {
  return 'apple_' + identityToken.substring(0, 32);
}

function createAuthResponse(
  id: string,
  email: string,
  name: string | null,
  isPremium: boolean
): AuthResponse {
  const response: AuthResponse = {
    success: true,
    token: `session_${id}`,
    user: {
      id: String(id),
      email: String(email),
      name: name !== null && name !== undefined ? String(name) : null,
      isPremium: Boolean(isPremium),
    },
  };
  
  console.log('[Auth] Response created for user:', id);
  return response;
}

export const authRouter = createTRPCRouter({
  health: publicProcedure
    .query(async () => {
      console.log('[Auth Health] Check started');
      
      let connectionOk = false;
      let connectionError: string | null = null;
      
      if (isDbReady) {
        try {
          connectionOk = await testConnection();
          console.log('[Auth Health] DB connection test:', connectionOk ? 'OK' : 'Failed');
        } catch (e) {
          connectionError = e instanceof Error ? e.message : 'Unknown error';
          console.error('[Auth Health] Connection test error:', connectionError);
        }
      }
      
      return {
        status: 'ok',
        database: {
          ready: isDbReady,
          connectionOk,
          error: connectionError,
          hasUrl: !!process.env.DATABASE_URL,
        },
        timestamp: new Date().toISOString(),
      };
    }),

  loginWithApple: publicProcedure
    .input(AppleLoginInputSchema)
    .mutation(async ({ input }): Promise<AuthResponse> => {
      const { identityToken, email, fullName } = input;

      console.log('[Auth] ========== Apple Login Started ==========');
      console.log('[Auth] Token length:', identityToken.length);
      console.log('[Auth] Email provided:', email || 'none');
      console.log('[Auth] Name provided:', fullName || 'none');
      console.log('[Auth] DB ready:', isDbReady);

      const appleId = generateAppleId(identityToken);
      const userEmail = email || `user_${appleId.substring(6, 14)}@privaterelay.appleid.com`;
      const userName = fullName || null;

      if (!isDbReady || !db) {
        console.log('[Auth] No database - returning local user');
        return createAuthResponse(appleId, userEmail, userName, false);
      }

      try {
        console.log('[Auth] Searching for existing user with appleId:', appleId);
        
        const existingUsers = await db
          .select()
          .from(users)
          .where(eq(users.appleId, appleId))
          .limit(1);
        
        console.log('[Auth] Found users:', existingUsers.length);

        if (existingUsers.length > 0) {
          const user = existingUsers[0];
          console.log('[Auth] Existing user found:', user.id);
          
          return createAuthResponse(
            String(user.id),
            user.email || userEmail,
            user.name,
            user.isPremium || false
          );
        }

        console.log('[Auth] Creating new user...');
        
        const insertResult = await db
          .insert(users)
          .values({
            email: email || null,
            name: fullName || null,
            appleId: appleId,
            isPremium: false,
          })
          .returning();

        console.log('[Auth] Insert result rows:', insertResult.length);

        if (insertResult.length > 0) {
          const newUser = insertResult[0];
          console.log('[Auth] New user created:', newUser.id);
          
          return createAuthResponse(
            String(newUser.id),
            newUser.email || userEmail,
            newUser.name,
            false
          );
        }

        console.error('[Auth] Insert returned no rows');
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create user',
        });

      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        const errorMessage = error instanceof Error ? error.message : 'Database error';
        console.error('[Auth] Database error:', errorMessage);

        if (errorMessage.includes('duplicate key') || errorMessage.includes('unique constraint')) {
          console.log('[Auth] Duplicate detected, trying to find user...');
          
          try {
            const foundUsers = await db
              .select()
              .from(users)
              .where(eq(users.appleId, appleId))
              .limit(1);
            
            if (foundUsers.length > 0) {
              const user = foundUsers[0];
              return createAuthResponse(
                String(user.id),
                user.email || userEmail,
                user.name,
                user.isPremium || false
              );
            }
          } catch (findError) {
            console.error('[Auth] Find after duplicate failed:', findError);
          }
        }

        console.log('[Auth] Fallback: returning local user due to error');
        return createAuthResponse(appleId, userEmail, userName, false);
      } finally {
        console.log('[Auth] ========== Apple Login Finished ==========');
      }
    }),

  getUser: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user?.id;
      console.log('[Auth] getUser for:', userId);
      
      if (!userId || !isDbReady || !db) {
        return null;
      }

      try {
        const foundUsers = await db
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);
        
        if (foundUsers.length > 0) {
          const user = foundUsers[0];
          return {
            id: String(user.id),
            email: user.email || '',
            name: user.name,
            isPremium: user.isPremium || false,
          };
        }
        
        return null;
      } catch (error) {
        console.error('[Auth] getUser error:', error);
        return null;
      }
    }),

  deleteAccount: protectedProcedure
    .mutation(async ({ ctx }) => {
      const userId = ctx.user?.id;
      console.log('[Auth] deleteAccount for:', userId);
      
      if (!userId) {
        return { success: false, error: 'No user ID' };
      }
      
      if (!isDbReady || !db) {
        console.log('[Auth] No database - cannot delete');
        return { success: true, message: 'Local user cleared' };
      }
      
      try {
        await db.delete(users).where(eq(users.id, userId));
        console.log('[Auth] User deleted from DB');
        return { success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Auth] Delete error:', errorMessage);
        return { success: false, error: errorMessage };
      }
    }),
});

console.log('[Auth Router] Exported');
