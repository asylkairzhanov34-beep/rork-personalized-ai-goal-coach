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
    fetch: async (input, init) => {
      const requestUrl = typeof input === 'string' ? input : (input instanceof URL ? input.href : (input as Request).url);
      console.log('[trpc] ===== REQUEST START =====');
      console.log('[trpc] Full URL:', requestUrl);
      console.log('[trpc] Method:', init?.method || 'GET');
      
      if (!requestUrl || requestUrl.includes('undefined') || requestUrl.startsWith('/api')) {
        console.error('[trpc] INVALID URL detected!');
        console.error('[trpc] Base URL might be empty or undefined');
        throw new Error('Invalid tRPC URL. Backend URL not configured properly.');
      }
      
      try {
        const response = await fetch(input, {
          ...init,
          headers: {
            ...init?.headers,
            'Content-Type': 'application/json',
          },
        });
        
        console.log('[trpc] Response status:', response.status);
        
        // Clone the response to read it twice
        const responseClone = response.clone();
        const text = await responseClone.text();
        console.log('[trpc] Response body (first 300 chars):', text.substring(0, 300));
        
        // Check if response is actually JSON
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          console.error('[trpc] Non-JSON response received');
          console.error('[trpc] Content-Type:', contentType);
          
          // Try to parse as JSON anyway (some servers don't set correct content-type)
          try {
            JSON.parse(text);
            console.log('[trpc] Body is valid JSON despite wrong content-type');
            // Return a new response with correct content-type
            return new Response(text, {
              status: response.status,
              statusText: response.statusText,
              headers: {
                'content-type': 'application/json',
              },
            });
          } catch {
            console.error('[trpc] Body is not valid JSON');
            throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
          }
        }
        
        console.log('[trpc] ===== REQUEST SUCCESS =====');
        return response;
      } catch (error) {
        console.error('[trpc] ===== REQUEST FAILED =====');
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
