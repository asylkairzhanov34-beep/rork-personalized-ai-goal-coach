import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';

let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
} catch {
  console.log('[BackgroundInit] expo-notifications not available');
}

export function useAppBackgroundInit() {
  const isInitialized = useRef(false);

  const requestNotificationPermissions = useCallback(async () => {
    if (!Notifications || Platform.OS === 'web') {
      console.log('[BackgroundInit] Notifications not supported on this platform');
      return false;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log('[BackgroundInit] Current permission status:', existingStatus);
      
      if (existingStatus === 'granted') {
        console.log('[BackgroundInit] Notifications already granted');
        return true;
      }

      console.log('[BackgroundInit] Requesting notification permissions...');
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: true,
          allowCriticalAlerts: true,
          provideAppNotificationSettings: true,
          allowProvisional: false,
        },
        android: {},
      });

      console.log('[BackgroundInit] Permission request result:', status);
      return status === 'granted';
    } catch (error) {
      console.error('[BackgroundInit] Error requesting permissions:', error);
      return false;
    }
  }, []);

  const setupNotificationChannels = useCallback(async () => {
    if (!Notifications || Platform.OS !== 'android') {
      return;
    }

    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
      });

      await Notifications.setNotificationChannelAsync('timer', {
        name: 'Timer',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
      });

      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
      });

      console.log('[BackgroundInit] Android notification channels created');
    } catch (error) {
      console.error('[BackgroundInit] Error creating channels:', error);
    }
  }, []);

  const configureNotificationHandler = useCallback(() => {
    if (!Notifications) {
      return;
    }

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    console.log('[BackgroundInit] Notification handler configured');
  }, []);

  useEffect(() => {
    if (isInitialized.current) {
      return;
    }

    const initializeBackgroundServices = async () => {
      console.log('[BackgroundInit] Initializing background services...');
      
      configureNotificationHandler();
      
      const permissionGranted = await requestNotificationPermissions();
      console.log('[BackgroundInit] Notifications permission granted:', permissionGranted);
      
      await setupNotificationChannels();
      
      isInitialized.current = true;
      console.log('[BackgroundInit] Background services initialized successfully');
    };

    initializeBackgroundServices();
  }, [requestNotificationPermissions, setupNotificationChannels, configureNotificationHandler]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isInitialized.current) {
        console.log('[BackgroundInit] App became active, checking permissions...');
        requestNotificationPermissions();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [requestNotificationPermissions]);

  return {
    requestNotificationPermissions,
  };
}
