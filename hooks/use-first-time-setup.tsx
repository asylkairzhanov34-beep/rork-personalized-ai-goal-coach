import { useState, useEffect, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { useAuth } from '@/hooks/use-auth-store';
import { supabase } from '@/lib/supabase';
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
      let stored = await safeStorageGet<FirstTimeProfile | null>(FIRST_TIME_SETUP_KEY, null);

      // Загружаем из Supabase, если пользователь авторизован
      if (user?.id) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle(); // важно: может не существовать

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
          console.warn('[FirstTimeSetupProvider] Supabase error:', error);
        }

        if (data) {
          console.log('[FirstTimeSetupProvider] Remote profile loaded');
          const remoteProfile: FirstTimeProfile = {
            nickname: data.nickname ?? '',
            goals: data.goals ?? [],
            biorhythm: data.biorhythm ?? null,
            isCompleted: data.is_completed ?? false,
            // остальные поля (birthdate, avatar и т.д.) могут подтягиваться из других мест
          };

          stored = remoteProfile;
          await safeStorageSet(FIRST_TIME_SETUP_KEY, stored);
        }
      }

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

        // Сохраняем локально
        safeStorageSet(FIRST_TIME_SETUP_KEY, newProfile);

        // Синхронизируем с Supabase
        if (user?.id) {
          supabase
            .from('profiles')
            .upsert({
              id: user.id,
              nickname: newProfile.nickname,
              goals: newProfile.goals,
              biorhythm: newProfile.biorhythm,
              is_completed: newProfile.isCompleted,
              updated_at: new Date().toISOString(),
            })
            .then(({ error }) => {
              if (error) console.error('[FirstTimeSetupProvider] Upsert error:', error);
            });
        }

        return { ...prev, profile: newProfile };
      });
    },
    [user?.id, FIRST_TIME_SETUP_KEY]
  );

  const completeSetup = useCallback(async () => {
    setState(prev => {
      if (!prev.profile) return prev;

      const completed: FirstTimeProfile = {
        ...prev.profile,
        isCompleted: true,
      };

      safeStorageSet(FIRST_TIME_SETUP_KEY, completed);

      if (user?.id) {
        supabase
          .from('profiles')
          .upsert({
            id: user.id,
            nickname: completed.nickname,
            goals: completed.goals,
            biorhythm: completed.biorhythm,
            is_completed: true,
            updated_at: new Date().toISOString(),
          })
          .then(({ error }) => {
            if (error) console.error('[FirstTimeSetupProvider] Complete sync error:', error);
          });
      }

      return { ...prev, profile: completed };
    });
  }, [user?.id, FIRST_TIME_SETUP_KEY]);

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