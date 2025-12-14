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

    const target = 30;
    if (!currentGoal?.id) return { completed: 0, target };

    const monthTasks = dailyTasks.filter((t) => {
      const taskDate = new Date(t.date);
      return t.goalId === currentGoal.id && taskDate >= monthStart && taskDate <= monthEnd;
    });

    const completedRaw = monthTasks.filter((t) => t.completed).length;
    return { completed: Math.min(target, completedRaw), target };
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
                        const p = store?.getProgressForPeriod ? store.getProgressForPeriod('week') : { completed: 0, total: 7 };
                        return p.total > 0 ? `${p.completed}/${p.total}` : '0';
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
                      {(() => {
                        const p = store?.getProgressForPeriod ? store.getProgressForPeriod('month') : { completed: monthStats.completed, total: monthStats.target };
                        return `${p.completed}/${p.total}`;
                      })()}
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


type AchievementProgress = {
  current: number;
  target: number;
  eligible?: boolean;
};

type AchievementStats = {
  todayCompleted: number;
  todayTotal: number;
  currentStreak: number;
  monthCompleted: number;
  totalCompletedTasks: number;
};

type AchievementDefinition = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  accent: string;
  getProgress: (stats: AchievementStats) => AchievementProgress;
};

type AchievementTier = {
  id: string;
  label: string;
  achievements: AchievementDefinition[];
};

function computeUnlocked(achievement: AchievementDefinition, stats: AchievementStats) {
  const p = achievement.getProgress(stats);
  const eligible = p.eligible ?? true;
  return eligible && p.current >= p.target;
}

