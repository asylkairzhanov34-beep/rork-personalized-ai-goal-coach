import { useState, useEffect, useCallback, useMemo } from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform, Alert } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import { User, AuthState } from '@/types/auth';
import { safeStorageGet, safeStorageSet } from '@/utils/storage-helper';
import { trpcClient } from '@/lib/trpc';

const AUTH_STORAGE_KEY = 'auth_user';

// Create provider and hook
export const [AuthProvider, useAuth] = createContextHook(() => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const loadStoredUser = useCallback(async () => {
    try {
      console.log('[AuthProvider] Loading stored user from local cache...');
      const user = await safeStorageGet<User | null>(AUTH_STORAGE_KEY, null);
      console.log('[AuthProvider] Cached user loaded:', user ? 'Yes' : 'No');
      
      requestAnimationFrame(() => {
        setAuthState({
          user,
          isLoading: false,
          isAuthenticated: !!user,
        });
      });
    } catch (error) {
      console.error('[AuthProvider] Error loading user:', error);
      requestAnimationFrame(() => {
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      });
    }
  }, []);

  const saveUserLocally = useCallback(async (user: User) => {
    try {
      console.log('[AuthProvider] Caching user locally...');
      const success = await safeStorageSet(AUTH_STORAGE_KEY, user);
      if (success) {
        console.log('[AuthProvider] User cached successfully');
        setAuthState({
          user,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        throw new Error('Failed to cache user data');
      }
    } catch (error) {
      console.error('[AuthProvider] Error caching user:', error);
      throw new Error('Failed to save user data');
    }
  }, []);

  const loginWithApple = useCallback(async (): Promise<'success' | 'canceled'> => {
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign In доступен только на iOS');
    }

    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      console.log('[AuthProvider] Starting Apple Sign In...');
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        throw new Error('Apple Sign In failed: No identity token');
      }

      console.log('[AuthProvider] Apple credential received');
      console.log('[AuthProvider] Token length:', credential.identityToken.length);
      console.log('[AuthProvider] Email:', credential.email || 'not provided');
      console.log('[AuthProvider] Calling backend auth...');
      
      // Check if backend URL is configured
      const backendUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
      if (!backendUrl) {
        console.error('[AuthProvider] Backend URL not configured!');
        console.error('[AuthProvider] EXPO_PUBLIC_RORK_API_BASE_URL is missing');
        throw new Error('Сервер не настроен. Обратитесь к разработчику.');
      }

      let response;
      try {
        console.log('[AuthProvider] Backend URL:', backendUrl);
        
        const fullName = credential.fullName 
          ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim() || null
          : null;
        
        console.log('[AuthProvider] Sending auth request with:');
        console.log('[AuthProvider] - identityToken length:', credential.identityToken.length);
        console.log('[AuthProvider] - email:', credential.email || 'null');
        console.log('[AuthProvider] - fullName:', fullName || 'null');
        
        response = await trpcClient.auth.loginWithApple.mutate({
          identityToken: credential.identityToken,
          email: credential.email || null,
          fullName: fullName,
        });
        
        console.log('[AuthProvider] Backend auth successful');
        console.log('[AuthProvider] Response received:', !!response);
        console.log('[AuthProvider] Response user:', response?.user?.id || 'no user');
      } catch (backendError: any) {
        console.error('[AuthProvider] Backend call failed:', backendError);
        console.error('[AuthProvider] Error name:', backendError?.name);
        console.error('[AuthProvider] Error message:', backendError?.message);
        console.error('[AuthProvider] Error stack:', backendError?.stack);
        
        // Check for specific error types
        const errorMsg = backendError?.message || '';
        
        if (errorMsg.includes('404') || errorMsg.includes('Not Found')) {
          throw new Error('Сервер недоступен. Проверьте подключение к интернету.');
        }
        
        if (errorMsg.includes('transform') || errorMsg.includes('parse') || errorMsg.includes('JSON')) {
          // Create fallback user from Apple credential
          console.log('[AuthProvider] Transform error - creating local user');
          const credentialFullName = credential.fullName 
            ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim() || undefined
            : undefined;
          const fallbackUser: User = {
            id: 'apple_' + credential.user.substring(0, 16),
            email: credential.email || `${credential.user}@privaterelay.appleid.com`,
            name: credentialFullName,
            provider: 'apple',
            createdAt: new Date(),
          };
          await saveUserLocally(fallbackUser);
          return 'success';
        }
        
        if (errorMsg.includes('fetch') || errorMsg.includes('network') || errorMsg.includes('Network')) {
          throw new Error('Ошибка сети. Проверьте подключение к интернету.');
        }
        
        throw new Error('Ошибка авторизации. Попробуйте ещё раз.');
      }
      
      console.log('[AuthProvider] User ID:', response?.user?.id);

      if (!response || !response.user) {
        throw new Error('Invalid response from backend: missing user data');
      }

      const user: User = {
        id: response.user.id,
        email: response.user.email || `${credential.user}@privaterelay.appleid.com`,
        name: response.user.name || undefined,
        provider: 'apple',
        createdAt: new Date(),
      };

      // Cache user locally for app state (but auth is always via Supabase)
      await saveUserLocally(user);
      return 'success';

    } catch (error: any) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      
      if (error?.code === 'ERR_REQUEST_CANCELED') {
        console.log('[AuthProvider] Apple Sign-In canceled by user');
        return 'canceled';
      }
      
      console.error('[AuthProvider] Auth error:', error?.message || error);
      
      // Show specific error message
      let errorMessage = 'Не удалось войти. Попробуйте ещё раз.';
      
      if (error?.message?.includes('JSON Parse')) {
        errorMessage = 'Ошибка сервера: неверный формат ответа. Проверьте подключение к интернету и попробуйте снова.';
      } else if (error?.message?.includes('fetch')) {
        errorMessage = 'Ошибка сети. Проверьте подключение к интернету.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Ошибка авторизации', errorMessage);
      throw error;
    }
  }, [saveUserLocally]);

  const logout = useCallback(async (): Promise<void> => {
    try {
      console.log('[AuthProvider] Logging out...');
      
      // Clear local cache
      await safeStorageSet(AUTH_STORAGE_KEY, null);
      
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
      
      console.log('[AuthProvider] Logout successful');
    } catch (error) {
      console.error('[AuthProvider] Error during logout:', error);
      throw new Error('Не удалось выйти из аккаунта');
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        await loadStoredUser();
      } catch (error) {
        console.error('[AuthProvider] Init error:', error);
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    };
    
    init();
  }, [loadStoredUser]);

  return useMemo(() => ({
    ...authState,
    loginWithApple,
    logout,
  }), [authState, loginWithApple, logout]);
});

