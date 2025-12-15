import { useState, useEffect, useCallback, useMemo } from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import { User, AuthState } from '@/types/auth';
import { safeStorageGet, safeStorageSet } from '@/utils/storage-helper';
import { 
  initializeFirebase, 
  signInWithAppleCredential, 
  signOut as firebaseSignOut,
  deleteCurrentUser,
  subscribeToAuthState,
  FirebaseUser
} from '@/lib/firebase';

const AUTH_STORAGE_KEY = 'auth_user_firebase';
const AUTH_LOGIN_GATE_KEY = 'auth_login_gate_v1';
const FIRST_LAUNCH_KEY = 'app_first_launch_v1';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [needsLoginGate, setNeedsLoginGate] = useState<boolean>(false);
  const [requiresFirstLogin, setRequiresFirstLogin] = useState<boolean>(false);

  useEffect(() => {
    console.log('[Auth] Initializing Firebase...');
    try {
      initializeFirebase();
      setFirebaseInitialized(true);
      console.log('[Auth] Firebase initialized');
    } catch (error) {
      console.error('[Auth] Firebase init error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setInitError(errorMsg);
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    const checkFirstLaunch = async () => {
      try {
        if (Platform.OS !== 'ios') {
          setRequiresFirstLogin(false);
          return;
        }

        const hasLaunchedBefore = await safeStorageGet<boolean>(FIRST_LAUNCH_KEY, false);
        console.log('[Auth] First launch check:', { hasLaunchedBefore });

        if (!hasLaunchedBefore) {
          await safeStorageSet(FIRST_LAUNCH_KEY, true);
          setRequiresFirstLogin(true);
          console.log('[Auth] First install detected -> forcing Apple login');
        } else {
          setRequiresFirstLogin(false);
        }
      } catch (error) {
        console.error('[Auth] First launch check error:', error);
        setRequiresFirstLogin(false);
      }
    };

    checkFirstLaunch();
  }, []);

  useEffect(() => {
    if (!firebaseInitialized) return;

    console.log('[Auth] Setting up auth state listener...');

    const unsubscribe = subscribeToAuthState(async (firebaseUser) => {
      console.log('[Auth] Auth state changed:', firebaseUser ? firebaseUser.uid : 'null');

      if (firebaseUser) {
        const user = normalizeUser(firebaseUserToUser(firebaseUser));
        await safeStorageSet(AUTH_STORAGE_KEY, user);

        const gateSeen = await safeStorageGet<boolean>(AUTH_LOGIN_GATE_KEY, false);
        setNeedsLoginGate(!gateSeen);

        setAuthState({
          user,
          isLoading: false,
          isAuthenticated: true,
        });
        return;
      }

      setNeedsLoginGate(false);
      await safeStorageSet(AUTH_STORAGE_KEY, null);

      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    });

    return () => {
      console.log('[Auth] Cleaning up auth listener');
      unsubscribe();
    };
  }, [firebaseInitialized]);

  const normalizeUser = (user: User): User => {
    const createdAt = user.createdAt instanceof Date ? user.createdAt : new Date(user.createdAt);
    return {
      ...user,
      createdAt,
    };
  };

  const firebaseUserToUser = (firebaseUser: FirebaseUser): User => {
    return {
      id: firebaseUser.uid,
      email: firebaseUser.email || 'unknown@email.com',
      name: firebaseUser.displayName || undefined,
      provider: 'apple',
      createdAt: new Date(firebaseUser.metadata.creationTime || Date.now()),
    };
  };

  const generateNonce = async (): Promise<string> => {
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    return Array.from(new Uint8Array(randomBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const markLoginGateSeen = useCallback(async (): Promise<void> => {
    console.log('[Auth] Marking login gate as seen');
    await safeStorageSet(AUTH_LOGIN_GATE_KEY, true);
    setNeedsLoginGate(false);
    setRequiresFirstLogin(false);
  }, []);

  const loginWithApple = useCallback(async (): Promise<'success' | 'canceled'> => {
    console.log('[Auth] ========== Apple Login Started ==========');
    
    if (!firebaseInitialized) {
      throw new Error(initError || 'Firebase not initialized');
    }
    
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign In is only available on iOS');
    }

    setAuthState(prev => ({ ...prev, isLoading: true }));

    try {
      const nonce = await generateNonce();
      console.log('[Auth] Generated nonce');
      
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        nonce
      );
      console.log('[Auth] Hashed nonce');

      console.log('[Auth] Requesting Apple credentials...');
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      console.log('[Auth] Apple credential received');
      console.log('[Auth] - User ID:', credential.user.substring(0, 20) + '...');
      console.log('[Auth] - Has token:', !!credential.identityToken);

      if (!credential.identityToken) {
        throw new Error('Apple did not return an authorization token');
      }

      console.log('[Auth] Signing in to Firebase...');
      const firebaseUser = await signInWithAppleCredential(credential.identityToken, nonce);
      
      console.log('[Auth] Firebase sign in successful');
      console.log('[Auth] - Firebase UID:', firebaseUser.uid);
      console.log('[Auth] - Email:', firebaseUser.email);

      await markLoginGateSeen();

      console.log('[Auth] ========== Login Success ==========');
      return 'success';

    } catch (error: unknown) {
      console.error('[Auth] Login error:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));

      if (error && typeof error === 'object' && 'code' in error) {
        const errorCode = (error as { code: string }).code;
        console.log('[Auth] Error code:', errorCode);
        
        if (errorCode === 'ERR_REQUEST_CANCELED' || errorCode === 'ERR_CANCELED') {
          console.log('[Auth] User canceled login');
          return 'canceled';
        }
        
        if (errorCode === 'auth/invalid-credential') {
          throw new Error('Authentication error. Please try again.');
        }
        
        if (errorCode === 'auth/operation-not-allowed') {
          throw new Error('Apple Sign-In is not enabled in Firebase. Check settings.');
        }
      }

      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error('Unknown authentication error');
    }
  }, [firebaseInitialized, initError, markLoginGateSeen]);

  const logout = useCallback(async (): Promise<void> => {
    console.log('[Auth] Logging out...');
    try {
      await firebaseSignOut();
      await safeStorageSet(AUTH_STORAGE_KEY, null);
      await safeStorageSet(AUTH_LOGIN_GATE_KEY, false);
      setNeedsLoginGate(false);
      setRequiresFirstLogin(false);
      console.log('[Auth] Logout complete');
    } catch (error) {
      console.error('[Auth] Logout error:', error);
      await safeStorageSet(AUTH_STORAGE_KEY, null);
      await safeStorageSet(AUTH_LOGIN_GATE_KEY, false);
      setNeedsLoginGate(false);
      setRequiresFirstLogin(false);
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  const deleteAccount = useCallback(async (): Promise<boolean> => {
    console.log('[Auth] Deleting account...');
    
    try {
      await deleteCurrentUser();
      await safeStorageSet(AUTH_STORAGE_KEY, null);
      await safeStorageSet(AUTH_LOGIN_GATE_KEY, false);
      setNeedsLoginGate(false);
      setRequiresFirstLogin(false);
      console.log('[Auth] Account deleted');
      return true;
    } catch (error) {
      console.error('[Auth] Delete error:', error);
      
      if (error && typeof error === 'object' && 'code' in error) {
        const errorCode = (error as { code: string }).code;
        if (errorCode === 'auth/requires-recent-login') {
          throw new Error('Please sign in again to delete your account');
        }
      }
      
      return false;
    }
  }, []);

  return useMemo(() => ({
    ...authState,
    firebaseInitialized,
    initError,
    needsLoginGate,
    requiresFirstLogin,
    markLoginGateSeen,
    loginWithApple,
    logout,
    deleteAccount,
  }), [authState, firebaseInitialized, initError, needsLoginGate, requiresFirstLogin, markLoginGateSeen, loginWithApple, logout, deleteAccount]);
});
