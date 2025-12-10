import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Switch,
  Alert,
  Linking,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { 
  ChevronLeft,
  Bell,
  Volume2,
  Vibrate,
  Shield,
  FileText,
  HelpCircle,
  Star,
  Mail,
  ChevronRight,
  Clock,
  Target,
  RefreshCw,
  LogOut,
  Trash2
} from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { GradientBackground } from '@/components/GradientBackground';
import { useFirstTimeSetup } from '@/hooks/use-first-time-setup';
import { useGoalStore } from '@/hooks/use-goal-store';
import { useAuth } from '@/hooks/use-auth-store';

interface SettingItemProps {
  icon: React.ComponentType<any>;
  title: string;
  subtitle?: string;
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  onPress?: () => void;
  showArrow?: boolean;
  iconColor?: string;
}

function SettingItem({ 
  icon: Icon, 
  title, 
  subtitle, 
  value, 
  onValueChange, 
  onPress,
  showArrow,
  iconColor
}: SettingItemProps) {
  const isToggle = value !== undefined && onValueChange !== undefined;

  return (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      activeOpacity={isToggle ? 1 : 0.7}
      disabled={isToggle && !onPress}
    >
      <View style={[styles.settingIcon, iconColor && { backgroundColor: iconColor + '20' }]}>
        <Icon size={22} color={iconColor || theme.colors.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {isToggle && (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ 
            false: theme.colors.border, 
            true: theme.colors.primary + '60' 
          }}
          thumbColor={value ? theme.colors.primary : theme.colors.textLight}
          ios_backgroundColor={theme.colors.border}
        />
      )}
      {showArrow && (
        <ChevronRight size={20} color={theme.colors.textLight} />
      )}
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { updateProfile } = useFirstTimeSetup();
  const store = useGoalStore();
  const { deleteAccount, logout, user } = useAuth();
  
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [autoStartTimer, setAutoStartTimer] = useState(false);
  const [dailyReminder, setDailyReminder] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(true);

  const handleBack = () => {
    router.back();
  };

  const handleOpenNotifications = () => {
    router.push('/notifications');
  };

  const handleResetOnboarding = () => {
    Alert.alert(
      'Сбросить настройку',
      'Вы уверены, что хотите пройти настройку заново? Ваши данные сохранятся.',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Сбросить', 
          onPress: async () => {
            try {
              await updateProfile({ isCompleted: false });
              router.replace('/first-time-setup');
            } catch {
              Alert.alert('Ошибка', 'Не удалось сбросить настройку');
            }
          }
        },
      ]
    );
  };

  const handleResetGoal = () => {
    if (!store?.currentGoal) {
      Alert.alert('Нет цели', 'У вас нет активной цели для сброса');
      return;
    }

    Alert.alert(
      'Сбросить цель',
      'Вы уверены, что хотите сбросить текущую цель? Весь прогресс будет удален.',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Сбросить', 
          style: 'destructive',
          onPress: async () => {
            try {
              await store.resetGoal();
              Alert.alert('Готово', 'Цель успешно сброшена');
            } catch {
              Alert.alert('Ошибка', 'Не удалось сбросить цель');
            }
          }
        },
      ]
    );
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:goalforge.dev1@gmail.com?subject=Поддержка GoalCoach');
  };

  const handleRateApp = () => {
    const storeUrl = Platform.select({
      ios: 'https://apps.apple.com/app/goalcoach/id123456789',
      android: 'https://play.google.com/store/apps/details?id=com.goalcoach.app',
      default: 'https://goalcoach.app'
    });
    
    Alert.alert(
      'Оценить приложение',
      'Ваш отзыв поможет нам стать лучше!',
      [
        { text: 'Позже', style: 'cancel' },
        { 
          text: 'Оценить', 
          onPress: () => Linking.openURL(storeUrl)
        },
      ]
    );
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://goalcoach.app/privacy');
  };

  const handleTermsOfService = () => {
    Linking.openURL('https://www.notion.so/Terms-of-Use-2c54e106d5d080f1b7bdce1028935488');
  };

  const handleLogout = () => {
    Alert.alert(
      'Выйти из аккаунта',
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

  const handleDeleteAccount = () => {
    Alert.alert(
      'Удалить аккаунт',
      'Это действие необратимо! Все ваши данные, включая прогресс, цели и подписку будут удалены навсегда.',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Удалить', 
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Подтверждение',
              'Вы точно хотите удалить аккаунт? Это действие нельзя отменить.',
              [
                { text: 'Нет, оставить', style: 'cancel' },
                { 
                  text: 'Да, удалить',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const success = await deleteAccount();
                      if (success) {
                        Alert.alert('Готово', 'Аккаунт удалён', [
                          { text: 'OK', onPress: () => router.replace('/auth') }
                        ]);
                      } else {
                        Alert.alert('Ошибка', 'Не удалось удалить аккаунт. Попробуйте позже.');
                      }
                    } catch (error) {
                      const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
                      Alert.alert('Ошибка', message);
                    }
                  }
                },
              ]
            );
          }
        },
      ]
    );
  };

  return (
    <GradientBackground>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <ChevronLeft size={28} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Настройки</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <SectionHeader title="Звук и уведомления" />
          <View style={styles.section}>
            <SettingItem
              icon={Volume2}
              title="Звуковые эффекты"
              subtitle="Звуки в таймере и приложении"
              value={soundEnabled}
              onValueChange={setSoundEnabled}
            />
            <SettingItem
              icon={Vibrate}
              title="Вибрация"
              subtitle="Тактильная обратная связь"
              value={vibrationEnabled}
              onValueChange={setVibrationEnabled}
            />
            <SettingItem
              icon={Bell}
              title="Уведомления"
              subtitle="Настройка напоминаний"
              onPress={handleOpenNotifications}
              showArrow
            />
          </View>

          <SectionHeader title="Таймер" />
          <View style={styles.section}>
            <SettingItem
              icon={Clock}
              title="Автозапуск"
              subtitle="Автоматически начинать следующую сессию"
              value={autoStartTimer}
              onValueChange={setAutoStartTimer}
            />
            <SettingItem
              icon={Bell}
              title="Ежедневное напоминание"
              subtitle="Напоминать о фокус-сессиях"
              value={dailyReminder}
              onValueChange={setDailyReminder}
            />
          </View>

          <SectionHeader title="Отчёты" />
          <View style={styles.section}>
            <SettingItem
              icon={FileText}
              title="Еженедельный отчёт"
              subtitle="Получать сводку каждую неделю"
              value={weeklyReport}
              onValueChange={setWeeklyReport}
            />
          </View>

          <SectionHeader title="Данные" />
          <View style={styles.section}>
            <SettingItem
              icon={RefreshCw}
              title="Пройти настройку заново"
              subtitle="Обновить профиль и биоритм"
              onPress={handleResetOnboarding}
              showArrow
              iconColor="#3B82F6"
            />
            {store?.currentGoal && (
              <SettingItem
                icon={Target}
                title="Сбросить цель"
                subtitle="Удалить текущую цель и прогресс"
                onPress={handleResetGoal}
                showArrow
                iconColor="#EF4444"
              />
            )}
          </View>

          <SectionHeader title="Помощь и поддержка" />
          <View style={styles.section}>
            <SettingItem
              icon={Mail}
              title="Связаться с поддержкой"
              subtitle="Задать вопрос или сообщить о проблеме"
              onPress={handleContactSupport}
              showArrow
              iconColor="#10B981"
            />
            <SettingItem
              icon={Star}
              title="Оценить приложение"
              subtitle="Поделитесь мнением в магазине"
              onPress={handleRateApp}
              showArrow
              iconColor="#F59E0B"
            />
            <SettingItem
              icon={HelpCircle}
              title="FAQ"
              subtitle="Часто задаваемые вопросы"
              onPress={() => Alert.alert('FAQ', 'Раздел будет доступен в ближайшее время')}
              showArrow
              iconColor="#8B5CF6"
            />
          </View>

          {user && (
            <>
              <SectionHeader title="Аккаунт" />
              <View style={styles.section}>
                <SettingItem
                  icon={LogOut}
                  title="Выйти из аккаунта"
                  subtitle={user.email}
                  onPress={handleLogout}
                  showArrow
                  iconColor="#F59E0B"
                />
                <SettingItem
                  icon={Trash2}
                  title="Удалить аккаунт"
                  subtitle="Удалить все данные навсегда"
                  onPress={handleDeleteAccount}
                  showArrow
                  iconColor="#EF4444"
                />
              </View>
            </>
          )}

          <SectionHeader title="Юридическая информация" />
          <View style={styles.section}>
            <SettingItem
              icon={Shield}
              title="Политика конфиденциальности"
              onPress={handlePrivacyPolicy}
              showArrow
              iconColor="#6366F1"
            />
            <SettingItem
              icon={FileText}
              title="Условия использования"
              onPress={handleTermsOfService}
              showArrow
              iconColor="#6366F1"
            />
          </View>

          <View style={styles.appInfo}>
            <Text style={styles.appName}>GoalCoach AI</Text>
            <Text style={styles.appVersion}>Версия 1.0.0</Text>
            <Text style={styles.appCopyright}>© 2024 GoalCoach. Все права защищены.</Text>
          </View>
        </ScrollView>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  headerSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 100,
  },
  sectionHeader: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.medium,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
  },
  settingSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  appInfo: {
    alignItems: 'center',
    marginTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.xl,
  },
  appName: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  appVersion: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  appCopyright: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textLight,
  },
});