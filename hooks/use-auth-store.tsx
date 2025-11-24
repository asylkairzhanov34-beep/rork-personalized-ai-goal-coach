import { useState, useEffect, useCallback, useMemo } from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform, Alert } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import createContextHook from '@nkzw/create-context-hook';
import { User, AuthState } from '@/types/auth';
import { safeStorageGet, safeStorageSet } from '@/utils/storage-helper';
import { trpcClient } from '@/lib/trpc';

WebBrowser.maybeCompleteAuthSession();

const AUTH_STORAGE_KEY = 'auth_user';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const loadStoredUser = useCallback(async () => {
    try {
      const user = await safeStorageGet<User | null>(AUTH_STORAGE_KEY, null);
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

  const saveUser = useCallback(async (user: User) => {
    try {
      const success = await safeStorageSet(AUTH_STORAGE_KEY, user);
      if (!success) {
        throw new Error('Failed to save user data');
      }

      setAuthState({
        user,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch (error) {
      console.error('[AuthProvider] Error saving user:', error);
      throw new Error('Failed to save user data');
    }
  }, []);

  const loginWithApple = useCallback(async (): Promise<User | null> => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Недоступно', 'Apple Sign In доступен только на iOS устройствах');
      return null;
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

      const response = await trpcClient.auth.loginWithApple.mutate({
        identityToken: credential.identityToken,
        email: credential.email || undefined,
        fullName: credential.fullName
          ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
          : undefined,
      });

      const user: User = {
        id: response.user.id,
        email: response.user.email || `${credential.user}@privaterelay.appleid.com`,
        name: response.user.name || undefined,
        provider: 'apple',
        createdAt: new Date(),
      };

      await saveUser(user);
      return user;
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      const code = (error as { code?: string } | undefined)?.code;
      if (code === 'ERR_CANCELED' || code === 'ERR_REQUEST_CANCELED') {
        console.log('[AuthProvider] Apple Sign-In cancelled by user');
        return null;
      }
      console.error('Apple Login Error:', error);
      throw error;
    }
  }, [saveUser]);

  const googleConfig = useMemo(
    () => ({
      iosClientId:
        process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
        '769966215817-4046hqojj6j5o395tk9n50pq6b19102t.apps.googleusercontent.com',
      androidClientId:
        process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
        '769966215817-92j42af735k7005djr2aes0vuvs1m9h1.apps.googleusercontent.com',
      webClientId:
        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
        '769966215817-92j42af735k7005djr2aes0vuvs1m9h1.apps.googleusercontent.com',
    }),
    [],
  );

  const hasValidConfig = Platform.select({
    ios: !!googleConfig.iosClientId,
    android: !!googleConfig.androidClientId,
    web: !!googleConfig.webClientId,
    default: false,
  });

  const [, googleResponse, googlePromptAsync] = Google.useAuthRequest(googleConfig);

  const fetchGoogleUserInfo = useCallback(
    async (token: string) => {
      try {
        const response = await fetch('https://www.googleapis.com/userinfo/v2/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const userInfo = await response.json();

        const user: User = {
          id: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          provider: 'google',
          createdAt: new Date(),
        };

        await saveUser(user);
        return user;
      } catch (error) {
        console.error('Error fetching Google user info:', error);
        setAuthState(prev => ({ ...prev, isLoading: false }));
        throw new Error('Failed to get user info from Google');
      }
    },
    [saveUser],
  );

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const { authentication } = googleResponse;
      if (authentication?.accessToken) {
        fetchGoogleUserInfo(authentication.accessToken).catch(err => {
          console.error('[AuthProvider] Google fetch error:', err);
        });
      }
    }
  }, [googleResponse, fetchGoogleUserInfo]);

  const loginWithGoogle = useCallback(async (): Promise<User | null> => {
    if (!hasValidConfig) {
      const platform = Platform.OS;
      Alert.alert(
        'Настройка не завершена',
        `Google Sign-In для ${platform === 'ios' ? 'iOS' : platform === 'android' ? 'Android' : 'Web'} требует конфигурации OAuth в Google Cloud Console.\n\nBundle ID: app.rork.personalized-ai-goal-coach`,
      );
      return null;
    }

    setAuthState(prev => ({ ...prev, isLoading: true }));

    try {
      const result = await googlePromptAsync();
      if (result.type !== 'success') {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return null;
      }
      return null;
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      console.error('Google Sign In error:', error);
      throw new Error('Google Sign In failed. Please try again.');
    }
  }, [googlePromptAsync, hasValidConfig]);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await safeStorageSet(AUTH_STORAGE_KEY, null);
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error('Error during logout:', error);
      throw new Error('Failed to logout');
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

  return useMemo(
    () => ({
      ...authState,
      loginWithApple,
      loginWithGoogle,
      logout,
    }),
    [authState, loginWithApple, loginWithGoogle, logout],
  );
});
