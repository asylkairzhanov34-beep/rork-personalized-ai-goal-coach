import { useState, useEffect, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { FirstTimeProfile, FirstTimeSetupState } from '@/types/first-time-setup';
import { safeStorageGet, safeStorageSet } from '@/utils/storage-helper';
import { useAuth } from '@/hooks/use-auth-store';

import { supabase } from '@/lib/supabase';

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
      let stored = await safeStorageGet<FirstTimeProfile | null>(FIRST_TIME_SETUP_KEY, null);
      
      // Try to load from Supabase if user is logged in
      if (user?.id) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (data && !error) {
            console.log('[FirstTimeSetupProvider] Remote profile found');
            const remoteProfile: FirstTimeProfile = {
              nickname: data.nickname,
              goals: data.goals || [],
              biorhythm: data.biorhythm || undefined,
              isCompleted: data.is_completed ?? false,
            };

            // If local is empty or we want to prefer remote on first load
            if (!stored) {
              stored = remoteProfile;
              await safeStorageSet(FIRST_TIME_SETUP_KEY, stored);
            }
          }
        } catch (remoteError) {
          console.warn('[FirstTimeSetupProvider] Remote load failed:', remoteError);
        }
      }

      console.log('[FirstTimeSetupProvider] Profile loaded:', stored ? 'Yes' : 'No');
      
      // Use requestAnimationFrame to prevent blocking
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
  }, [FIRST_TIME_SETUP_KEY, user?.id]);

  const updateProfile = useCallback(async (updates: Partial<FirstTimeProfile>) => {
    setState(prev => {
      const newProfile = {
        ...prev.profile,
        ...updates,
      } as FirstTimeProfile;

      safeStorageSet(FIRST_TIME_SETUP_KEY, newProfile);
      
      // Sync to Supabase
      if (user?.id) {
        const payload = {
          id: user.id,
          nickname: newProfile.nickname,
          goals: newProfile.goals,
          biorhythm: newProfile.biorhythm,
          is_completed: newProfile.isCompleted,
          updated_at: new Date().toISOString(),
        };
        
        supabase.from('profiles').upsert(payload).then(({ error }) => {
           if (error) console.error('[FirstTimeSetupProvider] Sync error:', error);
        });
      }

      return {
        ...prev,
        profile: newProfile,
      };
    });
  }, [FIRST_TIME_SETUP_KEY, user?.id]);

  const completeSetup = useCallback(async () => {
    setState(prev => {
      const completed = {
        ...prev.profile!,
        isCompleted: true,
      };
      
      safeStorageSet(FIRST_TIME_SETUP_KEY, completed);
      
      // Sync to Supabase
      if (user?.id) {
        const payload = {
          id: user.id,
          nickname: completed.nickname,
          goals: completed.goals,
          biorhythm: completed.biorhythm,
          is_completed: true,
          updated_at: new Date().toISOString(),
        };
        
        supabase.from('profiles').upsert(payload).then(({ error }) => {
           if (error) console.error('[FirstTimeSetupProvider] Sync error:', error);
        });
      }
      
      return {
        ...prev,
        profile: completed,
      };
    });
  }, [FIRST_TIME_SETUP_KEY, user?.id]);

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
