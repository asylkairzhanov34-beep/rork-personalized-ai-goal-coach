import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { User, Settings, Bell, ChevronRight, Info, LogOut, MessageCircle, RotateCcw, Sparkles, Edit3, X } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { GradientBackground } from '@/components/GradientBackground';

import { useGoalStore } from '@/hooks/use-goal-store';
import { useAuth } from '@/hooks/use-auth-store';
import { useFirstTimeSetup } from '@/hooks/use-first-time-setup';
import { useSubscription } from '@/hooks/use-subscription-store';
import { supabase } from '@/lib/supabase';



export default function ProfileScreen() {
  const store = useGoalStore();
  const { user, logout } = useAuth();
  const { profile: setupProfile, updateProfile: updateSetupProfile } = useFirstTimeSetup();
  const { isPremium } = useSubscription();
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const insets = useSafeAreaInsets();
  const safeAreaTop = insets.top;
  const contentTopPadding = theme.spacing.lg;

  
  if (!store || !store.isReady) {
    return (
      <GradientBackground>
        <View style={[styles.container, { paddingTop: insets.top }]}> 
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Загрузка...</Text>
          </View>
        </View>
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
    {
      icon: LogOut,
      title: 'Удалить аккаунт',
      subtitle: 'Безвозвратное удаление данных',
      onPress: () => handleDeleteAccount(),
      color: '#EF4444', // Custom property for red color
    },
  ];

  const handleDeleteAccount = () => {
    Alert.alert(
      'Удаление аккаунта',
      'Вы уверены? Это действие необратимо. Все ваши данные, включая подписку и прогресс, будут удалены.',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Удалить', 
          style: 'destructive', 
          onPress: async () => {
            try {
              if (user?.id) {
                 const { error } = await supabase.from('profiles').delete().eq('id', user.id);
                 if (error) throw error;
              }
              await logout();
              router.replace('/auth');
              Alert.alert('Аккаунт удален');
            } catch (error) {
              console.error(error);
              Alert.alert('Ошибка', 'Не удалось удалить аккаунт');
            }
          }
        }
      ]
    );
  };

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

  const handleEditNickname = () => {
    setNewNickname(setupProfile?.nickname || user?.name || '');
    setIsEditingNickname(true);
  };

  const handleSaveNickname = async () => {
    if (!newNickname.trim()) {
      Alert.alert('Ошибка', 'Никнейм не может быть пустым');
      return;
    }

    try {
      await updateSetupProfile({ nickname: newNickname.trim() });
      setIsEditingNickname(false);
      Alert.alert('Успешно', 'Никнейм обновлён');
    } catch {
      Alert.alert('Ошибка', 'Не удалось обновить никнейм');
    }
  };

  return (
    <GradientBackground>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: contentTopPadding }]}
          showsVerticalScrollIndicator={false}

        >
          <View style={styles.header}>
            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                <User size={40} color={theme.colors.primary} />
              </View>
              <View style={styles.nameContainer}>
                <Text style={styles.name}>{setupProfile?.nickname || user?.name || user?.email || profile.name}</Text>
                <TouchableOpacity 
                  style={styles.editButton}
                  onPress={handleEditNickname}
                  activeOpacity={0.7}
                >
                  <Edit3 size={18} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.memberSince}>
                Участник с {new Date(profile.joinedAt).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
              </Text>
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
                    <item.icon size={24} color={isPremiumItem && !isPremium ? '#FFD700' : (item as any).color || theme.colors.primary} />
                  </View>
                  <View style={styles.menuContent}>
                    <Text style={[
                      styles.menuTitle,
                      isPremiumItem && !isPremium && styles.premiumMenuTitle,
                      (item as any).color ? { color: (item as any).color } : {}
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
              <Text style={styles.logoutTitle}>В��йти из аккаунта</Text>
              <Text style={styles.menuSubtitle}>Завершить сеанс</Text>
            </View>
            <ChevronRight size={20} color={theme.colors.textLight} />
          </TouchableOpacity>

          {__DEV__ && (
            <TouchableOpacity
              style={styles.devEntry}
              onPress={() => router.push('/dev-subscription-tools')}
              activeOpacity={0.8}
              testID="dev-subscription-entry"
            >
              <Text style={styles.devEntryText}>Subscription QA Tools</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <Modal
          visible={isEditingNickname}
          transparent
          animationType="fade"
          onRequestClose={() => setIsEditingNickname(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Изменить никнейм</Text>
                <TouchableOpacity onPress={() => setIsEditingNickname(false)}>
                  <X size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
              
              <TextInput
                style={styles.nicknameInput}
                value={newNickname}
                onChangeText={setNewNickname}
                placeholder="Введите никнейм"
                placeholderTextColor={theme.colors.textLight}
                autoFocus
                maxLength={30}
              />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setIsEditingNickname(false)}
                >
                  <Text style={styles.cancelButtonText}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleSaveNickname}
                >
                  <Text style={styles.saveButtonText}>Сохранить</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
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
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  name: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  editButton: {
    padding: theme.spacing.xs,
    backgroundColor: theme.colors.primary + '20',
    borderRadius: theme.borderRadius.md,
  },
  memberSince: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
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
  devEntry: {
    marginTop: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.4)',
    backgroundColor: 'rgba(255,215,0,0.08)',
  },
  devEntryText: {
    color: '#FFD700',
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.large,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  nicknameInput: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  modalButton: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
  },
  saveButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.background,
  },
});