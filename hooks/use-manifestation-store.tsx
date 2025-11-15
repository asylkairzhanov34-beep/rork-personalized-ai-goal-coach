import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { ManifestationSession, ManifestationSettings, ManifestationStats } from '@/types/manifestation';
import { safeStorageGet, safeStorageSet } from '@/utils/storage-helper';

const STORAGE_KEYS = {
  MANIFESTATION_SESSIONS: 'manifestation_sessions',
  MANIFESTATION_SETTINGS: 'manifestation_settings',
};

const DEFAULT_SETTINGS: ManifestationSettings = {
  sessionDuration: 3,
  enableVoiceRecording: false,
  enableHapticFeedback: true,
  enableMorningReminder: true,
  enableEveningReminder: false,
  reminderTime: '08:00',
};

export const [ManifestationProvider, useManifestationStore] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [sessions, setSessions] = useState<ManifestationSession[]>([]);
  const [settings, setSettings] = useState<ManifestationSettings>(DEFAULT_SETTINGS);

  // Load sessions
  const sessionsQuery = useQuery({
    queryKey: ['manifestation-sessions'],
    queryFn: async () => {
      const data = await safeStorageGet(STORAGE_KEYS.MANIFESTATION_SESSIONS, []);
      return data.map((session: any) => ({
        ...session,
        completedAt: new Date(session.completedAt)
      }));
    },
  });

  // Load settings
  const settingsQuery = useQuery({
    queryKey: ['manifestation-settings'],
    queryFn: async () => {
      return await safeStorageGet(STORAGE_KEYS.MANIFESTATION_SETTINGS, DEFAULT_SETTINGS);
    },
  });

  useEffect(() => {
    if (sessionsQuery.data) {
      setSessions(sessionsQuery.data);
    }
  }, [sessionsQuery.data]);

  useEffect(() => {
    if (settingsQuery.data) {
      setSettings(settingsQuery.data);
    }
  }, [settingsQuery.data]);

  // Save sessions mutation
  const saveSessionsMutation = useMutation({
    mutationFn: async (sessions: ManifestationSession[]) => {
      await safeStorageSet(STORAGE_KEYS.MANIFESTATION_SESSIONS, sessions);
      return sessions;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manifestation-sessions'] });
    },
  });

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: ManifestationSettings) => {
      await safeStorageSet(STORAGE_KEYS.MANIFESTATION_SETTINGS, settings);
      return settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manifestation-settings'] });
    },
  });

  const addSession = (sessionData: Omit<ManifestationSession, 'id' | 'completedAt'>) => {
    const newSession: ManifestationSession = {
      ...sessionData,
      id: Date.now().toString(),
      completedAt: new Date(),
    };
    const updatedSessions = [...sessions, newSession];
    setSessions(updatedSessions);
    saveSessionsMutation.mutate(updatedSessions);
  };

  const updateSettings = (newSettings: Partial<ManifestationSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    saveSettingsMutation.mutate(updatedSettings);
  };

  const generateAffirmations = (goalTitle: string, goalDescription: string): string[] => {
    const baseAffirmations = [
      'Я уже достиг своей мечты и живу в гармонии с собой',
      'Каждый день я становлюсь лучшей версией себя',
      'Моя энергия и фокус направлены на позитивные изменения',
      'Я чувствую радость от каждого шага на моем пути',
      'Мои действия естественно ведут меня к успеху и счастью',
    ];
    
    // Персонализированные аффирмации на основе цели
    if (goalTitle.toLowerCase().includes('вес') || goalTitle.toLowerCase().includes('похуд')) {
      baseAffirmations.push(
        'Я чувствую лёгкость в теле и двигаюсь с энергией каждый день',
        'Мои здоровые привычки приносят радость и результаты',
        'Моё тело благодарно за заботу и отвечает позитивными изменениями'
      );
    } else if (goalTitle.toLowerCase().includes('карьер') || goalTitle.toLowerCase().includes('работ')) {
      baseAffirmations.push(
        'Я привлекаю возможности, которые соответствуют моим целям',
        'Мои навыки и таланты признаются и ценятся',
        'Я уверенно двигаюсь к профессиональному успеху'
      );
    } else if (goalTitle.toLowerCase().includes('отношен') || goalTitle.toLowerCase().includes('любов')) {
      baseAffirmations.push(
        'Я притягиваю здоровые и гармоничные отношения',
        'Моя любовь к себе отражается в отношениях с другими',
        'Я открыт для глубоких и значимых связей'
      );
    }
    
    return baseAffirmations.slice(0, 5);
  };

  const generateGratitudes = (goalTitle: string): string[] => {
    return [
      'Я благодарен за возможность расти и развиваться каждый день',
      'Спасибо за поддержку тела и разума в этом путешествии',
      'Я ценю каждый шаг, который приближает меня к мечте',
      'Благодарю за силу и мотивацию продолжать движение',
      'Спасибо за все уроки и рост на моем жизненном пути',
    ];
  };

  const getStats = (): ManifestationStats => {
    const now = new Date();
    const today = now.toDateString();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const todaySessions = sessions.filter(s => s.completedAt.toDateString() === today);
    const weekSessions = sessions.filter(s => s.completedAt >= weekStart);
    const monthSessions = sessions.filter(s => s.completedAt >= monthStart);
    
    const totalTime = sessions.reduce((total, s) => total + s.duration, 0);
    
    // Calculate mood improvement
    const sessionsWithMood = sessions.filter(s => s.moodBefore && s.moodAfter);
    const averageMoodImprovement = sessionsWithMood.length > 0
      ? sessionsWithMood.reduce((total, s) => total + (s.moodAfter! - s.moodBefore!), 0) / sessionsWithMood.length
      : 0;
    
    // Calculate streak
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    
    const sortedDates = [...new Set(sessions.map(s => s.completedAt.toDateString()))].sort();
    
    for (let i = sortedDates.length - 1; i >= 0; i--) {
      const date = new Date(sortedDates[i]);
      const expectedDate = new Date(now.getTime() - (sortedDates.length - 1 - i) * 24 * 60 * 60 * 1000);
      
      if (date.toDateString() === expectedDate.toDateString()) {
        tempStreak++;
        if (i === sortedDates.length - 1) currentStreak = tempStreak;
      } else {
        bestStreak = Math.max(bestStreak, tempStreak);
        tempStreak = 0;
      }
    }
    
    bestStreak = Math.max(bestStreak, tempStreak, currentStreak);
    
    return {
      totalSessions: sessions.length,
      totalTime,
      averageMoodImprovement,
      currentStreak,
      bestStreak,
      weekSessions: weekSessions.length,
      monthSessions: monthSessions.length,
    };
  };

  const getTodaySessions = () => {
    const today = new Date().toDateString();
    return sessions.filter(s => s.completedAt.toDateString() === today);
  };

  return {
    sessions,
    settings,
    isLoading: sessionsQuery.isLoading || settingsQuery.isLoading,
    isReady: !sessionsQuery.isLoading && !settingsQuery.isLoading,
    addSession,
    updateSettings,
    generateAffirmations,
    generateGratitudes,
    getStats,
    getTodaySessions,
  };
});

