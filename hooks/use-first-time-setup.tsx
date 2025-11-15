import { useState, useEffect, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { FirstTimeProfile, FirstTimeSetupState } from '@/types/first-time-setup';
import { safeStorageGet, safeStorageSet } from '@/utils/storage-helper';

const FIRST_TIME_SETUP_KEY = 'first_time_setup';

export const [FirstTimeSetupProvider, useFirstTimeSetup] = createContextHook(() => {
  const [state, setState] = useState<FirstTimeSetupState>({
    profile: null,
    currentStep: 0,
    isLoading: true,
  });

  const loadProfile = useCallback(async () => {
    try {
      const stored = await safeStorageGet<FirstTimeProfile | null>(FIRST_TIME_SETUP_KEY, null);
      setState({
        profile: stored,
        currentStep: 0,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error loading first-time setup profile:', error);
      setState({
        profile: null,
        currentStep: 0,
        isLoading: false,
      });
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<FirstTimeProfile>) => {
    setState(prev => {
      const newProfile = {
        ...prev.profile,
        ...updates,
      } as FirstTimeProfile;

      safeStorageSet(FIRST_TIME_SETUP_KEY, newProfile);
      
      return {
        ...prev,
        profile: newProfile,
      };
    });
  }, []);

  const completeSetup = useCallback(async () => {
    setState(prev => {
      const completed = {
        ...prev.profile!,
        isCompleted: true,
      };
      
      safeStorageSet(FIRST_TIME_SETUP_KEY, completed);
      
      return {
        ...prev,
        profile: completed,
      };
    });
  }, []);

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
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return useMemo(() => ({
    ...state,
    updateProfile,
    completeSetup,
    setStep,
    resetSetup,
  }), [state, updateProfile, completeSetup, setStep, resetSetup]);
});
