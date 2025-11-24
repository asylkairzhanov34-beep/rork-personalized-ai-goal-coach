import { useState, useEffect, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { useAuth } from '@/hooks/use-auth-store';
import { safeStorageGet, safeStorageSet } from '@/utils/storage-helper';
import { FirstTimeProfile, FirstTimeSetupState } from '@/types/first-time-setup';

// ──────────────────────────────────────────────────────────────
const getFirstTimeSetupKey = (userId: string) => `first_time_setup_${userId}`;

export const [FirstTimeSetupProvider, useFirstTimeSetup] = createContextHook(() => {
  const { user } = useAuth();
  const [state, setState] = useState<FirstTimeSetupState>({
    profile: null,
    currentStep: 0,
    isLoading: true,
  });

  const FIRST_TIME_SETUP_KEY = user?.id ? getFirstTimeSetupKey(user.id) : 'default';

  const loadProfile = useCallback(async () => {
    try {
      console.log('[FirstTimeSetupProvider] Loading profile...');
      const stored = await safeStorageGet<FirstTimeProfile | null>(FIRST_TIME_SETUP_KEY, null);

      requestAnimationFrame(() => {
        setState({
          profile: stored,
          currentStep: stored?.isCompleted ? 0 : 0,
          isLoading: false,
        });
      });
    } catch (err) {
      console.error('[FirstTimeSetupProvider] Load error:', err);
      requestAnimationFrame(() => {
        setState({ profile: null, currentStep: 0, isLoading: false });
      });
    }
  }, [user?.id, FIRST_TIME_SETUP_KEY]);

  const updateProfile = useCallback(
    async (updates: Partial<FirstTimeProfile>) => {
      setState(prev => {
        const newProfile = { ...prev.profile, ...updates } as FirstTimeProfile;
        safeStorageSet(FIRST_TIME_SETUP_KEY, newProfile);
        return { ...prev, profile: newProfile };
      });
    },
    [FIRST_TIME_SETUP_KEY]
  );

  const completeSetup = useCallback(async () => {
    setState(prev => {
      if (!prev.profile) return prev;

      const completed: FirstTimeProfile = {
        ...prev.profile,
        isCompleted: true,
      };

      safeStorageSet(FIRST_TIME_SETUP_KEY, completed);
      return { ...prev, profile: completed };
    });
  }, [FIRST_TIME_SETUP_KEY]);

  const setStep = useCallback((step: number) => {
    setState(prev => ({ ...prev, currentStep: step }));
  }, []);

  const resetSetup = useCallback(async () => {
    await safeStorageSet(FIRST_TIME_SETUP_KEY, null);
    setState({ profile: null, currentStep: 0, isLoading: false });
  }, [FIRST_TIME_SETUP_KEY]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return useMemo(
    () => ({
      ...state,
      updateProfile,
      completeSetup,
      setStep,
      resetSetup,
    }),
    [state, updateProfile, completeSetup, setStep, resetSetup]
  );
});