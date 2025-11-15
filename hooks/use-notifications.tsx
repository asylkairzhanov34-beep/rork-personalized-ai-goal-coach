import { useState, useEffect, useRef } from 'react';
import { Platform, Alert } from 'react-native';

// Mock notification types for when expo-notifications is not available
type MockPermissionStatus = 'granted' | 'denied' | 'undetermined';

interface MockNotification {
  request: {
    identifier: string;
    content: {
      title: string;
      body: string;
      data: any;
    };
  };
}

// Check if expo-notifications is available
let Notifications: any = null;
let Device: any = null;
let Constants: any = null;

try {
  Notifications = require('expo-notifications');
  Device = require('expo-device');
  Constants = require('expo-constants');
  
  // Настройка поведения уведомлений только если модуль доступен
  if (Notifications) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
} catch (error) {
  console.log('expo-notifications not available, using mock implementation');
}

export interface NotificationPermission {
  granted: boolean;
  canAskAgain: boolean;
  status: MockPermissionStatus;
}

export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string>('');
  const [permission, setPermission] = useState<NotificationPermission>({
    granted: false,
    canAskAgain: true,
    status: 'undetermined' as MockPermissionStatus,
  });
  const [notification, setNotification] = useState<MockNotification | null>(null);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    if (Notifications) {
      registerForPushNotificationsAsync().then(token => {
        if (token) {
          setExpoPushToken(token);
        }
      });

      // Слушатель входящих уведомлений
      notificationListener.current = Notifications.addNotificationReceivedListener((notification: any) => {
        if (notification) {
          setNotification(notification);
        }
      });

      // Слушатель ответов на уведомления
      responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
        if (response) {
          console.log('Notification response:', response);
        }
      });

      return () => {
        if (notificationListener.current) {
          Notifications.removeNotificationSubscription(notificationListener.current);
        }
        if (responseListener.current) {
          Notifications.removeNotificationSubscription(responseListener.current);
        }
      };
    }
  }, []);

  const registerForPushNotificationsAsync = async (): Promise<string | null> => {
    if (!Notifications || !Device) {
      console.log('Notifications not available');
      return null;
    }

    let token = null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      setPermission({
        granted: finalStatus === 'granted',
        canAskAgain: finalStatus !== 'denied',
        status: finalStatus as MockPermissionStatus,
      });
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }
      
      try {
        const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        if (!projectId) {
          throw new Error('Project ID not found');
        }
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        console.log('Push token:', token);
      } catch (e) {
        console.log('Error getting push token:', e);
        token = null;
      }
    } else {
      console.log('Must use physical device for Push Notifications');
    }

    return token;
  };

  const requestPermissions = async (): Promise<boolean> => {
    if (!Notifications) {
      Alert.alert(
        'Уведомления недоступны',
        'Функция уведомлений не поддерживается в текущей среде.'
      );
      return false;
    }

    const { status } = await Notifications.requestPermissionsAsync();
    const granted = status === 'granted';
    
    setPermission({
      granted,
      canAskAgain: status !== 'denied',
      status: status as MockPermissionStatus,
    });
    
    return granted;
  };

  const scheduleNotification = async ({
    title,
    body,
    data = {},
    trigger,
    sound = 'default',
  }: {
    title: string;
    body: string;
    data?: Record<string, any>;
    trigger?: any;
    sound?: 'default' | 'bell' | 'chime' | 'ding';
  }) => {
    if (!Notifications) {
      console.log('Notifications not available, showing alert instead');
      Alert.alert(title, body);
      return 'mock-id-' + Date.now();
    }

    if (!permission.granted) {
      console.log('Notifications not permitted');
      return null;
    }

    // Map sound names to system sounds or custom sounds
    let notificationSound: string | boolean = 'default';
    switch (sound) {
      case 'default':
        notificationSound = 'default';
        break;
      case 'bell':
        // Use system bell sound or custom sound
        notificationSound = Platform.OS === 'ios' ? 'bell.caf' : 'default';
        break;
      case 'chime':
        // Use system chime sound
        notificationSound = Platform.OS === 'ios' ? 'chime.caf' : 'default';
        break;
      case 'ding':
        // Use system ding sound
        notificationSound = Platform.OS === 'ios' ? 'ding.caf' : 'default';
        break;
      default:
        notificationSound = 'default';
    }

    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: notificationSound,
        },
        trigger: trigger || null, // null = немедленно
      });
      
      console.log('Notification scheduled with sound:', notificationSound, 'ID:', id);
      return id;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  };

  const cancelNotification = async (notificationId: string) => {
    if (!Notifications) {
      console.log('Notifications not available, mock cancel:', notificationId);
      return;
    }

    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('Notification cancelled:', notificationId);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  };

  const cancelAllNotifications = async () => {
    if (!Notifications) {
      console.log('Notifications not available, mock cancel all');
      return;
    }

    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All notifications cancelled');
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  };

  // Вспомогательные функции для планирования уведомлений
  const scheduleTaskReminder = async (taskTitle: string, minutes: number = 30) => {
    return await scheduleNotification({
      title: 'Напоминание о задаче',
      body: `Время выполнить: ${taskTitle}`,
      data: { type: 'task_reminder', taskTitle },
      trigger: {
        seconds: minutes * 60,
      },
    });
  };

  const schedulePomodoroBreak = async (isLongBreak: boolean = false) => {
    const breakType = isLongBreak ? 'длинный' : 'короткий';
    return await scheduleNotification({
      title: 'Время перерыва!',
      body: `Возьмите ${breakType} перерыв. Вы отлично поработали!`,
      data: { type: 'pomodoro_break', isLongBreak },
    });
  };

  const scheduleWorkSession = async () => {
    return await scheduleNotification({
      title: 'Время работать!',
      body: 'Перерыв закончился. Пора приступить к следующей задаче.',
      data: { type: 'work_session' },
    });
  };

  const scheduleDailyReminder = async (hour: number = 9, minute: number = 0) => {
    return await scheduleNotification({
      title: 'Доброе утро!',
      body: 'Время планировать свой день и достигать целей!',
      data: { type: 'daily_reminder' },
      trigger: {
        hour,
        minute,
        repeats: true,
      },

    });
  };

  return {
    expoPushToken,
    permission,
    notification,
    requestPermissions,
    scheduleNotification,
    cancelNotification,
    cancelAllNotifications,
    // Специализированные функции
    scheduleTaskReminder,
    schedulePomodoroBreak,
    scheduleWorkSession,
    scheduleDailyReminder,
  };
}