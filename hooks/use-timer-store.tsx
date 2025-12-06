import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { Platform, AppState, AppStateStatus } from 'react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeStorageGet, safeStorageSet } from '@/utils/storage-helper';
import { useNotifications } from './use-notifications';
import { SoundId, DEFAULT_SOUND_ID } from '@/constants/sounds';
import { SoundManager } from '@/utils/SoundManager';

const BACKGROUND_TIMER_KEY = 'background_timer_state';
const BACKGROUND_START_TIME_KEY = 'background_start_time';

let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
} catch {
  console.log('[TimerStore] expo-notifications not available');
}

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
  notificationId?: string;
  notificationSound: SoundId;
}

interface BackgroundTimerState {
  isActive: boolean;
  remainingTime: number;
  totalTime: number;
  mode: 'focus' | 'shortBreak' | 'longBreak';
  goalId?: string;
  startedAt: number;
  notificationSound: SoundId;
}

const TIMER_DURATIONS = {
  focus: 10,
  shortBreak: 5,
  longBreak: 8,
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
    notificationId: undefined,
    notificationSound: DEFAULT_SOUND_ID,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const backgroundNotificationId = useRef<string | null>(null);
  const { permission, scheduleNotification, cancelNotification } = useNotifications();

  const saveBackgroundState = useCallback(async (timerState: TimerState) => {
    if (Platform.OS === 'web') return;
    
    try {
      const bgState: BackgroundTimerState = {
        isActive: timerState.isRunning && !timerState.isPaused,
        remainingTime: timerState.currentTime,
        totalTime: timerState.totalTime,
        mode: timerState.mode,
        goalId: timerState.currentGoalId,
        startedAt: Date.now(),
        notificationSound: timerState.notificationSound,
      };
      
      await AsyncStorage.setItem(BACKGROUND_TIMER_KEY, JSON.stringify(bgState));
      await AsyncStorage.setItem(BACKGROUND_START_TIME_KEY, Date.now().toString());
      console.log('[TimerStore] Saved background state:', bgState.remainingTime, 'seconds remaining');
    } catch (error) {
      console.error('[TimerStore] Failed to save background state:', error);
    }
  }, []);

  const getBackgroundState = useCallback(async (): Promise<BackgroundTimerState | null> => {
    if (Platform.OS === 'web') return null;
    
    try {
      const stateJson = await AsyncStorage.getItem(BACKGROUND_TIMER_KEY);
      const startTimeStr = await AsyncStorage.getItem(BACKGROUND_START_TIME_KEY);
      
      if (!stateJson || !startTimeStr) {
        return null;
      }

      const bgState: BackgroundTimerState = JSON.parse(stateJson);
      const startTime = parseInt(startTimeStr, 10);
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      
      const newRemainingTime = Math.max(0, bgState.remainingTime - elapsedSeconds);
      
      console.log('[TimerStore] Background elapsed:', elapsedSeconds, 'remaining:', newRemainingTime);
      
      return {
        ...bgState,
        remainingTime: newRemainingTime,
      };
    } catch (error) {
      console.error('[TimerStore] Failed to get background state:', error);
      return null;
    }
  }, []);

  const clearBackgroundState = useCallback(async () => {
    if (Platform.OS === 'web') return;
    
    try {
      await AsyncStorage.removeItem(BACKGROUND_TIMER_KEY);
      await AsyncStorage.removeItem(BACKGROUND_START_TIME_KEY);
      console.log('[TimerStore] Cleared background state');
    } catch (error) {
      console.error('[TimerStore] Failed to clear background state:', error);
    }
  }, []);

  const scheduleBackgroundNotification = useCallback(async (
    title: string,
    body: string,
    seconds: number
  ): Promise<string | null> => {
    if (!Notifications || Platform.OS === 'web') {
      console.log('[TimerStore] Notifications not available');
      return null;
    }

    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('[TimerStore] Cancelled previous notifications');

      if (Platform.OS === 'android') {
        try {
          await Notifications.setNotificationChannelAsync('timer', {
            name: 'Timer',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            sound: 'default',
            enableLights: true,
            enableVibrate: true,
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            bypassDnd: true,
          });
        } catch {
          console.log('[TimerStore] Channel already exists');
        }
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          priority: 'max',
          badge: 1,
          ...(Platform.OS === 'android' && {
            channelId: 'timer',
          }),
        },
        trigger: {
          seconds: Math.max(1, seconds),
        },
      });

      console.log('[TimerStore] Scheduled notification:', notificationId, 'in', seconds, 'sec');
      return notificationId;
    } catch (error) {
      console.error('[TimerStore] Failed to schedule notification:', error);
      return null;
    }
  }, []);

  const cancelBackgroundNotification = useCallback(async () => {
    if (!Notifications || Platform.OS === 'web') return;

    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      backgroundNotificationId.current = null;
      console.log('[TimerStore] Cancelled all scheduled notifications');
    } catch (error) {
      console.error('[TimerStore] Failed to cancel notification:', error);
    }
  }, []);

  const playSound = useCallback(async (soundId: SoundId) => {
    console.log('[TimerStore] Playing sound:', soundId);
    
    try {
      await SoundManager.playTimerSound(soundId);
      console.log('[TimerStore] Sound played');
    } catch {
      console.log('[TimerStore] Sound error');
    }
    
    if (Platform.OS !== 'web') {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        console.log('[TimerStore] Haptics not available');
      }
    }
  }, []);

  const handleTimerComplete = useCallback(async () => {
    console.log('[TimerStore] Timer completed!');
    
    if (state.notificationId) {
      await cancelNotification(state.notificationId);
    }
    
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

      console.log('[TimerStore] Auto-switching to:', nextMode, 'after', sessionsCompleted, 'focus sessions');

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
    
    await clearBackgroundState();
  }, [state.notificationId, state.notificationSound, cancelNotification, playSound, clearBackgroundState]);

  useEffect(() => {
    const initializeStore = async () => {
      await SoundManager.configure();
      console.log('[TimerStore] SoundManager initialized');

      const stored = await safeStorageGet<TimerSession[]>('timerSessions', []);
      const sessions = stored.map((session: any) => ({
        ...session,
        completedAt: session.completedAt ? new Date(session.completedAt) : undefined
      }));
      
      const storedSound = await safeStorageGet<SoundId>('notificationSound', DEFAULT_SOUND_ID);
      console.log('[TimerStore] Loaded sound:', storedSound);
      
      setState(prev => ({ 
        ...prev, 
        sessions,
        notificationSound: storedSound 
      }));

      if (Platform.OS !== 'web') {
        const bgState = await getBackgroundState();
        if (bgState && bgState.isActive) {
          console.log('[TimerStore] Restoring from background:', bgState);
          
          if (bgState.remainingTime > 0) {
            setState(prev => ({
              ...prev,
              isRunning: true,
              isPaused: false,
              currentTime: bgState.remainingTime,
              totalTime: bgState.totalTime,
              mode: bgState.mode,
              currentGoalId: bgState.goalId,
              notificationSound: bgState.notificationSound || prev.notificationSound,
            }));
          } else {
            console.log('[TimerStore] Timer completed in background');
          }
          
          await clearBackgroundState();
        }
      }
    };
    
    initializeStore();
  }, [getBackgroundState, clearBackgroundState]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      const previousAppState = appState.current;
      console.log('[TimerStore] AppState:', previousAppState, '->', nextAppState);
      
      if (
        previousAppState === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        console.log('[TimerStore] Going to background');
        console.log('[TimerStore] Timer state - running:', state.isRunning, 'paused:', state.isPaused, 'time:', state.currentTime);
        
        if (state.isRunning && !state.isPaused && state.currentTime > 0) {
          console.log('[TimerStore] Timer is active, saving state and scheduling notification');
          await saveBackgroundState(state);
          
          const modeText = state.mode === 'focus' ? 'Фокус' : state.mode === 'shortBreak' ? 'Короткий перерыв' : 'Длинный перерыв';
          const notifId = await scheduleBackgroundNotification(
            `${modeText} завершен! 🎯`,
            state.mode === 'focus' 
              ? 'Отличная работа! Время для перерыва.'
              : 'Перерыв окончен. Готовы продолжить?',
            state.currentTime
          );
          
          if (notifId) {
            backgroundNotificationId.current = notifId;
          }
        } else {
          console.log('[TimerStore] Timer not active, no notification scheduled');
        }
      } else if (
        previousAppState.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('[TimerStore] Returning to foreground');
        console.log('[TimerStore] Cancelling background notifications');
        
        await cancelBackgroundNotification();
        
        const bgState = await getBackgroundState();
        console.log('[TimerStore] Background state:', bgState ? 'exists' : 'none');
        
        if (bgState && bgState.isActive) {
          console.log('[TimerStore] Restoring timer from background:', bgState.remainingTime, 'sec remaining');
          
          if (bgState.remainingTime <= 0) {
            console.log('[TimerStore] Timer completed in background');
            handleTimerComplete();
          } else {
            console.log('[TimerStore] Updating timer with background time');
            setState(prev => ({
              ...prev,
              currentTime: bgState.remainingTime,
              isRunning: true,
              isPaused: false,
            }));
          }
          
          await clearBackgroundState();
        } else {
          console.log('[TimerStore] No active background timer to restore');
        }
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [state.isRunning, state.isPaused, state.currentTime, state.mode, saveBackgroundState, getBackgroundState, clearBackgroundState, scheduleBackgroundNotification, cancelBackgroundNotification, handleTimerComplete]);

  useEffect(() => {
    if (state.sessions.length > 0) {
      safeStorageSet('timerSessions', state.sessions);
    }
  }, [state.sessions]);



  useEffect(() => {
    if (state.isRunning && !state.isPaused) {
      const interval = setInterval(() => {
        setState(prev => {
          if (prev.currentTime <= 0) {
            return { ...prev, currentTime: 0 };
          }
          return { ...prev, currentTime: prev.currentTime - 1 };
        });
      }, 1000);
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
  }, [state.isRunning, state.isPaused]);

  useEffect(() => {
    if (state.currentTime === 0 && state.isRunning) {
      handleTimerComplete();
    }
  }, [state.currentTime, state.isRunning, handleTimerComplete]);

  const startTimer = useCallback(async (goalId?: string) => {
    console.log('[TimerStore] Starting timer...');
    
    setState(prev => ({
      ...prev,
      isRunning: true,
      isPaused: false,
      currentGoalId: goalId,
      notificationId: undefined,
    }));
  }, []);

  const pauseTimer = useCallback(async () => {
    console.log('[TimerStore] Pausing timer');
    
    await cancelBackgroundNotification();
    await clearBackgroundState();
    
    setState(prev => ({
      ...prev,
      isPaused: true,
    }));
  }, [cancelBackgroundNotification, clearBackgroundState]);

  const resumeTimer = useCallback(() => {
    console.log('[TimerStore] Resuming timer');
    
    setState(prev => ({
      ...prev,
      isPaused: false,
    }));
  }, []);

  const stopTimer = useCallback(async () => {
    console.log('[TimerStore] Stopping timer');
    
    if (state.notificationId) {
      await cancelNotification(state.notificationId);
    }
    
    await cancelBackgroundNotification();
    await clearBackgroundState();
    
    setState(prev => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      currentTime: prev.totalTime,
      notificationId: undefined,
    }));
  }, [state.notificationId, cancelNotification, cancelBackgroundNotification, clearBackgroundState]);

  const skipTimer = useCallback(() => {
    handleTimerComplete();
  }, [handleTimerComplete]);

  const setMode = useCallback((mode: 'focus' | 'shortBreak' | 'longBreak') => {
    console.log('[TimerStore] Manual mode change to:', mode);
    
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
      };
    });
  }, []);

  const setNotificationSound = useCallback((sound: SoundId) => {
    console.log('[TimerStore] Setting sound:', sound);
    setState(prev => ({
      ...prev,
      notificationSound: sound,
    }));
    safeStorageSet('notificationSound', sound);
  }, []);

  const setCustomDuration = useCallback((seconds: number) => {
    console.log('[TimerStore] Setting duration:', seconds);
    setState(prev => ({
      ...prev,
      currentTime: seconds,
      totalTime: seconds,
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
