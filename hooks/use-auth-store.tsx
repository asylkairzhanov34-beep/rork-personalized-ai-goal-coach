import { useState, useEffect, useCallback, useMemo } from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import { User, AuthState, LoginCredentials, RegisterCredentials } from '@/types/auth';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

// Create provider and hook
export const [AuthProvider, useAuth] = createContextHook(() => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Map Supabase session user to our User type
  const mapUser = useCallback((sessionUser: Session['user'] | null): User | null => {
    if (!sessionUser) return null;
    
    return {
      id: sessionUser.id,
      email: sessionUser.email || '',
      name: sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name,
      provider: (sessionUser.app_metadata?.provider as any) || 'email',
      createdAt: new Date(sessionUser.created_at),
    };
  }, []);

  // Initialize Auth
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (mounted) {
          setAuthState({
            user: mapUser(session?.user ?? null),
            isAuthenticated: !!session,
            isLoading: false,
          });
        }
      } catch (error) {
        console.error('Error loading session:', error);
        if (mounted) {
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      }
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setAuthState({
          user: mapUser(session?.user ?? null),
          isAuthenticated: !!session,
          isLoading: false,
        });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [mapUser]);

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

      // Sign in with Supabase using the ID token
      const { error, data } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) throw error;
      
      // If we have a name from Apple (only on first login), update the user metadata
      if (credential.fullName && data.user) {
        const name = [credential.fullName.givenName, credential.fullName.familyName]
          .filter(Boolean)
          .join(' ');
          
        if (name) {
          await supabase.auth.updateUser({
            data: { full_name: name }
          });
        }
      }

    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      
      // Rethrow cancellation error so UI can handle it
      if ((error as any)?.code === 'ERR_REQUEST_CANCELED') {
        throw error;
      }
      
      console.error('Apple Login Error:', error);
      throw error;
    }
  }, []);

  const loginWithGoogle = useCallback(async (): Promise<void> => {
     // Not implementing Google Auth right now as focusing on Apple
     throw new Error('Google login not implemented with Supabase yet');
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
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

  return useMemo(() => ({
    ...authState,
    loginWithEmail,
    registerWithEmail,
    loginWithApple,
    loginWithGoogle,
    logout,
  }), [authState, loginWithEmail, registerWithEmail, loginWithApple, loginWithGoogle, logout]);
});
