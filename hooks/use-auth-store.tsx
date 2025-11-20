import { useState, useEffect, useCallback, useMemo } from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform, Alert } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import createContextHook from '@nkzw/create-context-hook';
import { User, AuthState, LoginCredentials, RegisterCredentials } from '@/types/auth';
import { safeStorageGet, safeStorageSet } from '@/utils/storage-helper';

WebBrowser.maybeCompleteAuthSession();

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
      console.log('[AuthProvider] Loading stored user...');
      const user = await safeStorageGet<User | null>(AUTH_STORAGE_KEY, null);
      console.log('[AuthProvider] User loaded:', user ? 'Yes' : 'No');
      
      // Use requestAnimationFrame to prevent blocking
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
      if (success) {
        setAuthState({
          user,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        throw new Error('Failed to save user data');
      }
    } catch (error) {
      console.error('Error saving user:', error);
      throw new Error('Failed to save user data');
    }
  }, []);

  const loginWithEmail = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Simulate API call - replace with your actual authentication logic
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo purposes, accept any email/password combination
      // In production, you would validate against your backend
      if (!credentials.email || !credentials.password) {
        throw new Error('Email and password are required');
      }

      const user: User = {
        id: await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          credentials.email
        ),
        email: credentials.email,
        provider: 'email',
        createdAt: new Date(),
      };

      await saveUser(user);
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, [saveUser]);

  const registerWithEmail = useCallback(async (credentials: RegisterCredentials): Promise<void> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Simulate API call - replace with your actual registration logic
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (!credentials.email || !credentials.password) {
        throw new Error('Email and password are required');
      }

      const user: User = {
        id: await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          credentials.email
        ),
        email: credentials.email,
        name: credentials.name,
        provider: 'email',
        createdAt: new Date(),
      };

      await saveUser(user);
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, [saveUser]);

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
        throw new Error('Apple Sign In failed');
      }

      const user: User = {
        id: credential.user,
        email: credential.email || `${credential.user}@privaterelay.appleid.com`,
        name: credential.fullName ? 
          `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim() : 
          undefined,
        provider: 'apple',
        createdAt: new Date(),
      };

      await saveUser(user);
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      if ((error as any)?.code === 'ERR_REQUEST_CANCELED') {
        // User canceled the sign-in flow
        return;
      }
      throw error;
    }
  }, [saveUser]);

  const googleConfig = useMemo(() => ({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '769966215817-4046hqojj6j5o395tk9n50pq6b19102t.apps.googleusercontent.com',
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '769966215817-92j42af735k7005djr2aes0vuvs1m9h1.apps.googleusercontent.com',
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '769966215817-92j42af735k7005djr2aes0vuvs1m9h1.apps.googleusercontent.com',
  }), []);

  const hasValidConfig = Platform.select({
    ios: !!googleConfig.iosClientId,
    android: !!googleConfig.androidClientId,
    web: !!googleConfig.webClientId,
    default: false,
  });

  const [, googleResponse, googlePromptAsync] = Google.useAuthRequest(googleConfig);

  const fetchGoogleUserInfo = useCallback(async (token: string) => {
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
    } catch (error) {
      console.error('Error fetching Google user info:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw new Error('Failed to get user info from Google');
    }
  }, [saveUser]);

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const { authentication } = googleResponse;
      if (authentication?.accessToken) {
        fetchGoogleUserInfo(authentication.accessToken);
      }
    }
  }, [googleResponse, fetchGoogleUserInfo]);

  const loginWithGoogle = useCallback(async (): Promise<void> => {
    if (!hasValidConfig) {
      const platform = Platform.OS;
      Alert.alert(
        'Настройка не завершена',
        `Google Sign-In для ${platform === 'ios' ? 'iOS' : platform === 'android' ? 'Android' : 'Web'} требует создания отдельного OAuth Client ID в Google Cloud Console.\n\nBundle ID: app.rork.personalized-ai-goal-coach\n\nСм. GOOGLE_AUTH_SETUP.md для инструкций.`
      );
      return;
    }

    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const result = await googlePromptAsync();
      if (result.type !== 'success') {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      console.error('Google Sign In error:', error);
      throw new Error('Google Sign In failed. Please try again.');
    }
  }, [googlePromptAsync, hasValidConfig]);

  const logout = useCallback(async (): Promise<void> => {
    try {
      // Use the safe storage helper instead of direct AsyncStorage
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

  return useMemo(() => ({
    ...authState,
    loginWithEmail,
    registerWithEmail,
    loginWithApple,
    loginWithGoogle,
    logout,
  }), [authState, loginWithEmail, registerWithEmail, loginWithApple, loginWithGoogle, logout]);
});

