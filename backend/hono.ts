import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import { getDbStatus } from "./db";

const app = new Hono();

app.use("*", cors());

// Error handler
app.onError((err, c) => {
  console.error('[Hono] Error:', err);
  return c.json({
    error: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
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

app.use(
  "/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext,
    onError: ({ error, path }) => {
      console.error(`[tRPC] Error on path ${path}:`, error);
    },
  })
);

app.get("/", (c) => {
  return c.json({ status: "ok", message: "API is running" });
});

export default app;
