import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_RORK_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  }

  console.warn('[trpc] No EXPO_PUBLIC_RORK_API_BASE_URL found');
  return 'https://fallback-url.com';
};

let trpcClientInstance: ReturnType<typeof trpc.createClient>;

try {
  trpcClientInstance = trpc.createClient({
    links: [
      httpLink({
        url: `${getBaseUrl()}/api/trpc`,
        transformer: superjson,
      }),
    ],
  });
  console.log('[trpc] Client created successfully');
} catch (error) {
  console.error('[trpc] Failed to create client:', error);
  trpcClientInstance = trpc.createClient({
    links: [
      httpLink({
        url: 'https://fallback-url.com/api/trpc',
        transformer: superjson,
      }),
    ],
  });
}

export const trpcClient = trpcClientInstance;
