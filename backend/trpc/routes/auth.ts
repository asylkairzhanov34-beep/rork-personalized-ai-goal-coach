import { z } from 'zod';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../create-context';

// Lazy load database to prevent initialization errors from crashing the router
let dbModule: typeof import('../../db') | null = null;
let schemaModule: typeof import('../../schema') | null = null;

const getDb = async () => {
  if (!dbModule) {
    try {
      dbModule = await import('../../db');
    } catch (e) {
      console.error('[Auth] Failed to load db module:', e);
    }
  }
  return dbModule;
};

const getSchema = async () => {
  if (!schemaModule) {
    try {
      schemaModule = await import('../../schema');
    } catch (e) {
      console.error('[Auth] Failed to load schema module:', e);
    }
  }
  return schemaModule;
};

export const authRouter = createTRPCRouter({
  // Health check route for debugging
  health: publicProcedure.query(async () => {
    try {
      const dbMod = await getDb();
      const dbStatus = dbMod?.getDbStatus() || { ready: false, error: 'Module not loaded', hasUrl: false };
      console.log('[Auth] Health check - DB status:', dbStatus);
      return {
        status: 'ok',
        database: dbStatus,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[Auth] Health check error:', error);
      return {
        status: 'ok',
        database: { ready: false, error: 'Failed to check', hasUrl: false },
        timestamp: new Date().toISOString(),
      };
    }
  }),

  // Route for Apple Sign In
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

      // Generate a stable user ID from the token
      const userId = 'apple_' + identityToken.substring(0, 20);
      
      console.log('[Auth] Returning user with ID:', userId);
      
      return {
        token: 'session_' + userId,
        user: {
          id: userId,
          email: email || 'user@privaterelay.appleid.com',
          name: fullName || null,
          isPremium: false
        }
      };
    }),

  // Delete Account (Required for App Store)
  deleteAccount: protectedProcedure
    .mutation(async ({ ctx }) => {
      const userId = ctx.user.id;
      console.log('[Auth] Deleting account for user:', userId);
      
      try {
        const dbMod = await getDb();
        const schemaMod = await getSchema();
        const { eq } = await import('drizzle-orm');
        
        if (dbMod?.isDbReady && dbMod?.db && schemaMod?.users) {
          const database = dbMod.db as any;
          await database.delete(schemaMod.users).where(eq(schemaMod.users.id, userId));
          console.log('[Auth] User deleted from database');
        } else {
          console.warn('[Auth] Database not connected. Simulating deletion.');
        }
      } catch (error) {
        console.error('[Auth] Delete error (non-fatal):', error);
      }
      
      return { success: true };
    }),
});