function getAchievementTiers(): AchievementTier[] {
  const gold = theme.colors.primary;
  const emerald = theme.colors.success;
  const ember = theme.colors.warning;
  const royal = theme.colors.primaryDark;

  return [
    {
      id: 'tier-1',
      label: 'Level 1',
      achievements: [
        {
          id: 'daily-5',
          title: 'Daily Finisher',
          description: 'Complete 5 tasks in a day',
          icon: CheckCircle2,
          accent: emerald,
          getProgress: (s) => ({ current: s.todayCompleted, target: 5 }),
        },
        {
          id: 'daily-perfect',
          title: 'No Loose Ends',
          description: 'Finish 100% of your tasks today',
          icon: Target,
          accent: gold,
          getProgress: (s) => ({
            current: s.todayTotal > 0 ? s.todayCompleted : 0,
            target: s.todayTotal > 0 ? s.todayTotal : 1,
            eligible: s.todayTotal > 0,
          }),
        },
        {
          id: 'streak-7',
          title: 'Streak Starter',
          description: 'Reach a 7‑day streak',
          icon: Flame,
          accent: ember,
          getProgress: (s) => ({ current: s.currentStreak, target: 7 }),
        },
        {
          id: 'month-50',
          title: 'Momentum Month',
          description: 'Complete 50 tasks this month',
          icon: Trophy,
          accent: royal,
          getProgress: (s) => ({ current: s.monthCompleted, target: 50 }),
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
          accent: gold,
          getProgress: (s) => ({ current: s.currentStreak, target: 30 }),
        },
      ],
    },
    {
      id: 'tier-2',
      label: 'Level 2',
      achievements: [
        {
          id: 'daily-8',
          title: 'Power Day',
          description: 'Complete 8 tasks in a day',
          icon: Zap,
          accent: emerald,
          getProgress: (s) => ({ current: s.todayCompleted, target: 8 }),
        },
        {
          id: 'daily-perfect-5',
          title: 'Perfect Execution',
          description: 'Complete 100% of today’s tasks (min 5)',
          icon: Target,
          accent: gold,
          getProgress: (s) => {
            const min = 5;
            const eligible = s.todayTotal >= min;
            const target = eligible ? s.todayTotal : min;
            const current = eligible ? s.todayCompleted : Math.min(s.todayCompleted, min);
            return { current, target, eligible };
          },
        },
        {
          id: 'streak-14',
          title: 'Two‑Week Flow',
          description: 'Reach a 14‑day streak',
          icon: Flame,
          accent: ember,
          getProgress: (s) => ({ current: s.currentStreak, target: 14 }),
        },
        {
          id: 'month-100',
          title: 'Heavy Month',
          description: 'Complete 100 tasks this month',
          icon: Trophy,
          accent: royal,
          getProgress: (s) => ({ current: s.monthCompleted, target: 100 }),
        },
        {
          id: 'total-500',
          title: 'Built to Last',
          description: 'Complete 500 tasks overall',
          icon: Sparkles,
          accent: '#E8C060',
          getProgress: (s) => ({ current: s.totalCompletedTasks, target: 500 }),
        },
        {
          id: 'streak-60',
          title: 'Iron Will',
          description: 'Hold a 60‑day streak',
          icon: Crown,
          accent: gold,
          getProgress: (s) => ({ current: s.currentStreak, target: 60 }),
        },
      ],
    },
    {
      id: 'tier-3',
      label: 'Level 3',
      achievements: [
        {
          id: 'daily-12',
          title: 'Relentless',
          description: 'Complete 12 tasks in a day',
          icon: Zap,
          accent: emerald,
          getProgress: (s) => ({ current: s.todayCompleted, target: 12 }),
        },
        {
          id: 'daily-perfect-8',
          title: 'Clinical Precision',
          description: 'Complete 100% of today’s tasks (min 8)',
          icon: Target,
          accent: gold,
          getProgress: (s) => {
            const min = 8;
            const eligible = s.todayTotal >= min;
            const target = eligible ? s.todayTotal : min;
            const current = eligible ? s.todayCompleted : Math.min(s.todayCompleted, min);
            return { current, target, eligible };
          },
        },
        {
          id: 'streak-90',
          title: 'Seasoned',
          description: 'Reach a 90‑day streak',
          icon: Flame,
          accent: ember,
          getProgress: (s) => ({ current: s.currentStreak, target: 90 }),
        },
        {
          id: 'month-200',
          title: 'Master Month',
          description: 'Complete 200 tasks this month',
          icon: Trophy,
          accent: royal,
          getProgress: (s) => ({ current: s.monthCompleted, target: 200 }),
        },
        {
          id: 'total-1000',
          title: 'Legacy',
          description: 'Complete 1000 tasks overall',
          icon: Sparkles,
          accent: '#E8C060',
          getProgress: (s) => ({ current: s.totalCompletedTasks, target: 1000 }),
        },
        {
          id: 'streak-180',
          title: 'Titan',
          description: 'Hold a 180‑day streak',
          icon: Crown,
          accent: gold,
          getProgress: (s) => ({ current: s.currentStreak, target: 180 }),
        },
      ],
    },
  ];
}

function selectTier(stats: AchievementStats): AchievementTier {
  const tiers = getAchievementTiers();

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    const allUnlocked = tier.achievements.every((a) => computeUnlocked(a, stats));
    if (!allUnlocked) return tier;
  }

  const currentLevel = tiers.length + 1;

  const dynamicMultiplier = 1 + Math.max(0, Math.floor(stats.totalCompletedTasks / 1000));
  const monthTarget = 200 + dynamicMultiplier * 100;
  const totalTarget = 1000 + dynamicMultiplier * 500;
  const dailyTarget = 12 + dynamicMultiplier * 2;
  const streakTarget = 180 + dynamicMultiplier * 30;

  return {
    id: `tier-dynamic-${dynamicMultiplier}`,
    label: `Level ${currentLevel}+`,
    achievements: [
      {
        id: `daily-${dailyTarget}`,
        title: 'Relentless+',
        description: `Complete ${dailyTarget} tasks in a day`,
        icon: Zap,
        accent: theme.colors.success,
        getProgress: (s) => ({ current: s.todayCompleted, target: dailyTarget }),
      },
      {
        id: `streak-${streakTarget}`,
        title: 'Titan+',
        description: `Hold a ${streakTarget}‑day streak`,
        icon: Crown,
        accent: theme.colors.primary,
        getProgress: (s) => ({ current: s.currentStreak, target: streakTarget }),
      },
      {
        id: `month-${monthTarget}`,
        title: 'Master Month+',
        description: `Complete ${monthTarget} tasks this month`,
        icon: Trophy,
        accent: theme.colors.primaryDark,
        getProgress: (s) => ({ current: s.monthCompleted, target: monthTarget }),
      },
      {
        id: `total-${totalTarget}`,
        title: 'Legacy+',
        description: `Complete ${totalTarget} tasks overall`,
        icon: Sparkles,
        accent: '#E8C060',
        getProgress: (s) => ({ current: s.totalCompletedTasks, target: totalTarget }),
      },
    ],
  };
}

