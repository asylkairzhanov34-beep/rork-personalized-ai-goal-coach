import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { safeStorageGet, safeStorageSet } from '@/utils/storage-helper';
import { useNotifications } from './use-notifications';
import { SoundId, DEFAULT_SOUND_ID } from '@/constants/sounds';
import { SoundManager } from '@/utils/SoundManager';



export interface TimerSession {
  id: string;
  goalId?: string;
  duration: number;
  completedAt: Date;
  type: 'focus' | 'break';
}

interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  currentTime: number;
  totalTime: number;
  mode: 'focus' | 'shortBreak' | 'longBreak';
  sessionsCompleted: number;
  currentGoalId?: string;
  sessions: TimerSession[];
  endTime?: number;
  notificationId?: string;
  notificationSound: SoundId;
}

const TIMER_DURATIONS = {
  focus: 25 * 60, // 25 minutes
  shortBreak: 5 * 60, // 5 minutes
  longBreak: 15 * 60, // 15 minutes
};

export const [TimerProvider, useTimer] = createContextHook(() => {
  const [state, setState] = useState<TimerState>({
    isRunning: false,
    isPaused: false,
    currentTime: TIMER_DURATIONS.focus,
    totalTime: TIMER_DURATIONS.focus,
    mode: 'focus',
    sessionsCompleted: 0,
    sessions: [],
    endTime: undefined,
    notificationId: undefined,
    notificationSound: DEFAULT_SOUND_ID,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { permission, scheduleNotification, cancelNotification } = useNotifications();


  useEffect(() => {
    const initializeStore = async () => {
      await SoundManager.configure();
      console.log('SoundManager initialized for timer');

      const stored = await safeStorageGet<TimerSession[]>('timerSessions', []);
      const sessions = stored.map((session: any) => ({
        ...session,
        completedAt: session.completedAt ? new Date(session.completedAt) : undefined
      }));
      
      const storedSound = await safeStorageGet<SoundId>('notificationSound', DEFAULT_SOUND_ID);
      console.log('Loaded notification sound from storage:', storedSound);
      
      setState(prev => ({ 
        ...prev, 
        sessions,
        notificationSound: storedSound 
      }));
    };
    
    initializeStore();
  }, []);

  // Save sessions to storage
  useEffect(() => {
    if (state.sessions.length > 0) {
      safeStorageSet('timerSessions', state.sessions);
    }
  }, [state.sessions]);

  const playSound = useCallback(async (soundId: SoundId) => {
    console.log('🔊 Playing completion sound:', soundId);
    
    try {
      await SoundManager.playTimerSound(soundId);
      console.log('✅ Sound played successfully');
    } catch (error) {
      console.error('Error playing sound:', error);
      console.log('🔔 POMODORO COMPLETED! 🔔');
    }
    
    if (Platform.OS !== 'web') {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        console.log('Haptics not available:', error);
      }
    }
  }, []);

  const handleTimerComplete = useCallback(async () => {
    console.log('🎯 Timer completed! Handling completion...');
    console.log('Playing sound:', state.notificationSound);
    
    // Cancel the scheduled background notification since we're handling completion in foreground
    if (state.notificationId) {
      console.log('Cancelling scheduled notification:', state.notificationId);
      await cancelNotification(state.notificationId);
    }
    
    // Play sound immediately (foreground only)
    await playSound(state.notificationSound);
    
    setState(prev => {
      const session: TimerSession = {
        id: Date.now().toString(),
        goalId: prev.currentGoalId,
        duration: prev.totalTime,
        completedAt: new Date(),
        type: prev.mode === 'focus' ? 'focus' : 'break',
      };

      const sessionsCompleted = prev.mode === 'focus' 
        ? prev.sessionsCompleted + 1 
        : prev.sessionsCompleted;
      
      let nextMode: 'focus' | 'shortBreak' | 'longBreak' = 'focus';
      if (prev.mode === 'focus') {
        nextMode = sessionsCompleted % 4 === 0 ? 'longBreak' : 'shortBreak';
      }

      const nextDuration = TIMER_DURATIONS[nextMode];

      return {
        ...prev,
        isRunning: false,
        isPaused: false,
        currentTime: nextDuration,
        totalTime: nextDuration,
        mode: nextMode,
        sessionsCompleted,
        sessions: [...prev.sessions, session],
        notificationId: undefined,
      };
    });
  }, [state.notificationId, state.notificationSound, cancelNotification, playSound]);

  // Timer countdown logic
  useEffect(() => {
    if (state.isRunning && !state.isPaused && state.endTime) {
      const interval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.ceil((state.endTime! - now) / 1000);
        
        if (remaining <= 0) {
          setState(prev => ({ ...prev, currentTime: 0, endTime: undefined }));
        } else {
          setState(prev => ({ ...prev, currentTime: remaining }));
        }
      }, 200);
      intervalRef.current = interval;
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.isRunning, state.isPaused, state.endTime]);

  // Handle timer completion
  useEffect(() => {
    if (state.currentTime === 0 && state.isRunning) {
      handleTimerComplete();
    }
  }, [state.currentTime, state.isRunning, handleTimerComplete]);

  const startTimer = useCallback(async (goalId?: string) => {
    console.log('▶️ Starting timer...');
    
    // Schedule background notification for timer completion
    let notificationId: string | null = null;
    if (permission.granted) {
      const currentMode = state.mode;
      const duration = state.currentTime;
      
      console.log(`Scheduling background notification for ${duration} seconds`);
      
      const title = currentMode === 'focus' ? 'Перерыв начался! ☕️' : 'Фокус начался! 🚀';
      const body = currentMode === 'focus' 
        ? 'Сфокусируйтесь на отдыхе' 
        : 'Сфокусируйтесь на работе';
      
      // This notification will fire even if app is in background
      notificationId = await scheduleNotification({
        title,
        body,
        data: { type: 'timer_complete', mode: currentMode },
        trigger: { seconds: duration },
        sound: 'notification_sound.wav',
      });
      
      console.log('Background notification scheduled with ID:', notificationId);
    }
    
    setState(prev => {
      const now = Date.now();
      const endTime = now + state.currentTime * 1000;
      
      return {
        ...prev,
        isRunning: true,
        isPaused: false,
        currentGoalId: goalId,
        notificationId: notificationId || undefined,
        endTime,
      };
    });
  }, [state.mode, state.currentTime, permission.granted, scheduleNotification]);

  const pauseTimer = useCallback(() => {
    setState(prev => ({
      ...prev,
      isPaused: true,
      endTime: undefined,
    }));
  }, []);

  const resumeTimer = useCallback(() => {
    setState(prev => {
      const now = Date.now();
      const endTime = now + prev.currentTime * 1000;
      return {
        ...prev,
        isPaused: false,
        endTime,
      };
    });
  }, []);

  const stopTimer = useCallback(async () => {
    // Cancel scheduled notification
    if (state.notificationId) {
      await cancelNotification(state.notificationId);
    }
    
    setState(prev => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      currentTime: prev.totalTime,
      notificationId: undefined,
      endTime: undefined,
    }));
  }, [state.notificationId, cancelNotification]);

  const skipTimer = useCallback(() => {
    handleTimerComplete();
  }, [handleTimerComplete]);

  const setMode = useCallback((mode: 'focus' | 'shortBreak' | 'longBreak') => {
    setState(prev => {
      let duration: number;
      
      if (mode === 'focus') {
        duration = prev.totalTime === prev.currentTime && prev.mode === 'focus' ? prev.totalTime : TIMER_DURATIONS.focus;
      } else if (mode === 'shortBreak') {
        const focusTime = prev.mode === 'focus' ? prev.totalTime : TIMER_DURATIONS.focus;
        duration = Math.round(focusTime / 5);
      } else {
        const focusTime = prev.mode === 'focus' ? prev.totalTime : TIMER_DURATIONS.focus;
        duration = Math.round(focusTime / 3);
      }
      
      return {
        ...prev,
        mode,
        currentTime: duration,
        totalTime: duration,
        isRunning: false,
        isPaused: false,
        endTime: undefined,
      };
    });
  }, []);

  const setNotificationSound = useCallback((sound: SoundId) => {
    console.log('Setting notification sound to:', sound);
    setState(prev => ({
      ...prev,
      notificationSound: sound,
    }));
    // Save to storage
    safeStorageSet('notificationSound', sound);
  }, []);

  const setCustomDuration = useCallback((seconds: number) => {
    console.log('Setting custom duration to:', seconds, 'seconds');
    setState(prev => ({
      ...prev,
      currentTime: seconds,
      totalTime: seconds,
      endTime: undefined,
    }));
  }, []);

  const getTodaySessions = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return state.sessions.filter(session => {
      const sessionDate = new Date(session.completedAt);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate.getTime() === today.getTime();
    });
  }, [state.sessions]);

  const getSessionsByGoal = useCallback((goalId: string) => {
    return state.sessions.filter(session => session.goalId === goalId);
  }, [state.sessions]);



  return useMemo(() => ({
    ...state,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    skipTimer,
    setMode,
    setNotificationSound,
    setCustomDuration,
    getTodaySessions,
    getSessionsByGoal,
  }), [state, startTimer, pauseTimer, resumeTimer, stopTimer, skipTimer, setMode, setNotificationSound, setCustomDuration, getTodaySessions, getSessionsByGoal]);
});

