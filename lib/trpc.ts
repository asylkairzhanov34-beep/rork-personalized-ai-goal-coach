import { createTRPCReact } from "@trpc/react-query";
import { createTRPCClient, httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  const url = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  
  if (url) {
    console.log('[trpc] Using API base URL:', url);
    return url;
  }

  console.error('[trpc] CRITICAL: No EXPO_PUBLIC_RORK_API_BASE_URL found!');
  console.error('[trpc] Backend features will NOT work without this URL');
  console.error('[trpc] Make sure the backend is enabled in your Rork project settings');
  
  // Return empty string to make errors more obvious
  return '';
};

const createHttpLink = (url: string) => {
  return httpLink({
    url,
    transformer: superjson,
    fetch: async (input, init) => {
      console.log('[trpc] Fetching:', input);
      
      try {
        const response = await fetch(input, init);
        
        console.log('[trpc] Response status:', response.status);
        console.log('[trpc] Response headers:', JSON.stringify([...response.headers.entries()]));
        
        // Clone the response to read it twice
        const responseClone = response.clone();
        const text = await responseClone.text();
        console.log('[trpc] Response body (first 200 chars):', text.substring(0, 200));
        
        // Check if response is actually JSON
        if (!response.headers.get('content-type')?.includes('application/json')) {
          console.error('[trpc] Non-JSON response received');
          console.error('[trpc] Content-Type:', response.headers.get('content-type'));
          console.error('[trpc] Response body:', text);
          throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
        }
        
        return response;
      } catch (error) {
        console.error('[trpc] Fetch error:', error);
        throw error;
      }
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