function getAchievementProgressLabel(achievement: AchievementDefinition, stats: AchievementStats) {
  const p = achievement.getProgress(stats);
  const eligible = p.eligible ?? true;
  if (eligible) return null;

  if (achievement.id.startsWith('daily-perfect')) {
    return 'Add more tasks today to unlock';
  }

  return 'Not available yet';
}

function clampPct(current: number, target: number) {
  const safeTarget = Math.max(1, target);
  const safeCurrent = Math.max(0, Math.min(current, safeTarget));
  return Math.round((safeCurrent / safeTarget) * 100);
}

function getTierProgress(tier: AchievementTier, stats: AchievementStats) {
  const unlockedCount = tier.achievements.filter((a) => computeUnlocked(a, stats)).length;
  return { unlockedCount, total: tier.achievements.length };
}

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
  monthTarget: _monthTarget,
  totalCompletedTasks,
}: AchievementsSectionProps) {
  const stats = useMemo<AchievementStats>(
    () => ({
      todayCompleted,
      todayTotal,
      currentStreak,
      monthCompleted,
      totalCompletedTasks,
    }),
    [todayCompleted, todayTotal, currentStreak, monthCompleted, totalCompletedTasks],
  );

  const tier = useMemo(() => selectTier(stats), [stats]);
  const tierProgress = useMemo(() => getTierProgress(tier, stats), [tier, stats]);

  return (
    <View style={styles.achievementsCard} testID="rewards-card">
      <View style={styles.achievementsHeader}>
        <View>
          <Text style={styles.achievementsTitle} testID="rewards-title">
            Rewards
          </Text>
          <Text style={styles.achievementsSubtitle} testID="rewards-tier">
            {tier.label} · {tierProgress.unlockedCount}/{tierProgress.total}
          </Text>
        </View>

        <View style={styles.tierBadge} testID="rewards-tier-badge">
          <Text style={styles.tierBadgeText}>{tier.id.replace('tier-', '').toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.achievementsList} testID="rewards-list">
        {tier.achievements.map((a) => {
          const progress = a.getProgress(stats);
          const target = Math.max(1, progress.target);
          const current = Math.max(0, Math.min(progress.current, target));
          const pct = clampPct(progress.current, progress.target);
          const unlocked = computeUnlocked(a, stats);
          const helper = getAchievementProgressLabel(a, stats);

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

                {helper ? (
                  <Text style={styles.achievementHelper} numberOfLines={1}>
                    {helper}
                  </Text>
                ) : null}

                <View style={styles.achievementProgressRow}>
                  <View style={styles.achievementTrack}>
                    <View style={[styles.achievementFill, { width: `${Math.min(100, pct)}%`, backgroundColor: a.accent }]} />
                  </View>

                  <Text style={styles.achievementNumbers}>
                    {current}/{target}
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
  achievementsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  achievementsTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    letterSpacing: 0.2,
  },
  achievementsSubtitle: {
    marginTop: 6,
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
  },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  tierBadgeText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.bold,
    letterSpacing: 0.6,
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
  achievementHelper: {
    marginTop: 8,
    fontSize: theme.fontSize.xs,
    color: theme.colors.textLight,
    fontWeight: theme.fontWeight.medium,
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