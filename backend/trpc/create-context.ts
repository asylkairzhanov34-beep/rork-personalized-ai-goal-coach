import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";

export const createContext = async (opts: FetchCreateContextFnOptions) => {
  // In a real app, you would verify the session token here
  // const sessionToken = opts.req.headers.get('authorization');
  // const user = await verifySession(sessionToken);
  
  return {
    req: opts.req,
    user: null as { id: string } | null, // Placeholder for user
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    // For now, we allow it because we don't have real session verification yet.
    // In production: throw new TRPCError({ code: 'UNAUTHORIZED' });
    console.warn('Accessing protected procedure without user (Dev Mode)');
  }
  return next({
    ctx: {
      user: ctx.user || { id: 'dev_user' }, // Fallback for dev
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);
