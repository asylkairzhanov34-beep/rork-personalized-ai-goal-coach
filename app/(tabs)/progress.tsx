import React, { memo, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp, Award, Target, Zap, Calendar, Clock, Trophy, Flame, CheckCircle2, Crown, Sparkles } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { GradientBackground } from '@/components/GradientBackground';
import { ProgressRing } from '@/components/ProgressRing';
import { ActivityCalendar } from '@/components/ActivityCalendar';
import { useGoalStore } from '@/hooks/use-goal-store';
import type { DailyTask } from '@/types/goal';


const EMPTY_TASKS: DailyTask[] = [];

type TimePeriod = 'day' | 'week' | 'month';

export default function ProgressScreen() {
  const store = useGoalStore();
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('day');
  const [animatedValue] = useState(new Animated.Value(0));

  const profile = store?.profile;
  const currentGoal = store?.currentGoal;
  const dailyTasks = store?.dailyTasks ?? EMPTY_TASKS;

  const goalTasks = useMemo(() => {
    if (!currentGoal?.id) return [];
    return dailyTasks.filter((task) => task.goalId === currentGoal.id);
  }, [currentGoal?.id, dailyTasks]);

  const completedTasks = useMemo(() => {
    return goalTasks.filter((task) => task.completed).length;
  }, [goalTasks]);

  const todayStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!currentGoal?.id) return { completed: 0, total: 0 };

    const todayTasks = dailyTasks.filter((t) => {
      const taskDate = new Date(t.date);
      taskDate.setHours(0, 0, 0, 0);
      return t.goalId === currentGoal.id && taskDate.getTime() === today.getTime();
    });

    const completed = todayTasks.filter((t) => t.completed).length;
    return { completed, total: todayTasks.length };
  }, [currentGoal?.id, dailyTasks]);

  const monthStats = useMemo(() => {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    if (!currentGoal?.id) return { completed: 0, target: 50 };

    const monthTasks = dailyTasks.filter((t) => {
      const taskDate = new Date(t.date);
      return t.goalId === currentGoal.id && taskDate >= monthStart && taskDate <= monthEnd;
    });

    const completed = monthTasks.filter((t) => t.completed).length;
    return { completed, target: 50 };
  }, [currentGoal?.id, dailyTasks]);

  if (!store || !store.isReady || !profile) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  // Используем новую функцию из store для получения статистики
  const periodStats = store?.getProgressForPeriod ? store.getProgressForPeriod(selectedPeriod) : { completed: 0, total: 0, percentage: 0 };
  
  const stats = [
    {
      icon: Zap,
      label: 'Current Streak',
      value: profile.currentStreak,
      unit: 'days',
      color: theme.colors.warning,
    },
    {
      icon: Award,
      label: 'Best Streak',
      value: profile.bestStreak,
      unit: 'days',
      color: theme.colors.primary,
    },
    {
      icon: Target,
      label: 'Total Completed',
      value: completedTasks,
      unit: 'tasks',
      color: theme.colors.success,
    },
  ];
  
  const handlePeriodChange = (period: TimePeriod) => {
    setSelectedPeriod(period);
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      animatedValue.setValue(0);
    });
  };
  
  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'day': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      default: return 'Today';
    }
  };
  
  const getEmptyMessage = () => {
    if (periodStats.total === 0) {
      switch (selectedPeriod) {
        case 'day': return 'Today is a free day';
        case 'week': return 'No tasks this week yet';
        case 'month': return 'No tasks this month yet';
        default: return 'No tasks yet';
      }
    }
    if (periodStats.percentage === 100) {
      return 'Excellent! All tasks completed!';
    }
    return null;
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}

        >
          <View style={styles.header}>
            <Text style={styles.title}>Your Progress</Text>
            
            {/* Переключатель периодов */}
            <View style={styles.periodSelector}>
              {(['day', 'week', 'month'] as TimePeriod[]).map((period) => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.periodButton,
                    selectedPeriod === period && styles.periodButtonActive
                  ]}
                  onPress={() => handlePeriodChange(period)}
                >
                  <Text style={[
                    styles.periodButtonText,
                    selectedPeriod === period && styles.periodButtonTextActive
                  ]}>
                    {period === 'day' ? 'Day' : period === 'week' ? 'Week' : 'Month'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {currentGoal ? (
            <>
              <View style={styles.progressCard}>
                <ProgressRing progress={periodStats.percentage} size={140} />
                <View style={styles.progressStats}>
                  <Text style={styles.progressLabel}>{getPeriodLabel()}</Text>
                  <Text style={styles.progressValue}>
                    {periodStats.completed} {periodStats.completed === 1 ? 'task' : 'tasks'} completed
                  </Text>
                  <Text style={styles.progressSubtext}>
                    {getEmptyMessage() || 'Keep going at your pace'}
                  </Text>
                </View>
              </View>
              
              {/* Основная карточка статистики */}
              <View style={styles.mainStatsCard}>
                <View style={styles.mainStatRow}>
                  <View style={styles.mainStatItem}>
                    <Calendar size={20} color={theme.colors.primary} />
                    <Text style={styles.mainStatLabel}>Today</Text>
                    <Text style={styles.mainStatValue}>
                      {todayStats.total > 0 ? `${todayStats.completed}/${todayStats.total}` : '0'}
                    </Text>
                  </View>
                  <View style={styles.mainStatDivider} />
                  <View style={styles.mainStatItem}>
                    <Clock size={20} color={theme.colors.success} />
                    <Text style={styles.mainStatLabel}>This Week</Text>
                    <Text style={styles.mainStatValue}>
                      {(() => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const dayOfWeek = today.getDay();
                        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                        const weekStart = new Date(today);
                        weekStart.setDate(today.getDate() - daysToMonday);
                        const weekEnd = new Date(weekStart);
                        weekEnd.setDate(weekStart.getDate() + 6);
                        weekEnd.setHours(23, 59, 59, 999);
                        
                        const weekTasks = dailyTasks.filter(t => {
                          const taskDate = new Date(t.date);
                          return t.goalId === currentGoal?.id && taskDate >= weekStart && taskDate <= weekEnd;
                        });
                        const completed = weekTasks.filter(t => t.completed).length;
                        const total = weekTasks.length;
                        return total > 0 ? `${completed}/${total}` : '0';
                      })()}
                    </Text>
                  </View>
                </View>
                <View style={styles.mainStatDividerHorizontal} />
                <View style={styles.mainStatRow}>
                  <View style={styles.mainStatItem}>
                    <Trophy size={20} color={theme.colors.warning} />
                    <Text style={styles.mainStatLabel}>This Month</Text>
                    <Text style={styles.mainStatValue}>
                      {`${monthStats.completed}/${monthStats.target}`}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.statsGrid}>
                {stats.map((stat, index) => (
                  <View key={index} style={styles.statCard}>
                    <stat.icon size={24} color={stat.color} />
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text style={styles.statUnit}>{stat.unit}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </View>
                ))}
              </View>


              {/* Календарь активности */}
              <View style={styles.activityCalendarContainer}>
                <ActivityCalendar 
                  completedDates={dailyTasks
                    .filter(t => t.goalId === currentGoal?.id && t.completed)
                    .map(t => new Date(t.date).toISOString().split('T')[0])}
                  currentStreak={profile.currentStreak}
                />
              </View>
              
              <AchievementsSection
                currentStreak={profile.currentStreak}
                todayCompleted={todayStats.completed}
                todayTotal={todayStats.total}
                monthCompleted={monthStats.completed}
                monthTarget={monthStats.target}
                totalCompletedTasks={completedTasks}
              />
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <TrendingUp size={64} color={theme.colors.textLight} />
              <Text style={styles.emptyTitle}>No progress yet</Text>
              <Text style={styles.emptyDescription}>
                Start your first goal to track progress
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}


