import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Sparkles, ArrowRight } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useGoalStore } from '@/hooks/use-goal-store';
import { router } from 'expo-router';

interface AIInsightCardProps {
  onActionPress?: () => void;
}

export function AIInsightCard({ onActionPress }: AIInsightCardProps) {
  const store = useGoalStore();
  
  if (!store || !store.isReady) {
    return null;
  }
  
  const { profile, currentGoal, dailyTasks, pomodoroSessions } = store;
  
  // Генерируем инсайт на основе данных пользователя
  const generateInsight = () => {
    const today = new Date().toDateString();
    const todayTasks = dailyTasks.filter(task => 
      new Date(task.date).toDateString() === today
    );
    const completedTodayTasks = todayTasks.filter(t => t.completed);
    
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekTasks = dailyTasks.filter(task => 
      new Date(task.date) >= weekStart
    );
    const completedWeekTasks = weekTasks.filter(t => t.completed);
    
    const pomodoroToday = pomodoroSessions.filter(s => 
      new Date(s.startTime).toDateString() === today && s.completed
    );
    
    // Определяем время дня когда пользователь чаще всего выполняет задачи
    const completedTasks = dailyTasks.filter(t => t.completed && t.completedAt);
    const eveningTasks = completedTasks.filter(t => {
      const hour = new Date(t.completedAt!).getHours();
      return hour >= 18;
    }).length;
    const morningTasks = completedTasks.filter(t => {
      const hour = new Date(t.completedAt!).getHours();
      return hour < 12;
    }).length;
    
    // Логика генерации инсайтов
    if (!currentGoal) {
      return {
        title: 'Время начать!',
        message: 'Создайте свою первую цель и начните путь к успеху. Даже маленький шаг — это прогресс.',
        actionText: 'Создать цель',
        actionRoute: '/goal-creation',
        icon: '🎯'
      };
    }
    
    if (todayTasks.length === 0) {
      if (profile.currentStreak === 0) {
        return {
          title: 'Новый старт',
          message: 'Сегодня отличный день начать новую серию. Добавьте первую задачу и сделайте шаг к цели!',
          actionText: 'Добавить задачу',
          actionRoute: '/plan',
          icon: '✨'
        };
      } else {
        return {
          title: 'Продолжаем серию',
          message: `У вас серия в ${profile.currentStreak} дней! Не прерывайте её — добавьте задачу на сегодня.`,
          actionText: 'Запланировать',
          actionRoute: '/plan',
          icon: '🔥'
        };
      }
    }
    
    if (completedTodayTasks.length === 0 && todayTasks.length > 0) {
      if (pomodoroToday.length === 0) {
        return {
          title: 'Время сосредоточиться',
          message: 'У вас есть задачи на сегодня. Попробуйте технику Pomodoro — 25 минут фокуса творят чудеса!',
          actionText: 'Запустить таймер',
          actionRoute: '/timer',
          icon: '⏰'
        };
      } else {
        return {
          title: 'Продолжайте работу',
          message: 'Вы уже использовали Pomodoro сегодня — отличный подход! Завершите начатые задачи.',
          actionText: 'К задачам',
          actionRoute: '/plan',
          icon: '💪'
        };
      }
    }
    
    if (completedTodayTasks.length > 0 && completedTodayTasks.length < todayTasks.length) {
      const remaining = todayTasks.length - completedTodayTasks.length;
      return {
        title: 'Почти готово!',
        message: `Отлично! Выполнено ${completedTodayTasks.length} из ${todayTasks.length} задач. Осталось всего ${remaining}.`,
        actionText: 'Завершить день',
        actionRoute: '/plan',
        icon: '🎯'
      };
    }
    
    if (completedTodayTasks.length === todayTasks.length && todayTasks.length > 0) {
      if (profile.currentStreak >= profile.bestStreak && profile.bestStreak > 0) {
        return {
          title: 'Новый рекорд!',
          message: `Поздравляем! Вы побили свой рекорд серии: ${profile.currentStreak} дней подряд. Продолжайте завтра!`,
          actionText: 'Отдохнуть',
          actionRoute: '/breathing',
          icon: '🏆'
        };
      } else {
        return {
          title: 'День завершён!',
          message: 'Все задачи выполнены! Заслуженный отдых или дыхательная практика помогут восстановиться.',
          actionText: 'Расслабиться',
          actionRoute: '/breathing',
          icon: '✅'
        };
      }
    }
    
    if (eveningTasks > morningTasks && morningTasks > 0) {
      return {
        title: 'Утренний потенциал',
        message: 'Вы чаще выполняете задачи вечером. Попробуйте завтра начать с утренней задачи — это даст энергию на весь день!',
        actionText: 'Запланировать утром',
        actionRoute: '/plan',
        icon: '🌅'
      };
    }
    
    if (completedWeekTasks.length === 0 && weekTasks.length > 0) {
      return {
        title: 'Неделя возможностей',
        message: 'На этой неделе пока нет выполненных задач. Начните прямо сейчас — каждый день важен!',
        actionText: 'Начать сейчас',
        actionRoute: '/timer',
        icon: '🚀'
      };
    }
    
    // Дефолтный инсайт
    return {
      title: 'Продолжайте движение',
      message: 'Вы на правильном пути! Постоянство — ключ к достижению целей. Каждый день приближает к успеху.',
      actionText: 'К задачам',
      actionRoute: '/plan',
      icon: '💫'
    };
  };
  
  const insight = generateInsight();
  
  const handleActionPress = () => {
    if (onActionPress) {
      onActionPress();
    } else {
      router.push(insight.actionRoute as any);
    }
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Sparkles size={20} color={theme.colors.primary} style={styles.sparkleIcon} />
          <Text style={styles.title}>Инсайт от ИИ</Text>
        </View>
        <Text style={styles.emoji}>{insight.icon}</Text>
      </View>
      
      <Text style={styles.insightTitle}>{insight.title}</Text>
      <Text style={styles.message}>{insight.message}</Text>
      
      <TouchableOpacity style={styles.actionButton} onPress={handleActionPress}>
        <Text style={styles.actionText}>{insight.actionText}</Text>
        <ArrowRight size={16} color={theme.colors.background} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: 20,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: theme.colors.primary + '20',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sparkleIcon: {
    marginRight: 8,
  },
  title: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emoji: {
    fontSize: 24,
  },
  insightTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: 12,
  },
  message: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  actionText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.background,
    marginRight: 12,
  },
});