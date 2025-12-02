import { useState, useEffect, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { FirstTimeProfile, FirstTimeSetupState } from '@/types/first-time-setup';
import { safeStorageGet, safeStorageSet } from '@/utils/storage-helper';
import { useAuth } from '@/hooks/use-auth-store';
import { saveUserProfile, getUserProfile, updateUserProfile } from '@/lib/firebase';

const getFirstTimeSetupKey = (userId: string) => `first_time_setup_${userId}`;

export const [FirstTimeSetupProvider, useFirstTimeSetup] = createContextHook(() => {
  const { user } = useAuth();
  const [state, setState] = useState<FirstTimeSetupState>({
    profile: null,
    currentStep: 0,
    isLoading: true,
  });

  const FIRST_TIME_SETUP_KEY = getFirstTimeSetupKey(user?.id || 'default');

  const loadProfile = useCallback(async () => {
    try {
      console.log('[FirstTimeSetupProvider] Loading profile...');
      
      let stored: FirstTimeProfile | null = null;
      
      if (user && user.id) {
        console.log('[FirstTimeSetupProvider] Loading from Firebase for user:', user.id);
        const firebaseProfile = await getUserProfile(user.id);
        
        if (firebaseProfile) {
          console.log('[FirstTimeSetupProvider] Firebase profile found');
          stored = firebaseProfile.firstTimeSetup || null;
          
          if (stored) {
            await safeStorageSet(FIRST_TIME_SETUP_KEY, stored);
          }
        } else {
          console.log('[FirstTimeSetupProvider] No Firebase profile, checking local storage');
          stored = await safeStorageGet<FirstTimeProfile | null>(FIRST_TIME_SETUP_KEY, null);
        }
      } else {
        console.log('[FirstTimeSetupProvider] No user, loading from local storage');
        stored = await safeStorageGet<FirstTimeProfile | null>(FIRST_TIME_SETUP_KEY, null);
      }
      
      console.log('[FirstTimeSetupProvider] Profile loaded:', stored ? 'Yes' : 'No');
      
      requestAnimationFrame(() => {
        setState({
          profile: stored,
          currentStep: 0,
          isLoading: false,
        });
      });
    } catch (error) {
      console.error('[FirstTimeSetupProvider] Error loading profile:', error);
      requestAnimationFrame(() => {
        setState({
          profile: null,
          currentStep: 0,
          isLoading: false,
        });
      });
    }
  }, [FIRST_TIME_SETUP_KEY, user]);

  const updateProfile = useCallback(async (updates: Partial<FirstTimeProfile>) => {
    setState(prev => {
      const newProfile = {
        ...prev.profile,
        ...updates,
      } as FirstTimeProfile;

      safeStorageSet(FIRST_TIME_SETUP_KEY, newProfile);
      
      if (user && user.id) {
        console.log('[FirstTimeSetupProvider] Syncing profile to Firebase');
        updateUserProfile(user.id, {
          firstTimeSetup: newProfile,
        }).catch(error => {
          console.error('[FirstTimeSetupProvider] Failed to sync to Firebase:', error);
        });
      }
      
      return {
        ...prev,
        profile: newProfile,
      };
    });
  }, [FIRST_TIME_SETUP_KEY, user]);

  const completeSetup = useCallback(async () => {
    setState(prev => {
      const completed = {
        ...prev.profile!,
        isCompleted: true,
      };
      
      safeStorageSet(FIRST_TIME_SETUP_KEY, completed);
      
      if (user && user.id) {
        console.log('[FirstTimeSetupProvider] Saving completed setup to Firebase');
        saveUserProfile(user.id, {
          firstTimeSetup: completed,
          email: user.email,
          displayName: completed.nickname,
          createdAt: new Date().toISOString(),
        }).catch(error => {
          console.error('[FirstTimeSetupProvider] Failed to save to Firebase:', error);
        });
      }
      
      return {
        ...prev,
        profile: completed,
      };
    });
  }, [FIRST_TIME_SETUP_KEY, user]);

  const setStep = useCallback((step: number) => {
    setState(prev => ({ ...prev, currentStep: step }));
  }, []);

  const resetSetup = useCallback(async () => {
    await safeStorageSet(FIRST_TIME_SETUP_KEY, null);
    setState({
      profile: null,
      currentStep: 0,
      isLoading: false,
    });
  }, [FIRST_TIME_SETUP_KEY]);

  useEffect(() => {
    const init = async () => {
      try {
        await loadProfile();
      } catch (error) {
        console.error('[FirstTimeSetupProvider] Init error:', error);
        setState({
          profile: null,
          currentStep: 0,
          isLoading: false,
        });
      }
    };
    
    init();
  }, [loadProfile]);

  return useMemo(() => ({
    ...state,
    updateProfile,
    completeSetup,
    setStep,
    resetSetup,
  }), [state, updateProfile, completeSetup, setStep, resetSetup]);
});
