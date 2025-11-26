import { Hono } from "hono";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import { getDbStatus } from "./db";

console.log('[Hono] Server starting...');
console.log('[Hono] Routes available: /health, /api/debug, /api/trpc/*');

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

// Simple ping endpoint
app.get("/api/ping", (c) => {
  console.log('[Hono] Ping endpoint hit');
  return c.json({ pong: true, timestamp: Date.now() });
});

// tRPC middleware for all /api/trpc/* routes
app.all(
  "/api/trpc/*",
  async (c) => {
    console.log('[Hono] tRPC request received:', c.req.url);
    console.log('[Hono] Request method:', c.req.method);
    console.log('[Hono] Request path:', c.req.path);
    
    try {
      const response = await fetchRequestHandler({
        endpoint: "/api/trpc",
        req: c.req.raw,
        router: appRouter,
        createContext,
        onError: ({ error, path }) => {
          console.error(`[tRPC] Error on path ${path}:`, error);
        },
      });
      console.log('[Hono] tRPC request handled successfully');
      return response;
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

// Catch-all for unmatched routes - helps debugging
app.all("*", (c) => {
  const path = c.req.path;
  console.log('[Hono] 404 - Unmatched route:', path);
  console.log('[Hono] Method:', c.req.method);
  
  // Return JSON 404 instead of plain text
  return c.json({
    error: {
      message: `Route not found: ${path}`,
      code: 'NOT_FOUND',
      availableRoutes: ['/', '/health', '/api/debug', '/api/ping', '/api/trpc/*'],
    },
  }, 404);
});

console.log('[Hono] Server configured and ready');

export default app;
