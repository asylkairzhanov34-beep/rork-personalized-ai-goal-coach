import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import { getDbStatus } from "./db";

const app = new Hono();

app.use("*", cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'x-trpc-source'],
}));

// Error handler - always return valid JSON
app.onError((err, c) => {
  console.error('[Hono] Error:', err);
  const errorMessage = err instanceof Error ? err.message : 'Internal Server Error';
  const errorStack = err instanceof Error ? err.stack : undefined;
  
  return c.json({
    error: {
      message: errorMessage,
      json: {
        message: errorMessage,
        code: -32603,
        data: {
          code: 'INTERNAL_SERVER_ERROR',
          httpStatus: 500,
          stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
        },
      },
    },
  }, 500);
});

// Health check endpoint
app.get("/health", (c) => {
  const dbStatus = getDbStatus();
  console.log('[Hono] Health check requested');
  console.log('[Hono] DB Status:', dbStatus);
  return c.json({ 
    status: "ok", 
    message: "API is running",
    database: dbStatus,
    timestamp: new Date().toISOString(),
    env: {
      hasDbUrl: !!process.env.DATABASE_URL,
    }
  });
});

// Debug endpoint to test tRPC connection
app.get("/api/debug", (c) => {
  console.log('[Hono] Debug endpoint hit');
  return c.json({ 
    status: "ok",
    trpc: "ready",
    timestamp: new Date().toISOString(),
  });
});

// tRPC middleware for all /api/trpc/* routes
app.use(
  "/api/trpc/*",
  async (c, next) => {
    try {
      const handler = trpcServer({
        endpoint: "/api/trpc",
        router: appRouter,
        createContext,
        onError: ({ error, path }) => {
          console.error(`[tRPC] Error on path ${path}:`, error);
        },
      });
      return handler(c, next);
    } catch (error) {
      console.error('[tRPC] Middleware error:', error);
      return c.json({
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          json: {
            message: error instanceof Error ? error.message : 'Unknown error',
            code: -32603,
            data: { code: 'INTERNAL_SERVER_ERROR', httpStatus: 500 },
          },
        },
      }, 500);
    }
  }
);

// Also handle /api/trpc without trailing slash
app.all("/api/trpc", (c) => {
  console.log('[Hono] tRPC root hit without path');
  return c.json({ error: 'Missing procedure path' }, 400);
});

app.get("/", (c) => {
  return c.json({ status: "ok", message: "API is running" });
});

export default app;
