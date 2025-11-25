import { useState, useEffect, useCallback, useMemo } from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform, Alert } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import createContextHook from '@nkzw/create-context-hook';
import { User, AuthState, LoginCredentials, RegisterCredentials } from '@/types/auth';
import { safeStorageGet, safeStorageSet } from '@/utils/storage-helper';
import { trpcClient } from '@/lib/trpc';

WebBrowser.maybeCompleteAuthSession();

const AUTH_STORAGE_KEY = 'auth_user';
const AUTH_SESSIONS_KEY = 'auth_sessions';
const CURRENT_SESSION_KEY = 'current_session';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const AUTH_DB_KEY = 'registered_users';

interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  name?: string;
  createdAt: string;
}

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
      // Validate email format
      if (!credentials.email || !EMAIL_REGEX.test(credentials.email)) {
        throw new Error('Invalid email format');
      }
      
      if (!credentials.password || credentials.password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }
      
      // Get registered users
      const usersJson = await safeStorageGet<string | null>(AUTH_DB_KEY, null);
      const users: Record<string, StoredUser> = usersJson ? JSON.parse(usersJson) : {};
      
      // Find user by email
      const userEntry = Object.values(users).find(u => u.email.toLowerCase() === credentials.email.toLowerCase());
      
      if (!userEntry) {
        throw new Error('User not found. Please register first.');
      }
      
      // Hash the password for comparison
      const passwordHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        credentials.email.toLowerCase() + credentials.password
      );
      
      if (userEntry.passwordHash !== passwordHash) {
        throw new Error('Incorrect password');
      }

      const user: User = {
        id: userEntry.id,
        email: userEntry.email,
        name: userEntry.name,
        provider: 'email',
        createdAt: new Date(userEntry.createdAt),
      };
      
      // Store session
      const sessionId = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${userEntry.id}-${Date.now()}`
      );
      
      await safeStorageSet(CURRENT_SESSION_KEY, sessionId);
      
      // Store session data
      const sessions = await safeStorageGet<Record<string, any>>(AUTH_SESSIONS_KEY, {});
      sessions[sessionId] = {
        userId: userEntry.id,
        email: userEntry.email,
        loginAt: new Date().toISOString(),
      };
      await safeStorageSet(AUTH_SESSIONS_KEY, sessions);

      await saveUser(user);
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, [saveUser]);

  const registerWithEmail = useCallback(async (credentials: RegisterCredentials): Promise<void> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Validate email format
      if (!credentials.email || !EMAIL_REGEX.test(credentials.email)) {
        throw new Error('Please enter a valid email address');
      }
      
      if (!credentials.password || credentials.password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }
      
      // Get existing users
      const usersJson = await safeStorageGet<string | null>(AUTH_DB_KEY, null);
      const users: Record<string, StoredUser> = usersJson ? JSON.parse(usersJson) : {};
      
      // Check if user already exists
      const exists = Object.values(users).some(u => u.email.toLowerCase() === credentials.email.toLowerCase());
      if (exists) {
        throw new Error('An account with this email already exists');
      }
      
      // Create new user
      const userId = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        credentials.email.toLowerCase()
      );
      
      const passwordHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        credentials.email.toLowerCase() + credentials.password
      );
      
      const newUser: StoredUser = {
        id: userId,
        email: credentials.email,
        passwordHash,
        name: credentials.name,
        createdAt: new Date().toISOString(),
      };
      
      // Save to storage
      users[userId] = newUser;
      await safeStorageSet(AUTH_DB_KEY, JSON.stringify(users));

      const user: User = {
        id: userId,
        email: credentials.email,
        name: credentials.name,
        provider: 'email',
        createdAt: new Date(),
      };
      
      // Create session
      const sessionId = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${userId}-${Date.now()}`
      );
      
      await safeStorageSet(CURRENT_SESSION_KEY, sessionId);
      
      // Store session data
      const sessions = await safeStorageGet<Record<string, any>>(AUTH_SESSIONS_KEY, {});
      sessions[sessionId] = {
        userId,
        email: credentials.email,
        loginAt: new Date().toISOString(),
      };
      await safeStorageSet(AUTH_SESSIONS_KEY, sessions);

      await saveUser(user);
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, [saveUser]);

  const loginWithApple = useCallback(async (): Promise<'success' | 'canceled'> => {
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
        setAuthState(prev => ({ ...prev, isLoading: false }));
        throw new Error('Apple Sign In failed: No identity token');
      }

      // Call backend to verify and login
      console.log('[AuthProvider] Calling backend auth.loginWithApple...');
      
      let response;
      try {
        console.log('[AuthProvider] Attempting backend auth.loginWithApple...');
        response = await trpcClient.auth.loginWithApple.mutate({
          identityToken: credential.identityToken,
          email: credential.email || undefined,
          fullName: credential.fullName ? 
            `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim() : 
            undefined,
        });
        console.log('[AuthProvider] Backend response received:', JSON.stringify(response, null, 2));
      } catch (backendError: any) {
        console.error('[AuthProvider] Backend call failed:', backendError);
        console.error('[AuthProvider] Backend error message:', backendError?.message);
        console.error('[AuthProvider] Backend error cause:', backendError?.cause);
        
        // If backend fails, create local user (fallback)
        console.log('[AuthProvider] Using local fallback user');
        const localUser: User = {
          id: `apple_${credential.user}`,
          email: credential.email || `${credential.user}@privaterelay.appleid.com`,
          name: credential.fullName ? 
            `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim() : 
            undefined,
          provider: 'apple',
          createdAt: new Date(),
        };
        await saveUser(localUser);
        return 'success';
      }

      const user: User = {
        id: response.user.id,
        email: response.user.email || `${credential.user}@privaterelay.appleid.com`,
        name: response.user.name || undefined,
        provider: 'apple',
        createdAt: new Date(),
      };

      await saveUser(user);
      return 'success';
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      if ((error as any)?.code === 'ERR_REQUEST_CANCELED') {
        console.log('[AuthProvider] Apple Sign-In canceled by user');
        return 'canceled';
      }
      console.error('Apple Login Error:', error);
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
      // Clear current session
      const sessionId = await safeStorageGet<string | null>(CURRENT_SESSION_KEY, null);
      if (sessionId) {
        const sessions = await safeStorageGet<Record<string, any>>(AUTH_SESSIONS_KEY, {});
        delete sessions[sessionId];
        await safeStorageSet(AUTH_SESSIONS_KEY, sessions);
      }
      
      // Clear auth data
      await safeStorageSet(AUTH_STORAGE_KEY, null);
      await safeStorageSet(CURRENT_SESSION_KEY, null);
      
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

