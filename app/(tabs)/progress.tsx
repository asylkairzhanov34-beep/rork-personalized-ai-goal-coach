import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp, Award, Target, Zap, Calendar, Clock, Trophy } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { GradientBackground } from '@/components/GradientBackground';
import { ProgressRing } from '@/components/ProgressRing';
import { ActivityCalendar } from '@/components/ActivityCalendar';
import { useGoalStore } from '@/hooks/use-goal-store';


type TimePeriod = 'day' | 'week' | 'month';

export default function ProgressScreen() {
  const store = useGoalStore();
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('day');
  const [animatedValue] = useState(new Animated.Value(0));
  
  // Правильный расчет задач для текущей цели
  const goalTasks = store?.currentGoal ? store.dailyTasks.filter(task => task.goalId === store.currentGoal?.id) : [];
  const completedTasks = goalTasks.filter(task => task.completed).length;
  
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
      value: completedTasks,
      unit: 'задач',
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
      case 'day': return 'Сегодня';
      case 'week': return 'За неделю';
      case 'month': return 'За месяц';
      default: return 'Сегодня';
    }
  };
  
  const getEmptyMessage = () => {
    if (periodStats.total === 0) {
      switch (selectedPeriod) {
        case 'day': return 'Сегодня у вас свободный день';
        case 'week': return 'На этой неделе пока нет задач';
        case 'month': return 'В этом месяце пока нет задач';
        default: return 'Пока нет задач';
      }
    }
    if (periodStats.percentage === 100) {
      return 'Отлично! Все задачи выполнены!';
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
                    {periodStats.completed} {periodStats.completed === 1 ? 'задача' : periodStats.completed < 5 ? 'задачи' : 'задач'} выполнено
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
                    <Text style={styles.mainStatLabel}>Сегодня</Text>
                    <Text style={styles.mainStatValue}>
                      {(() => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const todayTasks = dailyTasks.filter(t => {
                          const taskDate = new Date(t.date);
                          taskDate.setHours(0, 0, 0, 0);
                          return t.goalId === currentGoal?.id && taskDate.getTime() === today.getTime();
                        });
                        const completed = todayTasks.filter(t => t.completed).length;
                        const total = todayTasks.length;
                        return total > 0 ? `${completed}/${total}` : '0';
                      })()}
                    </Text>
                  </View>
                  <View style={styles.mainStatDivider} />
                  <View style={styles.mainStatItem}>
                    <Clock size={20} color={theme.colors.success} />
                    <Text style={styles.mainStatLabel}>За неделю</Text>
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
                    <Text style={styles.mainStatLabel}>За месяц</Text>
                    <Text style={styles.mainStatValue}>
                      {(() => {
                        const today = new Date();
                        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                        monthEnd.setHours(23, 59, 59, 999);
                        
                        const monthTasks = dailyTasks.filter(t => {
                          const taskDate = new Date(t.date);
                          return t.goalId === currentGoal?.id && taskDate >= monthStart && taskDate <= monthEnd;
                        });
                        const completed = monthTasks.filter(t => t.completed).length;
                        return `${completed}/30`;
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
              
              {/* Блок достижений */}
              <View style={styles.achievementsCard}>
                <Text style={styles.achievementsTitle}>Достижения</Text>
                <View style={styles.achievementsGrid}>
                  <View style={[
                    styles.achievementBadge,
                    dailyTasks.filter(t => 
                      t.goalId === currentGoal?.id &&
                      new Date(t.date).toDateString() === new Date().toDateString() && t.completed
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