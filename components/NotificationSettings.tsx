import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Bell, Clock, Calendar, Target, Settings } from 'lucide-react-native';
import { useNotifications } from '@/hooks/use-notifications';
import { theme } from '@/constants/theme';

interface NotificationSettingsProps {
  onClose?: () => void;
}

export function NotificationSettings({ onClose }: NotificationSettingsProps) {
  const {
    permission,
    requestPermissions,
    scheduleDailyReminder,
    scheduleTaskReminder,
    cancelAllNotifications,
  } = useNotifications();

  const [settings, setSettings] = useState({
    dailyReminders: false,
    taskReminders: false,
    pomodoroNotifications: false,
    goalReminders: false,
  });

  const handlePermissionRequest = async () => {
    if (!permission.granted) {
      const granted = await requestPermissions();
      if (granted) {
        Alert.alert(
          'Уведомления включены',
          'Теперь вы будете получать полезные напоминания!'
        );
      } else {
        Alert.alert(
          'Разрешение не получено',
          'Чтобы получать уведомления, включ��те их в настройках устройства.'
        );
      }
    }
  };

  const handleSettingChange = async (key: keyof typeof settings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));

    if (!permission.granted && value) {
      await handlePermissionRequest();
      return;
    }

    if (value) {
      switch (key) {
        case 'dailyReminders':
          await scheduleDailyReminder(9, 0);
          Alert.alert('Настроено', 'Ежедневные напоминания включены на 9:00');
          break;
        case 'taskReminders':
          Alert.alert('Настроено', 'Напоминания о задачах придут за 30 минут до начала');
          break;
        case 'pomodoroNotifications':
          Alert.alert('Настроено', 'Уведомления помодоро включены');
          break;
        case 'goalReminders':
          Alert.alert('Настроено', 'Напоминания о целях включены');
          break;
      }
    }
  };

  const testNotification = async () => {
    if (!permission.granted) {
      await handlePermissionRequest();
      return;
    }

    await scheduleTaskReminder('Тестовое уведомление', 0.1); // 6 seconds
    Alert.alert('Тест отправлен', 'Уведомление придёт через несколько секунд');
  };

  const clearAllNotifications = async () => {
    await cancelAllNotifications();
    Alert.alert('Готово', 'Все запланированные уведомления отменены');
  };

  const getPermissionStatusText = () => {
    if (permission.granted) return 'Включены';
    if (permission.canAskAgain) return 'Не настроены';
    return 'Заблокированы';
  };

  const getPermissionStatusColor = () => {
    if (permission.granted) return theme.colors.success;
    if (permission.canAskAgain) return theme.colors.warning;
    return theme.colors.error;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Bell size={24} color={theme.colors.primary} />
        <Text style={styles.title}>Настройки уведомлений</Text>
      </View>

      {/* Статус разрешений */}
      <View style={styles.permissionCard}>
        <View style={styles.permissionHeader}>
          <Settings size={20} color={theme.colors.text} />
          <Text style={styles.permissionTitle}>Статус разрешений</Text>
        </View>
        <View style={styles.permissionStatus}>
          <Text style={styles.permissionText}>
            Уведомления: {' '}
            <Text style={[styles.statusText, { color: getPermissionStatusColor() }]}>
              {getPermissionStatusText()}
            </Text>
          </Text>
          {!permission.granted && (
            <TouchableOpacity
              style={styles.enableButton}
              onPress={handlePermissionRequest}
            >
              <Text style={styles.enableButtonText}>Включить</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Настройки уведомлений */}
      <View style={styles.settingsCard}>
        <Text style={styles.sectionTitle}>Типы уведомлений</Text>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Calendar size={20} color={theme.colors.primary} />
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Ежедневные напоминания</Text>
              <Text style={styles.settingDescription}>
                Напоминание о планировании дня (9:00)
              </Text>
            </View>
          </View>
          <Switch
            value={settings.dailyReminders}
            onValueChange={(value) => handleSettingChange('dailyReminders', value)}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={settings.dailyReminders ? theme.colors.background : theme.colors.textSecondary}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Clock size={20} color={theme.colors.primary} />
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Напоминания о задачах</Text>
              <Text style={styles.settingDescription}>
                За 30 минут до запланированного времени
              </Text>
            </View>
          </View>
          <Switch
            value={settings.taskReminders}
            onValueChange={(value) => handleSettingChange('taskReminders', value)}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={settings.taskReminders ? theme.colors.background : theme.colors.textSecondary}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Target size={20} color={theme.colors.primary} />
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Уведомления помодоро</Text>
              <Text style={styles.settingDescription}>
                Начало и конец рабочих сессий
              </Text>
            </View>
          </View>
          <Switch
            value={settings.pomodoroNotifications}
            onValueChange={(value) => handleSettingChange('pomodoroNotifications', value)}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={settings.pomodoroNotifications ? theme.colors.background : theme.colors.textSecondary}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Target size={20} color={theme.colors.primary} />
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Напоминания о целях</Text>
              <Text style={styles.settingDescription}>
                Мотивационные сообщения о прогрессе
              </Text>
            </View>
          </View>
          <Switch
            value={settings.goalReminders}
            onValueChange={(value) => handleSettingChange('goalReminders', value)}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={settings.goalReminders ? theme.colors.background : theme.colors.textSecondary}
          />
        </View>
      </View>

      {/* Действия */}
      <View style={styles.actionsCard}>
        <Text style={styles.sectionTitle}>Действия</Text>
        
        <TouchableOpacity style={styles.actionButton} onPress={testNotification}>
          <Bell size={18} color={theme.colors.primary} />
          <Text style={styles.actionButtonText}>Тестовое уведомление</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.dangerButton]} 
          onPress={clearAllNotifications}
        >
          <Settings size={18} color={theme.colors.error} />
          <Text style={[styles.actionButtonText, styles.dangerText]}>
            Отменить все уведомления
          </Text>
        </TouchableOpacity>
      </View>

      {onClose && (
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Закрыть</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  permissionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  permissionStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  permissionText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  statusText: {
    fontWeight: '600' as const,
  },
  enableButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  enableButtonText: {
    color: theme.colors.background,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  settingsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: theme.colors.text,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  actionsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dangerButton: {
    borderColor: theme.colors.error + '30',
    backgroundColor: theme.colors.error + '10',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: theme.colors.text,
  },
  dangerText: {
    color: theme.colors.error,
  },
  closeButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  closeButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: '600' as const,
  },
});