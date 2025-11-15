import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { User, Settings, Bell, Target, ChevronRight, Info, LogOut, MessageCircle, RotateCcw, Sparkles } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { GradientBackground } from '@/components/GradientBackground';

import { useGoalStore } from '@/hooks/use-goal-store';
import { useAuth } from '@/hooks/use-auth-store';
import { useFirstTimeSetup } from '@/hooks/use-first-time-setup';
import { useSubscription } from '@/hooks/use-subscription-store';



export default function ProfileScreen() {
  const store = useGoalStore();
  const { user, logout } = useAuth();
  const { profile: setupProfile } = useFirstTimeSetup();
  const { isPremium, status } = useSubscription();

  
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
  
  const { profile, currentGoal, resetGoal } = store;

  const handleResetGoal = () => {
    Alert.alert(
      'Сброс цели',
      'Вы уверены, что хотите сбросить текущую цель? Все прогресс и задачи будут удалены.',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Сбросить', 
          style: 'destructive',
          onPress: async () => {
            try {
              await resetGoal();
              Alert.alert('Готово', 'Цель успешно сброшена');
            } catch {
              Alert.alert('Ошибка', 'Не удалось сбросить цель');
            }
          }
        },
      ]
    );
  };

  const menuItems = [
    ...(!isPremium ? [{
      icon: Sparkles,
      title: 'Получить Premium',
      subtitle: 'Безграничный доступ ко всем функциям',
      onPress: () => router.push('/subscription'),
      isPremium: true,
    }] : [{
      icon: Sparkles,
      title: 'Premium активна',
      subtitle: 'Спасибо за поддержку!',
      onPress: () => router.push('/subscription'),
      isPremium: true,
    }]),
    {
      icon: MessageCircle,
      title: 'Помощник',
      subtitle: 'Чат с ИИ-тренером',
      onPress: () => router.push('/chat'),
    },
    ...(currentGoal ? [{
      icon: RotateCcw,
      title: 'Сбросить цель',
      subtitle: 'Удалить текущую цель и прогресс',
      onPress: handleResetGoal,
    }] : []),
    {
      icon: Bell,
      title: 'Уведомления',
      subtitle: 'Настройка напоминаний',
      onPress: () => router.push('/notifications'),
    },
    {
      icon: Settings,
      title: 'Настройки',
      subtitle: 'Предпочтения приложения',
      onPress: () => Alert.alert('Скоро', 'Настройки будут доступны в ближайшее время'),
    },
    {
      icon: Info,
      title: 'О приложении',
      subtitle: 'Версия 1.0.0',
      onPress: () => Alert.alert('GoalCoach AI', 'Ваш персональный ИИ-тренер для достижения целей\n\nВерсия 1.0.0'),
    },
  ];

  const handleLogout = () => {
    Alert.alert(
      'Выход',
      'Вы уверены, что хотите выйти?',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Выйти', 
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/auth');
            } catch {
              Alert.alert('Ошибка', 'Не удалось выйти из аккаунта');
            }
          }
        },
      ]
    );
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}

        >
          <View style={styles.header}>
            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                <User size={40} color={theme.colors.primary} />
              </View>
              <Text style={styles.name}>{setupProfile?.nickname || user?.name || user?.email || profile.name}</Text>
              <Text style={styles.memberSince}>
                Участник с {new Date(profile.joinedAt).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
              </Text>
            </View>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{profile.totalGoalsCompleted}</Text>
              <Text style={styles.statLabel}>Цели</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{profile.currentStreak}</Text>
              <Text style={styles.statLabel}>Серия</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{profile.bestStreak}</Text>
              <Text style={styles.statLabel}>Лучшая</Text>
            </View>
          </View>



          <View style={styles.menu}>
            {menuItems.map((item, index) => {
              const isPremiumItem = 'isPremium' in item && item.isPremium;
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.menuItem,
                    isPremiumItem && !isPremium && styles.premiumMenuItem,
                  ]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.menuIcon,
                    isPremiumItem && !isPremium && styles.premiumMenuIcon,
                  ]}>
                    <item.icon size={24} color={isPremiumItem && !isPremium ? '#FFD700' : theme.colors.primary} />
                  </View>
                  <View style={styles.menuContent}>
                    <Text style={[
                      styles.menuTitle,
                      isPremiumItem && !isPremium && styles.premiumMenuTitle,
                    ]}>{item.title}</Text>
                    <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                  </View>
                  <ChevronRight size={20} color={theme.colors.textLight} />
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.logoutMenuItem}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={styles.logoutIcon}>
              <LogOut size={24} color="#EF4444" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.logoutTitle}>Выйти из аккаунта</Text>
              <Text style={styles.menuSubtitle}>Завершить сеанс</Text>
            </View>
            <ChevronRight size={20} color={theme.colors.textLight} />
          </TouchableOpacity>
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
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 120,
  },
  header: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  profileCard: {
    alignItems: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadows.gold,
  },
  name: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  memberSince: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.medium,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.md,
  },
  menu: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.medium,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
  },
  menuSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  logoutMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    ...theme.shadows.medium,
  },
  logoutIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  logoutTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: '#EF4444',
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
  premiumMenuItem: {
    borderWidth: 2,
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
  },
  premiumMenuIcon: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
  },
  premiumMenuTitle: {
    color: '#FFD700',
  },
});