type AchievementDefinition = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  accent: string;
  getProgress: (stats: {
    todayCompleted: number;
    todayTotal: number;
    currentStreak: number;
    monthCompleted: number;
    monthTarget: number;
    totalCompletedTasks: number;
  }) => { current: number; target: number };
};

type AchievementsSectionProps = {
  currentStreak: number;
  todayCompleted: number;
  todayTotal: number;
  monthCompleted: number;
  monthTarget: number;
  totalCompletedTasks: number;
};

const AchievementsSection = memo(function AchievementsSection({
  currentStreak,
  todayCompleted,
  todayTotal,
  monthCompleted,
  monthTarget,
  totalCompletedTasks,
}: AchievementsSectionProps) {
  const achievements = useMemo<AchievementDefinition[]>(() => {
    return [
      {
        id: 'daily-5',
        title: 'Daily Finisher',
        description: 'Complete 5 tasks in a day',
        icon: CheckCircle2,
        accent: theme.colors.success,
        getProgress: (s) => ({ current: s.todayCompleted, target: 5 }),
      },
      {
        id: 'daily-perfect',
        title: 'No Loose Ends',
        description: 'Finish 100% of your tasks today',
        icon: Target,
        accent: theme.colors.primary,
        getProgress: (s) => ({ current: s.todayTotal > 0 ? s.todayCompleted : 0, target: s.todayTotal > 0 ? s.todayTotal : 1 }),
      },
      {
        id: 'streak-7',
        title: 'Streak Starter',
        description: 'Reach a 7‑day streak',
        icon: Flame,
        accent: theme.colors.warning,
        getProgress: (s) => ({ current: s.currentStreak, target: 7 }),
      },
      {
        id: 'month-50',
        title: 'Momentum Month',
        description: 'Complete 50 tasks this month',
        icon: Trophy,
        accent: theme.colors.primaryDark,
        getProgress: (s) => ({ current: s.monthCompleted, target: s.monthTarget }),
      },
      {
        id: 'total-250',
        title: 'Crafted Discipline',
        description: 'Complete 250 tasks overall',
        icon: Sparkles,
        accent: '#E8C060',
        getProgress: (s) => ({ current: s.totalCompletedTasks, target: 250 }),
      },
      {
        id: 'streak-30',
        title: 'Unbreakable',
        description: 'Hold a 30‑day streak',
        icon: Crown,
        accent: theme.colors.primary,
        getProgress: (s) => ({ current: s.currentStreak, target: 30 }),
      },
    ];
  }, []);

  return (
    <View style={styles.achievementsCard} testID="rewards-card">
      <Text style={styles.achievementsTitle} testID="rewards-title">
        Rewards
      </Text>

      <View style={styles.achievementsList} testID="rewards-list">
        {achievements.map((a) => {
          const progress = a.getProgress({
            todayCompleted,
            todayTotal,
            currentStreak,
            monthCompleted,
            monthTarget,
            totalCompletedTasks,
          });

          const target = Math.max(1, progress.target);
          const current = Math.max(0, Math.min(progress.current, target));
          const pct = Math.round((current / target) * 100);
          const unlocked = progress.current >= progress.target;

          return (
            <View
              key={a.id}
              style={[styles.achievementRow, unlocked ? styles.achievementRowUnlocked : styles.achievementRowLocked]}
              testID={`reward-${a.id}`}
            >
              <View
                style={[
                  styles.achievementIconWrap,
                  {
                    borderColor: a.accent + '45',
                    backgroundColor: a.accent + (unlocked ? '18' : '10'),
                  },
                ]}
              >
                <a.icon size={18} color={a.accent} />
              </View>

              <View style={styles.achievementBody}>
                <View style={styles.achievementTopRow}>
                  <Text style={styles.achievementTitleText} numberOfLines={1}>
                    {a.title}
                  </Text>

                  <View
                    style={[
                      styles.achievementPill,
                      {
                        borderColor: a.accent + '35',
                        backgroundColor: a.accent + (unlocked ? '14' : '0D'),
                      },
                    ]}
                  >
                    <Text style={styles.achievementPillText}>{unlocked ? 'Unlocked' : `${pct}%`}</Text>
                  </View>
                </View>

                <Text style={styles.achievementDesc} numberOfLines={2}>
                  {a.description}
                </Text>

                <View style={styles.achievementProgressRow}>
                  <View style={styles.achievementTrack}>
                    <View style={[styles.achievementFill, { width: `${Math.min(100, pct)}%`, backgroundColor: a.accent }]} />
                  </View>

                  <Text style={styles.achievementNumbers}>
                    {progress.current}/{progress.target}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  header: {
    marginTop: 16,
    marginBottom: 20,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 4,
    marginTop: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  periodButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  periodButtonTextActive: {
    color: theme.colors.background,
    fontWeight: theme.fontWeight.semibold,
  },
  title: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  progressCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  mainStatsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  mainStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mainStatItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  mainStatDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: 12,
  },
  mainStatDividerHorizontal: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 12,
  },
  mainStatLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  mainStatValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
    marginTop: 4,
  },
  progressStats: {
    marginTop: 20,
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  progressValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginTop: 8,
  },
  progressSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginTop: 12,
  },
  statUnit: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  activityCalendarContainer: {
    marginBottom: 24,
  },
  achievementsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  achievementsTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: 14,
    letterSpacing: 0.2,
  },
  achievementsList: {
    gap: 12,
  },
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
  },
  achievementRowLocked: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderColor: theme.colors.border,
    opacity: 0.88,
  },
  achievementRowUnlocked: {
    backgroundColor: theme.colors.surfaceGlass,
    borderColor: theme.colors.glassBorder,
    opacity: 1,
  },
  achievementIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  achievementBody: {
    flex: 1,
  },
  achievementTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  achievementTitleText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  achievementPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
  },
  achievementPillText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  achievementDesc: {
    marginTop: 4,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  achievementProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  achievementTrack: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceElevated,
    overflow: 'hidden',
  },
  achievementFill: {
    height: 6,
    borderRadius: 999,
  },
  achievementNumbers: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
    minWidth: 62,
    textAlign: 'right',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginTop: 32,
    marginBottom: 16,
  },
  emptyDescription: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.text,
  },
});