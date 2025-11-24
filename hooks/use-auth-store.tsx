import { useState, useEffect, useCallback, useMemo } from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { User, AuthState, LoginCredentials, RegisterCredentials } from '@/types/auth';
import { trpcClient } from '@/lib/trpc';

const AUTH_STORAGE_KEY = '@auth_session';

interface StoredSession {
  token: string;
  user: User;
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const sessionStr = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        
        if (mounted) {
          if (sessionStr) {
            const session: StoredSession = JSON.parse(sessionStr);
            setAuthState({
              user: session.user,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            setAuthState({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        }
      } catch (error) {
        console.error('[Auth] Error loading session:', error);
        if (mounted) {
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  const loginWithEmail = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    // Disabled as per request
    throw new Error('Email login is disabled');
  }, []);

  const registerWithEmail = useCallback(async (credentials: RegisterCredentials): Promise<void> => {
     // Disabled as per request
     throw new Error('Email registration is disabled');
  }, []);

  const loginWithApple = useCallback(async (): Promise<void> => {
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign In is only available on iOS');
    }

    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error('Apple Sign In failed: No identity token');
      }

      const name = credential.fullName 
        ? [credential.fullName.givenName, credential.fullName.familyName]
            .filter(Boolean)
            .join(' ')
        : undefined;

      console.log('[Auth] Authenticating with backend...');
      const result = await trpcClient.auth.loginWithApple.mutate({
        identityToken: credential.identityToken,
        email: credential.email || undefined,
        fullName: name,
      });

      console.log('[Auth] Login successful:', result.user.id);

      const user: User = {
        id: result.user.id,
        email: result.user.email || '',
        name: result.user.name || undefined,
        provider: 'apple',
        createdAt: new Date(),
      };

      const session: StoredSession = {
        token: result.token,
        user,
      };

      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));

      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
      });

    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      
      if ((error as any)?.code === 'ERR_REQUEST_CANCELED') {
        throw error;
      }
      
      console.error('[Auth] Apple Login Error:', error);
      throw error;
    }
  }, []);

  const loginWithGoogle = useCallback(async (): Promise<void> => {
     // Not implementing Google Auth right now as focusing on Apple
     throw new Error('Google login not implemented with Supabase yet');
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error('[Auth] Error during logout:', error);
      throw new Error('Failed to logout');
    }
  }, []);

  return useMemo(() => ({
    ...authState,
    loginWithEmail,
    registerWithEmail,
    loginWithApple,
    loginWithGoogle,
    logout,
  }), [authState, loginWithEmail, registerWithEmail, loginWithApple, loginWithGoogle, logout]);
});
