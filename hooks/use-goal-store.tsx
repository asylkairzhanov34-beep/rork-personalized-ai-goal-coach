import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Goal, DailyTask, UserProfile, PomodoroSession, PomodoroStats } from '@/types/goal';
import { safeStorageGet, safeStorageSet } from '@/utils/storage-helper';

// Utility function to clear all storage in case of corruption
const clearAllStorage = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys);
    console.log('All storage cleared due to corruption');
  } catch (error) {
    console.error('Error clearing storage:', error);
  }
};

const STORAGE_KEYS = {
  PROFILE: 'user_profile',
  GOALS: 'goals',
  TASKS: 'daily_tasks',
  ONBOARDING: 'onboarding_answers',
  POMODORO_SESSIONS: 'pomodoro_sessions',
};

export const [GoalProvider, useGoalStore] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [currentGoal, setCurrentGoal] = useState<Goal | null>(null);
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [pomodoroSessions, setPomodoroSessions] = useState<PomodoroSession[]>([]);
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    onboardingCompleted: false,
    totalGoalsCompleted: 0,
    currentStreak: 0,
    bestStreak: 0,
    joinedAt: new Date().toISOString(),
    preferences: {
      motivationalQuotes: true,
    },
  });

  // Load profile
  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      return await safeStorageGet(STORAGE_KEYS.PROFILE, profile);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Load goals
  const goalsQuery = useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      return await safeStorageGet(STORAGE_KEYS.GOALS, []);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Load tasks
  const tasksQuery = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      return await safeStorageGet(STORAGE_KEYS.TASKS, []);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Load pomodoro sessions
  const pomodoroQuery = useQuery({
    queryKey: ['pomodoro'],
    queryFn: async () => {
      const sessions = await safeStorageGet(STORAGE_KEYS.POMODORO_SESSIONS, []);
      // Convert date strings back to Date objects
      return sessions.map((session: any) => ({
        ...session,
        completedAt: session.completedAt ? new Date(session.completedAt) : undefined
      }));
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (profileQuery.data) {
      setProfile(profileQuery.data);
    }
  }, [profileQuery.data]);

  useEffect(() => {
    if (goalsQuery.data && Array.isArray(goalsQuery.data) && goalsQuery.data.length > 0) {
      const goals = goalsQuery.data as Goal[];
      const activeGoal = goals.find((g: Goal) => g.isActive);
      if (activeGoal) {
        // Обновляем счетчики задач для активной цели
        const goalTasks = dailyTasks.filter(task => task.goalId === activeGoal.id);
        const completedCount = goalTasks.filter(task => task.completed).length;
        const totalCount = goalTasks.length;
        
        const updatedGoal: Goal = {
          ...activeGoal,
          completedTasksCount: completedCount,
          totalTasksCount: totalCount
        };
        
        setCurrentGoal(updatedGoal);
      } else {
        // Если нет активной цели, но есть цели, активируем последнюю
        const lastGoal = goals[goals.length - 1];
        if (lastGoal) {
          const goalTasks = dailyTasks.filter(task => task.goalId === lastGoal.id);
          const completedCount = goalTasks.filter(task => task.completed).length;
          const totalCount = goalTasks.length;
          
          const updatedGoal: Goal = { 
            ...lastGoal, 
            isActive: true,
            completedTasksCount: completedCount,
            totalTasksCount: totalCount
          };
          const updatedGoals = goals.map((g: Goal) => 
            g.id === lastGoal.id ? updatedGoal : { ...g, isActive: false }
          );
          safeStorageSet(STORAGE_KEYS.GOALS, updatedGoals);
          setCurrentGoal(updatedGoal);
          queryClient.invalidateQueries({ queryKey: ['goals'] });
        }
      }
    } else {
      setCurrentGoal(null);
    }
  }, [goalsQuery.data, dailyTasks, queryClient]);

  useEffect(() => {
    if (tasksQuery.data) {
      setDailyTasks(tasksQuery.data);
    }
  }, [tasksQuery.data]);

  useEffect(() => {
    if (pomodoroQuery.data) {
      setPomodoroSessions(pomodoroQuery.data);
    }
  }, [pomodoroQuery.data]);





  // Save profile mutation
  const saveProfileMutation = useMutation({
    mutationFn: async (newProfile: UserProfile) => {
      await safeStorageSet(STORAGE_KEYS.PROFILE, newProfile);
      return newProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  // Save goal mutation
  const saveGoalMutation = useMutation({
    mutationFn: async (goal: Goal) => {
      const goals = goalsQuery.data || [];
      const updated = [...goals, goal];
      await safeStorageSet(STORAGE_KEYS.GOALS, updated);
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });

  // Save tasks mutation
  const saveTasksMutation = useMutation({
    mutationFn: async (tasks: DailyTask[]) => {
      await safeStorageSet(STORAGE_KEYS.TASKS, tasks);
      return tasks;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Save pomodoro sessions mutation
  const savePomodoroMutation = useMutation({
    mutationFn: async (sessions: PomodoroSession[]) => {
      await safeStorageSet(STORAGE_KEYS.POMODORO_SESSIONS, sessions);
      return sessions;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pomodoro'] });
    },
  });

  const updateProfile = (updates: Partial<UserProfile>) => {
    const newProfile = { ...profile, ...updates };
    setProfile(newProfile);
    saveProfileMutation.mutate(newProfile);
  };

  const createGoal = async (
    goalData: Omit<Goal, 'id' | 'createdAt' | 'isActive' | 'completedTasksCount' | 'totalTasksCount'>,
    tasks: Omit<DailyTask, 'id' | 'goalId' | 'completed' | 'completedAt'>[]
  ) => {
    const goalId = Date.now().toString();
    const newGoal: Goal = {
      ...goalData,
      id: goalId,
      createdAt: new Date().toISOString(),
      isActive: true,
      completedTasksCount: 0,
      totalTasksCount: tasks.length,
      planType: goalData.planType || 'free', // По умолчанию свободный план
    };

    const newTasks: DailyTask[] = tasks.map((task, index) => ({
      ...task,
      id: `${goalId}_task_${index}`,
      goalId,
      completed: false,
    }));

    // Деактивируем все предыдущие цели
    const existingGoals = goalsQuery.data || [];
    const updatedExistingGoals = existingGoals.map((g: Goal) => ({ ...g, isActive: false }));
    const allGoals = [...updatedExistingGoals, newGoal];

    setCurrentGoal(newGoal);
    setDailyTasks(newTasks);
    
    // Сохраняем все цели (включая деактивированные старые)
    await safeStorageSet(STORAGE_KEYS.GOALS, allGoals);
    await saveTasksMutation.mutateAsync(newTasks);
    
    // Обновляем кэш
    queryClient.invalidateQueries({ queryKey: ['goals'] });
    
    updateProfile({ currentGoalId: goalId });
  };

  const toggleTaskCompletion = (taskId: string) => {
    const updatedTasks = dailyTasks.map(task => {
      if (task.id === taskId) {
        const completed = !task.completed;
        return {
          ...task,
          completed,
          completedAt: completed ? new Date().toISOString() : undefined,
        };
      }
      return task;
    });

    setDailyTasks(updatedTasks);
    saveTasksMutation.mutate(updatedTasks);

    // Update goal progress
    if (currentGoal) {
      const goalTasks = updatedTasks.filter(t => t.goalId === currentGoal.id);
      const completedCount = goalTasks.filter(t => t.completed).length;
      const totalCount = goalTasks.length;
      
      const updatedGoal = { 
        ...currentGoal, 
        completedTasksCount: completedCount,
        totalTasksCount: totalCount
      };
      setCurrentGoal(updatedGoal);
      
      const goals = goalsQuery.data || [];
      const updatedGoals = goals.map((g: Goal) => g.id === updatedGoal.id ? updatedGoal : g);
      safeStorageSet(STORAGE_KEYS.GOALS, updatedGoals);
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    }

    // Update streak
    updateStreak();
  };



  const updateStreak = () => {
    const today = new Date();
    const todayStr = today.toDateString();
    
    // Получаем все задачи для текущей цели на сегодня
    const todayTasks = dailyTasks.filter(t => 
      t.goalId === currentGoal?.id && 
      new Date(t.date).toDateString() === todayStr
    );
    
    const todayAllCompleted = todayTasks.length > 0 && todayTasks.every(t => t.completed);
    
    // Проверяем, был ли уже засчитан сегодняшний день
    const lastStreakDate = profile.lastStreakDate;
    const todayAlreadyCounted = lastStreakDate === todayStr;
    
    console.log('Streak update:', {
      todayStr,
      todayTasks: todayTasks.length,
      todayAllCompleted,
      todayAlreadyCounted,
      currentStreak: profile.currentStreak,
      lastStreakDate
    });
    
    // Если сегодня все выполнено и день еще не засчитан
    if (todayAllCompleted && !todayAlreadyCounted) {
      let newStreak = 1; // Минимум 1 день если сегодня выполнено
      
      // Если есть предыдущий стрик
      if (profile.currentStreak > 0 && profile.lastStreakDate) {
        const lastStreakDateObj = new Date(profile.lastStreakDate);
        const daysDiff = Math.floor((today.getTime() - lastStreakDateObj.getTime()) / (1000 * 60 * 60 * 24));
        
        console.log('Days diff:', daysDiff);
        
        if (daysDiff === 1) {
          // Вчера тоже был засчитан - продолжаем стрик
          newStreak = profile.currentStreak + 1;
        }
        // Если daysDiff > 1, то стрик прерывается и начинается заново с 1
      }
      
      const bestStreak = Math.max(newStreak, profile.bestStreak);
      console.log('New streak:', newStreak);
      
      updateProfile({ 
        currentStreak: newStreak, 
        bestStreak,
        lastStreakDate: todayStr
      });
    }
    // Проверяем, не нужно ли сбросить стрик из-за пропущенных дней (только если сегодня не засчитан)
    else if (profile.lastStreakDate && !todayAlreadyCounted && !todayAllCompleted) {
      const lastStreakDateObj = new Date(profile.lastStreakDate);
      const daysDiff = Math.floor((today.getTime() - lastStreakDateObj.getTime()) / (1000 * 60 * 60 * 24));
      
      // Если прошло больше 1 дня с последнего засчитанного дня
      if (daysDiff > 1) {
        console.log('Resetting streak due to gap:', daysDiff, 'days');
        updateProfile({ 
          currentStreak: 0,
          lastStreakDate: undefined
        });
      }
    }
  };

  const getTodayTasks = () => {
    const today = new Date().toDateString();
    return dailyTasks.filter(task => 
      task.goalId === currentGoal?.id && 
      new Date(task.date).toDateString() === today
    );
  };

  const getProgress = () => {
    if (!currentGoal) return 0;
    
    // Считаем все задачи для текущей цели
    const goalTasks = dailyTasks.filter(task => task.goalId === currentGoal.id);
    const completedTasks = goalTasks.filter(task => task.completed);
    
    return goalTasks.length > 0 
      ? (completedTasks.length / goalTasks.length) * 100 
      : 0;
  };

  const getProgressForPeriod = (period: 'day' | 'week' | 'month') => {
    if (!currentGoal) return { completed: 0, total: 0, percentage: 0 };
    
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Сбрасываем время для корректного сравнения
    
    let filteredTasks = dailyTasks.filter(task => task.goalId === currentGoal.id);
    
    if (period === 'day') {
      // Фильтруем задачи на сегодняшний день
      filteredTasks = filteredTasks.filter(task => {
        const taskDate = new Date(task.date);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() === today.getTime();
      });
    } else if (period === 'week') {
      // Начало недели (понедельник)
      const weekStart = new Date(today);
      const dayOfWeek = today.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Если воскресенье (0), то 6 дней назад был понедельник
      weekStart.setDate(today.getDate() - daysToMonday);
      
      // Конец недели (воскресенье)
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      filteredTasks = filteredTasks.filter(task => {
        const taskDate = new Date(task.date);
        return taskDate >= weekStart && taskDate <= weekEnd;
      });
    } else if (period === 'month') {
      // Начало месяца
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      // Конец месяца
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);
      
      filteredTasks = filteredTasks.filter(task => {
        const taskDate = new Date(task.date);
        return taskDate >= monthStart && taskDate <= monthEnd;
      });
    }
    
    const completed = filteredTasks.filter(t => t.completed).length;
    const total = filteredTasks.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    console.log(`Progress for ${period}:`, {
      period,
      today: today.toDateString(),
      completed,
      total,
      percentage,
      filteredTasksCount: filteredTasks.length,
      taskDates: filteredTasks.map(t => ({ id: t.id, date: t.date, completed: t.completed }))
    });
    
    return { completed, total, percentage };
  };

  const resetGoal = async () => {
    setCurrentGoal(null);
    setDailyTasks([]);
    await AsyncStorage.removeItem(STORAGE_KEYS.GOALS);
    await AsyncStorage.removeItem(STORAGE_KEYS.TASKS);
    queryClient.invalidateQueries({ queryKey: ['goals'] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    updateProfile({ currentGoalId: undefined });
  };

  const addPomodoroSession = (session: Omit<PomodoroSession, 'id'>) => {
    const newSession: PomodoroSession = {
      ...session,
      id: Date.now().toString(),
    };
    const updatedSessions = [...pomodoroSessions, newSession];
    setPomodoroSessions(updatedSessions);
    savePomodoroMutation.mutate(updatedSessions);
  };

  const updatePomodoroSession = (sessionId: string, updates: Partial<PomodoroSession>) => {
    const updatedSessions = pomodoroSessions.map(session => 
      session.id === sessionId ? { ...session, ...updates } : session
    );
    setPomodoroSessions(updatedSessions);
    savePomodoroMutation.mutate(updatedSessions);
  };

  const getPomodoroStats = (): PomodoroStats => {
    const now = new Date();
    const today = now.toDateString();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    
    const completedSessions = pomodoroSessions.filter(s => s.completed);
    const todaySessions = completedSessions.filter(s => new Date(s.startTime).toDateString() === today);
    const weekSessions = completedSessions.filter(s => new Date(s.startTime) >= weekStart);
    
    const totalWorkTime = completedSessions
      .filter(s => s.type === 'work')
      .reduce((total, s) => total + s.duration, 0);
    
    const todayWorkTime = todaySessions
      .filter(s => s.type === 'work')
      .reduce((total, s) => total + s.duration, 0);
    
    const weekWorkTime = weekSessions
      .filter(s => s.type === 'work')
      .reduce((total, s) => total + s.duration, 0);
    
    const daysSinceJoined = Math.max(1, Math.floor((now.getTime() - new Date(profile.joinedAt).getTime()) / (1000 * 60 * 60 * 24)));
    
    return {
      totalSessions: completedSessions.length,
      totalWorkTime,
      todaySessions: todaySessions.length,
      todayWorkTime,
      weekSessions: weekSessions.length,
      weekWorkTime,
      averageSessionsPerDay: completedSessions.length / daysSinceJoined,
    };
  };

  const addTask = (taskData: Omit<DailyTask, 'id' | 'goalId' | 'completed' | 'completedAt'>) => {
    const newTask: DailyTask = {
      ...taskData,
      id: `task_${Date.now()}`,
      goalId: currentGoal?.id || 'default',
      completed: false,
    };
    
    const updatedTasks = [...dailyTasks, newTask];
    setDailyTasks(updatedTasks);
    saveTasksMutation.mutate(updatedTasks);
  };

  return {
    profile,
    currentGoal,
    dailyTasks,
    pomodoroSessions,
    isLoading: profileQuery.isLoading || goalsQuery.isLoading || tasksQuery.isLoading || pomodoroQuery.isLoading,
    isReady: !profileQuery.isLoading && !goalsQuery.isLoading && !tasksQuery.isLoading && !pomodoroQuery.isLoading,
    updateProfile,
    createGoal,
    addTask,
    toggleTaskCompletion,
    getTodayTasks,
    getProgress,
    getProgressForPeriod,
    resetGoal,
    addPomodoroSession,
    updatePomodoroSession,
    getPomodoroStats,
  };
});

