import { useState, useEffect, useCallback, useMemo } from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import { User, AuthState } from '@/types/auth';
import { safeStorageGet, safeStorageSet } from '@/utils/storage-helper';
import { trpcClient, getTRPCErrorMessage } from '@/lib/trpc';

const AUTH_STORAGE_KEY = 'auth_user_v2';
const AUTH_TOKEN_KEY = 'auth_token';

interface BackendUser {
  id: string;
  email: string;
  name: string | null;
  isPremium: boolean;
}

interface LoginResponse {
  success: boolean;
  token: string;
  user: BackendUser;
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });
  const [authToken, setAuthToken] = useState<string | null>(null);

  const loadStoredUser = useCallback(async () => {
    console.log('[Auth] Loading stored user...');
    try {
      const [storedUser, storedToken] = await Promise.all([
        safeStorageGet<User | null>(AUTH_STORAGE_KEY, null),
        safeStorageGet<string | null>(AUTH_TOKEN_KEY, null),
      ]);
      
      console.log('[Auth] Stored user:', storedUser ? storedUser.id : 'none');
      console.log('[Auth] Stored token:', storedToken ? 'exists' : 'none');
      
      if (storedUser && storedToken) {
        setAuthToken(storedToken);
        setAuthState({
          user: storedUser,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    } catch (error) {
      console.error('[Auth] Load error:', error);
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  const saveUserData = useCallback(async (user: User, token: string) => {
    console.log('[Auth] Saving user data...');
    try {
      await Promise.all([
        safeStorageSet(AUTH_STORAGE_KEY, user),
        safeStorageSet(AUTH_TOKEN_KEY, token),
      ]);
      
      setAuthToken(token);
      setAuthState({
        user,
        isLoading: false,
        isAuthenticated: true,
      });
      
      console.log('[Auth] User data saved successfully');
    } catch (error) {
      console.error('[Auth] Save error:', error);
      throw new Error('Не удалось сохранить данные пользователя');
    }
  }, []);

  const clearUserData = useCallback(async () => {
    console.log('[Auth] Clearing user data...');
    try {
      await Promise.all([
        safeStorageSet(AUTH_STORAGE_KEY, null),
        safeStorageSet(AUTH_TOKEN_KEY, null),
      ]);
      
      setAuthToken(null);
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
      
      console.log('[Auth] User data cleared');
    } catch (error) {
      console.error('[Auth] Clear error:', error);
    }
  }, []);

  const loginWithApple = useCallback(async (): Promise<'success' | 'canceled'> => {
    console.log('[Auth] ========== Apple Login Started ==========');
    
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign In доступен только на iOS');
    }

    setAuthState(prev => ({ ...prev, isLoading: true }));

    try {
      console.log('[Auth] Requesting Apple credentials...');
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      console.log('[Auth] Apple credential received');
      console.log('[Auth] - User ID:', credential.user.substring(0, 20) + '...');
      console.log('[Auth] - Has token:', !!credential.identityToken);
      console.log('[Auth] - Email:', credential.email || 'hidden');

      if (!credential.identityToken) {
        throw new Error('Apple не вернул токен авторизации');
      }

      const fullName = credential.fullName
        ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim() || null
        : null;

      console.log('[Auth] Calling backend...');
      console.log('[Auth] Backend URL check:', !!process.env.EXPO_PUBLIC_RORK_API_BASE_URL);

      let response: LoginResponse;
      
      try {
        response = await trpcClient.auth.loginWithApple.mutate({
          identityToken: credential.identityToken,
          email: credential.email || null,
          fullName: fullName,
        });
        
        console.log('[Auth] Backend response received');
        console.log('[Auth] - Success:', response.success);
        console.log('[Auth] - User ID:', response.user?.id);
        console.log('[Auth] - Token:', response.token ? 'received' : 'missing');
      } catch (backendError) {
        console.error('[Auth] Backend error:', backendError);
        const errorMsg = getTRPCErrorMessage(backendError);
        console.error('[Auth] Error message:', errorMsg);
        
        if (errorMsg.includes('fetch') || errorMsg.includes('network') || errorMsg.includes('Network')) {
          throw new Error('Нет подключения к серверу. Проверьте интернет.');
        }
        
        if (errorMsg.includes('404') || errorMsg.includes('Not Found')) {
          throw new Error('Сервер авторизации недоступен.');
        }
        
        throw new Error(`Ошибка сервера: ${errorMsg}`);
      }

      if (!response || !response.success || !response.user || !response.token) {
        console.error('[Auth] Invalid response structure:', response);
        throw new Error('Сервер вернул некорректные данные');
      }

      const user: User = {
        id: response.user.id,
        email: response.user.email,
        name: response.user.name || undefined,
        provider: 'apple',
        createdAt: new Date(),
      };

      await saveUserData(user, response.token);
      
      console.log('[Auth] ========== Login Success ==========');
      return 'success';

    } catch (error: unknown) {
      console.error('[Auth] Login error:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));

      if (error && typeof error === 'object' && 'code' in error) {
        const errorCode = (error as { code: string }).code;
        if (errorCode === 'ERR_REQUEST_CANCELED' || errorCode === 'ERR_CANCELED') {
          console.log('[Auth] User canceled login');
          return 'canceled';
        }
      }

      throw error;
    }
  }, [saveUserData]);

  const logout = useCallback(async (): Promise<void> => {
    console.log('[Auth] Logging out...');
    await clearUserData();
    console.log('[Auth] Logout complete');
  }, [clearUserData]);

  const deleteAccount = useCallback(async (): Promise<boolean> => {
    console.log('[Auth] Deleting account...');
    
    try {
      const result = await trpcClient.auth.deleteAccount.mutate();
      console.log('[Auth] Delete result:', result);
      
      await clearUserData();
      return true;
    } catch (error) {
      console.error('[Auth] Delete error:', error);
      await clearUserData();
      return false;
    }
  }, [clearUserData]);

  useEffect(() => {
    loadStoredUser();
  }, [loadStoredUser]);

  return useMemo(() => ({
    ...authState,
    authToken,
    loginWithApple,
    logout,
    deleteAccount,
  }), [authState, authToken, loginWithApple, logout, deleteAccount]);
});
