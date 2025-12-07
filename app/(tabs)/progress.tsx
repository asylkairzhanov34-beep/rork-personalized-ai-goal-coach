import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp, Award, Target, Zap, Calendar, Clock, Trophy } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { GradientBackground } from '@/components/GradientBackground';
import { ProgressRing } from '@/components/ProgressRing';
import { AIInsightCard } from '@/components/AIInsightCard';
import { useGoalStore } from '@/hooks/use-goal-store';


type TimePeriod = 'day' | 'week' | 'month';

export default function ProgressScreen() {
  const store = useGoalStore();
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('day');
  const [animatedValue] = useState(new Animated.Value(0));
  
  // Правильный расчет задач для текущей цели
  const goalTasks = store?.currentGoal ? store.dailyTasks.filter(task => task.goalId === store.currentGoal?.id) : [];
  const completedTasks = goalTasks.filter(task => task.completed === true).length;
  const totalTasks = goalTasks.length;
  
  if (!store || !store.isReady) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Загрузка...</Text>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }
  
  const { profile, currentGoal, dailyTasks } = store;

  // Используем новую функцию из store для получения статистики
  const periodStats = store?.getProgressForPeriod ? store.getProgressForPeriod(selectedPeriod) : { completed: 0, total: 0, percentage: 0 };
  
  const stats = [
    {
      icon: Zap,
      label: 'Текущая серия',
      value: profile.currentStreak,
      unit: 'дней',
      color: theme.colors.warning,
    },
    {
      icon: Award,
      label: 'Лучшая серия',
      value: profile.bestStreak,
      unit: 'дней',
      color: theme.colors.primary,
    },
    {
      icon: Target,
      label: 'Всего выполнено',
      value: `${completedTasks}/${totalTasks}`,
      unit: 'задач',
      color: theme.colors.success,
    },
  ];

  const weeklyProgress = getWeeklyProgress(dailyTasks, currentGoal?.id);
  
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
      case 'day': return 'Сегодня';
      case 'week': return 'За неделю';
      case 'month': return 'За месяц';
      default: return 'Сегодня';
    }
  };
  
  const getEmptyMessage = () => {
    if (periodStats.total === 0) {
      switch (selectedPeriod) {
        case 'day': return 'Сегодня у вас свободный день, можно начать в любое время';
        case 'week': return 'На этой неделе пока нет задач';
        case 'month': return 'В этом месяце пока нет задач';
        default: return 'Пока нет задач';
      }
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
            <Text style={styles.title}>Ваш прогресс</Text>
            
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
                    {period === 'day' ? 'День' : period === 'week' ? 'Неделя' : 'Месяц'}
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
                    {periodStats.completed} из {periodStats.total} задач
                  </Text>
                  <Text style={styles.progressSubtext}>
                    {getEmptyMessage() || 'Продолжайте в своём темпе'}
                  </Text>
                </View>
              </View>
              
              {/* Основная карточка статистики */}
              <View style={styles.mainStatsCard}>
                <View style={styles.mainStatRow}>
                  <View style={styles.mainStatItem}>
                    <Calendar size={20} color={theme.colors.primary} />
                    <Text style={styles.mainStatLabel}>Сегодня выполнено</Text>
                    <Text style={styles.mainStatValue}>
                      {(() => {
                        const todayStr = new Date().toDateString();
                        const todayTasks = dailyTasks.filter(t => 
                          t.goalId === currentGoal?.id &&
                          new Date(t.date).toDateString() === todayStr
                        );
                        const todayCompleted = todayTasks.filter(t => t.completed === true).length;
                        return `${todayCompleted}/${todayTasks.length}`;
                      })()} задач
                    </Text>
                  </View>
                  <View style={styles.mainStatDivider} />
                  <View style={styles.mainStatItem}>
                    <Clock size={20} color={theme.colors.success} />
                    <Text style={styles.mainStatLabel}>Всего за неделю</Text>
                    <Text style={styles.mainStatValue}>
                      {(() => {
                        const today = new Date();
                        const weekStart = new Date(today);
                        const dayOfWeek = today.getDay();
                        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                        weekStart.setDate(today.getDate() - daysToMonday);
                        weekStart.setHours(0, 0, 0, 0);
                        const weekEnd = new Date(weekStart);
                        weekEnd.setDate(weekStart.getDate() + 6);
                        weekEnd.setHours(23, 59, 59, 999);
                        
                        const weekTasks = dailyTasks.filter(t => {
                          if (t.goalId !== currentGoal?.id) return false;
                          const taskDate = new Date(t.date);
                          return taskDate >= weekStart && taskDate <= weekEnd;
                        });
                        const weekCompleted = weekTasks.filter(t => t.completed === true).length;
                        return `${weekCompleted}/${weekTasks.length}`;
                      })()} задач
                    </Text>
                  </View>
                </View>
                <View style={styles.mainStatDivider} />
                <View style={styles.mainStatRow}>
                  <View style={styles.mainStatItem}>
                    <Trophy size={20} color={theme.colors.warning} />
                    <Text style={styles.mainStatLabel}>Всего за месяц</Text>
                    <Text style={styles.mainStatValue}>
                      {(() => {
                        const today = new Date();
                        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                        monthStart.setHours(0, 0, 0, 0);
                        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                        monthEnd.setHours(23, 59, 59, 999);
                        
                        const monthTasks = dailyTasks.filter(t => {
                          if (t.goalId !== currentGoal?.id) return false;
                          const taskDate = new Date(t.date);
                          return taskDate >= monthStart && taskDate <= monthEnd;
                        });
                        const monthCompleted = monthTasks.filter(t => t.completed === true).length;
                        return `${monthCompleted}/${monthTasks.length}`;
                      })()} задач
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

              <View style={styles.weeklyCard}>
                <Text style={styles.weeklyTitle}>Обзор прогресса</Text>
                <View style={styles.weeklyChart}>
                  {weeklyProgress.map((day, index) => (
                    <View key={index} style={styles.dayColumn}>
                      <View style={styles.barContainer}>
                        <View
                          style={[
                            styles.bar,
                            { height: Math.max(day.percentage, 4) },
                            day.isToday && styles.todayBar,
                          ]}
                        />
                        <Text style={styles.taskCount}>{day.completedTasks}</Text>
                      </View>
                      <Text style={styles.dayLabel}>{day.label}</Text>
                      <Text style={styles.daySubLabel}>
                        {day.completedTasks > 0 ? `${day.completedTasks} задач` : '0 задач'}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
              
              {/* AI-инсайт-карточка */}
              <View style={styles.aiInsightContainer}>
                <AIInsightCard />
              </View>
              
              {/* Блок достижений */}
              <View style={styles.achievementsCard}>
                <Text style={styles.achievementsTitle}>Достижения</Text>
                <View style={styles.achievementsGrid}>
                  <View style={[
                    styles.achievementBadge,
                    dailyTasks.filter(t => 
                      t.goalId === currentGoal?.id &&
                      new Date(t.date).toDateString() === new Date().toDateString() && t.completed === true
                    ).length >= 5 && styles.achievementBadgeActive
                  ]}>
                    <Text style={styles.achievementEmoji}>✅</Text>
                    <Text style={styles.achievementText}>5 задач за день</Text>
                  </View>
                  
                  <View style={[
                    styles.achievementBadge,
                    profile.currentStreak >= 7 && styles.achievementBadgeActive
                  ]}>
                    <Text style={styles.achievementEmoji}>🔥</Text>
                    <Text style={styles.achievementText}>Неделя без пропусков</Text>
                  </View>
                  
                  <View style={[
                    styles.achievementBadge,
                    completedTasks >= 50 && styles.achievementBadgeActive
                  ]}>
                    <Text style={styles.achievementEmoji}>🏅</Text>
                    <Text style={styles.achievementText}>50 задач за месяц</Text>
                  </View>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <TrendingUp size={64} color={theme.colors.textLight} />
              <Text style={styles.emptyTitle}>Пока нет прогресса</Text>
              <Text style={styles.emptyDescription}>
                Начните свою первую цель, чтобы отслеживать прогресс
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

function getWeeklyProgress(tasks: any[], goalId?: string) {
  const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const today = new Date();
  const todayDayOfWeek = today.getDay();
  const adjustedToday = todayDayOfWeek === 0 ? 6 : todayDayOfWeek - 1;

  // Начало текущей недели (понедельник)
  const weekStart = new Date(today);
  const daysToMonday = todayDayOfWeek === 0 ? 6 : todayDayOfWeek - 1;
  weekStart.setDate(today.getDate() - daysToMonday);
  weekStart.setHours(0, 0, 0, 0);

  // Фильтруем задачи по текущей цели
  const goalTasks = goalId ? tasks.filter(task => task.goalId === goalId) : tasks;

  return days.map((label, index) => {
    // Вычисляем дату для каждого дня недели
    const dayDate = new Date(weekStart);
    dayDate.setDate(weekStart.getDate() + index);
    const dayDateStr = dayDate.toDateString();
    
    const dayTasks = goalTasks.filter(task => {
      const taskDate = new Date(task.date);
      return taskDate.toDateString() === dayDateStr;
    });

    // Используем строгое сравнение === true
    const completed = dayTasks.filter(t => t.completed === true).length;
    const total = dayTasks.length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;

    return {
      label,
      percentage,
      completedTasks: completed,
      totalTasks: total,
      isToday: index === adjustedToday,
    };
  });
}

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
  weeklyCard: {
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
  aiInsightContainer: {
    marginBottom: 24,
  },
  weeklyTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: 20,
  },
  weeklyChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barContainer: {
    flex: 1,
    width: '70%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    position: 'relative',
  },
  bar: {
    backgroundColor: theme.colors.primary + '30',
    borderRadius: theme.borderRadius.sm,
    width: '100%',
    minHeight: 4,
  },
  todayBar: {
    backgroundColor: theme.colors.primary,
  },
  taskCount: {
    position: 'absolute',
    top: -20,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  dayLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 12,
    fontWeight: theme.fontWeight.semibold,
  },
  daySubLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textLight,
    marginTop: 2,
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
    marginBottom: 16,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  achievementBadge: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    alignItems: 'center',
    opacity: 0.5,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  achievementBadgeActive: {
    opacity: 1,
    backgroundColor: theme.colors.primary + '10',
    borderColor: theme.colors.primary + '30',
  },
  achievementEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  achievementText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontWeight: theme.fontWeight.medium,
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