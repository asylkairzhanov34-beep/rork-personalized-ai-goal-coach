import { createTRPCReact } from "@trpc/react-query";
import { createTRPCClient, httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  const url = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  
  console.log('[trpc] Checking for API base URL...');
  console.log('[trpc] EXPO_PUBLIC_RORK_API_BASE_URL:', url ? `"${url}"` : 'NOT SET');
  
  if (url) {
    // Ensure URL doesn't have trailing slash
    const cleanUrl = url.replace(/\/$/, '');
    console.log('[trpc] Using API base URL:', cleanUrl);
    return cleanUrl;
  }

  console.error('[trpc] CRITICAL: No EXPO_PUBLIC_RORK_API_BASE_URL found!');
  console.error('[trpc] Backend features will NOT work without this URL');
  console.error('[trpc] Make sure the backend is enabled in your Rork project settings');
  
  // Return empty string to make errors more obvious
  return '';
};

const createHttpLink = (url: string) => {
  console.log('[trpc] Creating HTTP link with URL:', url);
  
  return httpLink({
    url,
    transformer: superjson,
    headers() {
      return {
        'Content-Type': 'application/json',
        'x-trpc-source': 'react-native',
      };
    },
  });
};

const baseUrl = getBaseUrl();
const trpcUrl = `${baseUrl}/api/trpc`;

export const trpcReactClient = trpc.createClient({
  links: [createHttpLink(trpcUrl)],
});

export const trpcClient = createTRPCClient<AppRouter>({
  links: [createHttpLink(trpcUrl)],
});

console.log('[trpc] Clients created, base URL:', baseUrl);
console.log('[trpc] tRPC URL:', trpcUrl);
