import { z } from 'zod';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../create-context';
import { db, isDbReady } from '../../db';
import { users } from '../../schema';
import { eq } from 'drizzle-orm';
// import verifyAppleToken from 'verify-apple-id-token'; // Uncomment after installing: npm install verify-apple-id-token

export const authRouter = createTRPCRouter({
  // Route for Apple Sign In
  loginWithApple: publicProcedure
    .input(z.object({
      identityToken: z.string(),
      email: z.string().optional(),
      fullName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { identityToken, email, fullName } = input;

      console.log('Attempting Apple Login with token length:', identityToken.length);

      if (!isDbReady || !db) {
         // Fallback for development without DB
         console.warn('Database not connected. Returning mock user.');
         return {
            token: 'dev_session_token',
            user: {
              id: 'dev_user_id',
              email: email || 'dev@apple.com',
              name: fullName,
              isPremium: false
            }
         };
      }

      // 1. Token Verification
      // REAL AUTH: Uncomment this block to verify the token with Apple
      /*
      try {
        const jwtClaims = await verifyAppleToken({
          idToken: identityToken,
          clientId: 'app.personalized-ai-goal-coach', // MUST match Bundle ID
          // nonce: '...', // Implement nonce verification for extra security
        });
        
        // Verify expected issuer and audience
        // if (jwtClaims.iss !== 'https://appleid.apple.com') throw new Error('Invalid issuer');
        
        const appleId = jwtClaims.sub; // Unique user ID from Apple
        const realEmail = jwtClaims.email || email; // Email might be in token or passed from client
      } catch (error) {
        console.error('Apple Token Verification Failed:', error);
        throw new Error('Invalid Apple Identity Token');
      }
      */
      
      // For now, we trust the client-side ID (INSECURE - Only for prototype)
      // In production, you MUST use the verification above.
      // We simulate extracting the ID from the token (just using a hash or similar if we could)
      // Here we just use a placeholder or assume the client sent the ID if we changed the input.
      // Since we only have token, we'll simulate an ID for now.
      const appleId = 'apple_' + identityToken.substring(0, 20); 

      // 2. Find or Create User in DB
      const existingUsers = await db.select().from(users).where(eq(users.appleId, appleId)).limit(1);
      let user = existingUsers[0];

      if (!user) {
        console.log('Creating new user for Apple ID:', appleId);
        [user] = await db.insert(users).values({
          appleId,
          email: email, // Email is often private/hidden by Apple, so handle that
          name: fullName,
          isPremium: false
        }).returning();
      } else {
          console.log('Found existing user:', user.id);
      }

      // 3. Create Session (JWT)
      // You should implement a proper session mechanism here (e.g., signing a JWT)
      const sessionToken = 'session_' + user.id; // Replace with jwt.sign(...)

      return {
        token: sessionToken,
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            isPremium: user.isPremium
        }
      };
    }),

  // Delete Account (Required for App Store)
  deleteAccount: protectedProcedure
    .mutation(async ({ ctx }) => {
      if (!isDbReady || !db) {
          console.warn('Database not connected. Simulating deletion.');
          return { success: true };
      }
      
      const userId = ctx.user.id;
      console.log('Deleting account for user:', userId);
      
      // Delete user from DB
      await db.delete(users).where(eq(users.id, userId));
      
      return { success: true };
    }),
});
