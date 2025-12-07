import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Goal, DailyTask, UserProfile, PomodoroSession, PomodoroStats } from '@/types/goal';
import { safeStorageGet, safeStorageSet } from '@/utils/storage-helper';
import { useAuth } from '@/hooks/use-auth-store';
import { 
  getUserGoals, 
  saveUserGoals, 
  getUserTasks, 
  saveUserTasks,
  getUserPomodoroSessions,
  saveUserPomodoroSessions,
  getUserFullProfile,
  saveUserFullProfile
} from '@/lib/firebase';

const getStorageKeys = (userId: string) => ({
  PROFILE: `user_profile_${userId}`,
  GOALS: `goals_${userId}`,
  TASKS: `daily_tasks_${userId}`,
  ONBOARDING: `onboarding_answers_${userId}`,
  POMODORO_SESSIONS: `pomodoro_sessions_${userId}`,
});

export const [GoalProvider, useGoalStore] = createContextHook(() => {
  const { user } = useAuth();
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

  const STORAGE_KEYS = getStorageKeys(user?.id || 'default');

  const profileQuery = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return profile;
      
      console.log('[GoalStore] Loading profile for user:', user.id);
      const firebaseProfile = await getUserFullProfile(user.id);
      
      if (firebaseProfile) {
        console.log('[GoalStore] Profile loaded from Firebase');
        await safeStorageSet(STORAGE_KEYS.PROFILE, firebaseProfile);
        return firebaseProfile;
      }
      
      console.log('[GoalStore] No Firebase profile, checking local storage');
      return await safeStorageGet(STORAGE_KEYS.PROFILE, profile);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!user?.id,
  });

  const goalsQuery = useQuery({
    queryKey: ['goals', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      console.log('[GoalStore] Loading goals for user:', user.id);
      const firebaseGoals = await getUserGoals(user.id);
      
      if (firebaseGoals && firebaseGoals.length > 0) {
        console.log('[GoalStore] Goals loaded from Firebase:', firebaseGoals.length);
        await safeStorageSet(STORAGE_KEYS.GOALS, firebaseGoals);
        return firebaseGoals;
      }
      
      console.log('[GoalStore] No Firebase goals, checking local storage');
      return await safeStorageGet(STORAGE_KEYS.GOALS, []);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!user?.id,
  });

  const tasksQuery = useQuery({
    queryKey: ['tasks', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      console.log('[GoalStore] Loading tasks for user:', user.id);
      const firebaseTasks = await getUserTasks(user.id);
      
      if (firebaseTasks && firebaseTasks.length > 0) {
        console.log('[GoalStore] Tasks loaded from Firebase:', firebaseTasks.length);
        await safeStorageSet(STORAGE_KEYS.TASKS, firebaseTasks);
        return firebaseTasks;
      }
      
      console.log('[GoalStore] No Firebase tasks, checking local storage');
      return await safeStorageGet(STORAGE_KEYS.TASKS, []);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!user?.id,
  });

  const pomodoroQuery = useQuery({
    queryKey: ['pomodoro', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      console.log('[GoalStore] Loading pomodoro sessions for user:', user.id);
      const firebaseSessions = await getUserPomodoroSessions(user.id);
      
      if (firebaseSessions && firebaseSessions.length > 0) {
        console.log('[GoalStore] Pomodoro sessions loaded from Firebase:', firebaseSessions.length);
        const sessions = firebaseSessions.map((session: any) => ({
          ...session,
          completedAt: session.completedAt ? new Date(session.completedAt) : undefined
        }));
        await safeStorageSet(STORAGE_KEYS.POMODORO_SESSIONS, sessions);
        return sessions;
      }
      
      console.log('[GoalStore] No Firebase sessions, checking local storage');
      const sessions = await safeStorageGet(STORAGE_KEYS.POMODORO_SESSIONS, []);
      return sessions.map((session: any) => ({
        ...session,
        completedAt: session.completedAt ? new Date(session.completedAt) : undefined
      }));
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!user?.id,
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
      
      const calculateGoalProgress = (goal: Goal) => {
        const goalTasks = dailyTasks.filter(task => task.goalId === goal.id);
        const completedCount = goalTasks.filter(task => task.completed === true).length;
        const totalCount = goalTasks.length;
        
        console.log('[GoalStore] Progress calculation for goal:', goal.id, {
          totalTasks: totalCount,
          completedTasks: completedCount,
          tasksDetails: goalTasks.map(t => ({ id: t.id, title: t.title, completed: t.completed }))
        });
        
        return { completedCount, totalCount };
      };
      
      if (activeGoal) {
        const { completedCount, totalCount } = calculateGoalProgress(activeGoal);
        
        const updatedGoal: Goal = {
          ...activeGoal,
          completedTasksCount: completedCount,
          totalTasksCount: totalCount
        };
        
        setCurrentGoal(updatedGoal);
      } else {
        const lastGoal = goals[goals.length - 1];
        if (lastGoal) {
          const { completedCount, totalCount } = calculateGoalProgress(lastGoal);
          
          const updatedGoal: Goal = { 
            ...lastGoal, 
            isActive: true,
            completedTasksCount: completedCount,
            totalTasksCount: totalCount
          };
          const updatedGoals = goals.map((g: Goal) => 
            g.id === lastGoal.id ? updatedGoal : { ...g, isActive: false }
          );
          
          (async () => {
            await safeStorageSet(STORAGE_KEYS.GOALS, updatedGoals);
            await saveUserGoals(user?.id || 'default', updatedGoals).catch((err: Error) => {
              console.error('[GoalStore] Failed to sync goals to Firebase:', err);
            });
          })();
          
          setCurrentGoal(updatedGoal);
          queryClient.invalidateQueries({ queryKey: ['goals', user?.id] });
        }
      }
    } else {
      setCurrentGoal(null);
    }
  }, [goalsQuery.data, dailyTasks, queryClient, user?.id, STORAGE_KEYS.GOALS]);

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

  const saveProfileMutation = useMutation({
    mutationFn: async (newProfile: UserProfile) => {
      if (!user?.id) throw new Error('User not authenticated');
      console.log('[GoalStore] Saving profile to Firebase and local storage');
      await safeStorageSet(STORAGE_KEYS.PROFILE, newProfile);
      await saveUserFullProfile(user.id, newProfile).catch((err: Error) => {
        console.error('[GoalStore] Failed to save profile to Firebase:', err);
      });
      return newProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });

  const saveTasksMutation = useMutation({
    mutationFn: async (tasks: DailyTask[]) => {
      if (!user?.id) throw new Error('User not authenticated');
      console.log('[GoalStore] Saving tasks to Firebase and local storage');
      await safeStorageSet(STORAGE_KEYS.TASKS, tasks);
      await saveUserTasks(user.id, tasks).catch((err: Error) => {
        console.error('[GoalStore] Failed to save tasks to Firebase:', err);
      });
      return tasks;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
    },
  });

  const savePomodoroMutation = useMutation({
    mutationFn: async (sessions: PomodoroSession[]) => {
      if (!user?.id) throw new Error('User not authenticated');
      console.log('[GoalStore] Saving pomodoro sessions to Firebase and local storage');
      await safeStorageSet(STORAGE_KEYS.POMODORO_SESSIONS, sessions);
      await saveUserPomodoroSessions(user.id, sessions).catch((err: Error) => {
        console.error('[GoalStore] Failed to save pomodoro sessions to Firebase:', err);
      });
      return sessions;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pomodoro', user?.id] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      console.log('[GoalStore] Deleting task from Firebase and local storage');
      const updated = dailyTasks.filter(t => t.id !== taskId);
      await safeStorageSet(STORAGE_KEYS.TASKS, updated);
      await saveUserTasks(user.id, updated).catch((err: Error) => {
        console.error('[GoalStore] Failed to delete task from Firebase:', err);
      });
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
    },
  });

  const updateTask = (taskId: string, updates: Partial<DailyTask>) => {
    const updatedTasks = dailyTasks.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    );
    setDailyTasks(updatedTasks);
    saveTasksMutation.mutate(updatedTasks);
  };

  const deleteTask = (taskId: string) => {
    const updatedTasks = dailyTasks.filter(task => task.id !== taskId);
    setDailyTasks(updatedTasks);
    deleteTaskMutation.mutate(taskId);
  };

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
      planType: goalData.planType || 'free',
    };

    const newTasks: DailyTask[] = tasks.map((task, index) => ({
      ...task,
      id: `${goalId}_task_${index}`,
      goalId,
      completed: false,
    }));

    const existingGoals = goalsQuery.data || [];
    const updatedExistingGoals = existingGoals.map((g: Goal) => ({ ...g, isActive: false }));
    const allGoals = [...updatedExistingGoals, newGoal];

    setCurrentGoal(newGoal);
    setDailyTasks(newTasks);
    
    console.log('[GoalStore] Creating new goal and syncing to Firebase');
    await safeStorageSet(STORAGE_KEYS.GOALS, allGoals);
    await saveUserGoals(user?.id || 'default', allGoals).catch((err: Error) => {
      console.error('[GoalStore] Failed to sync goals to Firebase:', err);
    });
    await saveTasksMutation.mutateAsync(newTasks);
    
    queryClient.invalidateQueries({ queryKey: ['goals', user?.id] });
    
    updateProfile({ currentGoalId: goalId });
  };

  const toggleTaskCompletion = async (taskId: string) => {
    const taskToUpdate = dailyTasks.find(t => t.id === taskId);
    if (!taskToUpdate) {
      console.error('[GoalStore] Task not found:', taskId);
      return;
    }
    
    const newCompletedStatus = !taskToUpdate.completed;
    console.log('[GoalStore] Toggling task completion:', {
      taskId,
      taskTitle: taskToUpdate.title,
      wasCompleted: taskToUpdate.completed,
      willBeCompleted: newCompletedStatus
    });
    
    const updatedTasks = dailyTasks.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          completed: newCompletedStatus,
          completedAt: newCompletedStatus ? new Date().toISOString() : undefined,
        };
      }
      return task;
    });

    setDailyTasks(updatedTasks);
    await saveTasksMutation.mutateAsync(updatedTasks);

    if (currentGoal) {
      const goalTasks = updatedTasks.filter(t => t.goalId === currentGoal.id);
      const completedCount = goalTasks.filter(t => t.completed === true).length;
      const totalCount = goalTasks.length;
      
      console.log('[GoalStore] Updated goal progress:', {
        goalId: currentGoal.id,
        completedCount,
        totalCount,
        percentage: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
      });
      
      const updatedGoal = { 
        ...currentGoal, 
        completedTasksCount: completedCount,
        totalTasksCount: totalCount
      };
      setCurrentGoal(updatedGoal);
      
      const goals = goalsQuery.data || [];
      const updatedGoals = goals.map((g: Goal) => g.id === updatedGoal.id ? updatedGoal : g);
      await safeStorageSet(STORAGE_KEYS.GOALS, updatedGoals);
      await saveUserGoals(user?.id || 'default', updatedGoals).catch((err: Error) => {
        console.error('[GoalStore] Failed to sync goals to Firebase:', err);
      });
      queryClient.invalidateQueries({ queryKey: ['goals', user?.id] });
    }

    updateStreak();
  };

  const updateStreak = () => {
    const today = new Date();
    const todayStr = today.toDateString();
    
    const todayTasks = dailyTasks.filter(t => 
      t.goalId === currentGoal?.id && 
      new Date(t.date).toDateString() === todayStr
    );
    
    const todayAllCompleted = todayTasks.length > 0 && todayTasks.every(t => t.completed);
    
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
    
    if (todayAllCompleted && !todayAlreadyCounted) {
      let newStreak = 1;
      
      if (profile.currentStreak > 0 && profile.lastStreakDate) {
        const lastStreakDateObj = new Date(profile.lastStreakDate);
        const daysDiff = Math.floor((today.getTime() - lastStreakDateObj.getTime()) / (1000 * 60 * 60 * 24));
        
        console.log('Days diff:', daysDiff);
        
        if (daysDiff === 1) {
          newStreak = profile.currentStreak + 1;
        }
      }
      
      const bestStreak = Math.max(newStreak, profile.bestStreak);
      console.log('New streak:', newStreak);
      
      updateProfile({ 
        currentStreak: newStreak, 
        bestStreak,
        lastStreakDate: todayStr
      });
    }
    else if (profile.lastStreakDate && !todayAlreadyCounted && !todayAllCompleted) {
      const lastStreakDateObj = new Date(profile.lastStreakDate);
      const daysDiff = Math.floor((today.getTime() - lastStreakDateObj.getTime()) / (1000 * 60 * 60 * 24));
      
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
    if (!currentGoal) {
      console.log('[GoalStore] getTodayTasks: No current goal');
      return [];
    }
    
    const today = new Date().toDateString();
    const todayTasks = dailyTasks.filter(task => 
      task.goalId === currentGoal.id && 
      new Date(task.date).toDateString() === today
    );
    
    console.log('[GoalStore] getTodayTasks:', {
      today,
      goalId: currentGoal.id,
      tasksCount: todayTasks.length,
      completedCount: todayTasks.filter(t => t.completed === true).length
    });
    
    return todayTasks;
  };

  const getProgress = () => {
    if (!currentGoal) return 0;
    
    const goalTasks = dailyTasks.filter(task => task.goalId === currentGoal.id);
    const completedTasks = goalTasks.filter(task => task.completed === true);
    
    const progress = goalTasks.length > 0 
      ? (completedTasks.length / goalTasks.length) * 100 
      : 0;
    
    console.log('[GoalStore] getProgress:', {
      goalId: currentGoal.id,
      totalTasks: goalTasks.length,
      completedTasks: completedTasks.length,
      progress: Math.round(progress)
    });
    
    return progress;
  };

  const getProgressForPeriod = (period: 'day' | 'week' | 'month') => {
    if (!currentGoal) {
      console.log('[GoalStore] getProgressForPeriod: No current goal');
      return { completed: 0, total: 0, percentage: 0 };
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const goalTasks = dailyTasks.filter(task => task.goalId === currentGoal.id);
    let filteredTasks: typeof goalTasks = [];
    
    if (period === 'day') {
      const todayStr = today.toDateString();
      filteredTasks = goalTasks.filter(task => {
        const taskDate = new Date(task.date);
        return taskDate.toDateString() === todayStr;
      });
    } else if (period === 'week') {
      const weekStart = new Date(today);
      const dayOfWeek = today.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      weekStart.setDate(today.getDate() - daysToMonday);
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      filteredTasks = goalTasks.filter(task => {
        const taskDate = new Date(task.date);
        return taskDate >= weekStart && taskDate <= weekEnd;
      });
    } else if (period === 'month') {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      monthStart.setHours(0, 0, 0, 0);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);
      
      filteredTasks = goalTasks.filter(task => {
        const taskDate = new Date(task.date);
        return taskDate >= monthStart && taskDate <= monthEnd;
      });
    }
    
    const completed = filteredTasks.filter(t => t.completed === true).length;
    const total = filteredTasks.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    console.log(`[GoalStore] Progress for ${period}:`, {
      goalId: currentGoal.id,
      period,
      dateRange: period === 'day' ? today.toDateString() : `${period} range`,
      completed,
      total,
      percentage,
      tasks: filteredTasks.map(t => ({
        id: t.id,
        title: t.title.substring(0, 20),
        date: t.date,
        completed: t.completed
      }))
    });
    
    return { completed, total, percentage };
  };

  const resetGoal = async () => {
    if (!user?.id) return;
    setCurrentGoal(null);
    setDailyTasks([]);
    await AsyncStorage.removeItem(STORAGE_KEYS.GOALS);
    await AsyncStorage.removeItem(STORAGE_KEYS.TASKS);
    queryClient.invalidateQueries({ queryKey: ['goals', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
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

  const addTask = async (taskData: Omit<DailyTask, 'id' | 'goalId' | 'completed'> & { completed?: boolean }) => {
    const newTask: DailyTask = {
      ...taskData,
      completed: taskData.completed ?? false,
      id: `task_${Date.now()}`,
      goalId: currentGoal?.id || 'default',
    };
    
    const updatedTasks = [...dailyTasks, newTask];
    setDailyTasks(updatedTasks);
    await saveTasksMutation.mutateAsync(updatedTasks);

    if (newTask.completed) {
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
          await safeStorageSet(STORAGE_KEYS.GOALS, updatedGoals);
          await saveUserGoals(user?.id || 'default', updatedGoals).catch((err: Error) => {
            console.error('[GoalStore] Failed to sync goals to Firebase:', err);
          });
          queryClient.invalidateQueries({ queryKey: ['goals', user?.id] });
       }
       updateStreak();
    }
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
    updateTask,
    deleteTask,
  };
});
