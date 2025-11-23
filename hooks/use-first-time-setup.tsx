import { useState, useEffect, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { safeStorageGet, safeStorageSet } from '@/utils/storage-helper';
import { useAuth } from '@/hooks/use-auth-store';
import { supabase } from '@/lib/supabase';

// РАСШИРЕННЫЙ ТИП — именно то, что хранится в Supabase + локально
export interface FirstTimeProfile {
  nickname: string;
  birthdate?: Date;                    // может быть только на этапе онбординга
  avatar?: string;
  primaryGoal?: 'ambition' | 'calm' | 'discipline' | 'focus';
  productivityTime?: 'morning' | 'afternoon' | 'evening' | 'unknown';
  
  // Эти два поля ОБЯЗАТЕЛЬНО должны быть в типе!
  goals: any[];                         // или более точный тип Goal[], если есть
  biorhythm: Record<string, number>;    // например { physical: 85, emotional: 60, ... }

  isCompleted: boolean;
}

export interface FirstTimeSetupState {
  profile: FirstTimeProfile | null;
  currentStep: number;
  isLoading: boolean;
}

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

      // Загружаем из Supabase, если пользователь авторизован
      if (user?.id) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
            console.warn('[FirstTimeSetupProvider] Supabase error:', error);
          }

          if (data) {
            console.log('[FirstTimeSetupProvider] Remote profile found');
            const remoteProfile: FirstTimeProfile = {
              nickname: data.nickname ?? '',
              goals: (data.goals as any[]) || [],
              biorhythm: (data.biorhythm as Record<string, number>) || {},
              isCompleted: data.is_completed ?? false,
            };

            // Если локально пусто — перезаписываем из Supabase
            if (!stored) {
              stored = remoteProfile;
              await safeStorageSet(FIRST_TIME_SETUP_KEY, stored);
            }
          }
        } catch (remoteError) {
          console.warn('[FirstTimeSetupProvider] Remote load failed:', remoteError);
        }
      }

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
      const newProfile: FirstTimeProfile = {
        ...prev.profile!,
        ...updates,
        // Гарантируем, что поля всегда существуют
        goals: updates.goals ?? prev.profile?.goals ?? [],
        biorhythm: updates.biorhythm ?? prev.profile?.biorhythm ?? {},
      };

      // Сохраняем локально
      safeStorageSet(FIRST_TIME_SETUP_KEY, newProfile);

      // Синхронизируем с Supabase
      if (user?.id) {
        const payload = {
          id: user.id,
          nickname: newProfile.nickname,
          goals: newProfile.goals,
          biorhythm: newProfile.biorhythm,
          is_completed: newProfile.isCompleted,
          updated_at: new Date().toISOString(),
        };

        supabase
          .from('profiles')
          .upsert(payload)
          .then(({ error }) => {
            if (error) console.error('[FirstTimeSetupProvider] Sync error:', error);
          });
      }

      return { ...prev, profile: newProfile };
    });
  }, [FIRST_TIME_SETUP_KEY, user?.id]);

  const completeSetup = useCallback(async () => {
    setState(prev => {
      if (!prev.profile) return prev;

      const completed: FirstTimeProfile = {
        ...prev.profile,
        isCompleted: true,
        goals: prev.profile.goals ?? [],
        biorhythm: prev.profile.biorhythm ?? {},
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