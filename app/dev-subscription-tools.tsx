import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { 
  Trash2, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  User, 
  Settings,
  CreditCard,
  CloudOff,
  Server,
  RotateCcw,
  Shield,
} from 'lucide-react-native';
import { useSubscription } from '@/hooks/use-subscription-store';
import { useAuth } from '@/hooks/use-auth-store';
import { useSubscriptionStatus } from '@/hooks/use-subscription-status';

const STORAGE_KEYS = [
  'hasSeenPaywall',
  'trialStartedAt',
  'trialStartISO',
  'hasSeenSubscriptionOffer',
  '@subscription_status',
  '@first_launch',
  'auth_user',
  'auth_sessions',
  'current_session',
  'registered_users',
  'firstTimeSetup',
  'subscription_state',
];

const SECURE_STORE_KEYS = [
  'trialStartAt',
  'hasSeenPaywall',
  'subscriptionActive',
];

export default function DevSubscriptionTools() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [storageValues, setStorageValues] = useState<Record<string, string | null>>({});
  const { 
    status, 
    cancelSubscriptionForDev,
    forceRefreshFromServer,
    fullResetForTesting,
    restorePurchases,
    customerInfo,
  } = useSubscription();
  const { user, logout } = useAuth();
  const { 
    isPremium,
    isTrialActive,
    isTrialExpired,
    trialExpiresAt,
    refreshStatus,
  } = useSubscriptionStatus();

  const loadStorageValues = useCallback(async () => {
    const values: Record<string, string | null> = {};
    
    for (const key of STORAGE_KEYS) {
      try {
        values[key] = await AsyncStorage.getItem(key);
      } catch {
        values[key] = null;
      }
    }
    
    if (Platform.OS !== 'web') {
      for (const key of SECURE_STORE_KEYS) {
        try {
          values[`[Secure] ${key}`] = await SecureStore.getItemAsync(key);
        } catch {
          values[`[Secure] ${key}`] = null;
        }
      }
    }
    
    setStorageValues(values);
  }, []);

  useEffect(() => {
    loadStorageValues();
  }, [loadStorageValues]);

  const resetLocalCache = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await cancelSubscriptionForDev();
      await refreshStatus();
      await loadStorageValues();
      Alert.alert('✅ Успех', 'Локальный кеш подписки сброшен. Статус теперь определяется сервером.');
    } catch (error) {
      Alert.alert('Ошибка', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, cancelSubscriptionForDev, refreshStatus, loadStorageValues]);

  const forceServerSync = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const result = await forceRefreshFromServer();
      await loadStorageValues();
      if (result) {
        Alert.alert('✅ Успех', `Синхронизация с сервером завершена.\nСтатус: ${status}`);
      } else {
        Alert.alert('⚠️ Внимание', 'Не удалось получить данные с сервера. Возможно, RevenueCat недоступен.');
      }
    } catch (error) {
      Alert.alert('Ошибка', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, forceRefreshFromServer, loadStorageValues, status]);

  const performFullReset = useCallback(async () => {
    Alert.alert(
      '⚠️ Полный сброс',
      'Это сбросит ВСЕ данные подписки локально и синхронизирует с сервером. Продолжить?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Сбросить',
          style: 'destructive',
          onPress: async () => {
            setIsProcessing(true);
            try {
              await fullResetForTesting();
              await loadStorageValues();
              Alert.alert('✅ Успех', 'Полный сброс завершен. Приложение как при первом запуске.');
            } catch (error) {
              Alert.alert('Ошибка', error instanceof Error ? error.message : 'Unknown error');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  }, [fullResetForTesting, loadStorageValues]);

  const performRestorePurchases = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const result = await restorePurchases();
      await loadStorageValues();
      if (result) {
        Alert.alert('✅ Успех', 'Покупки восстановлены! Премиум активен.');
      } else {
        Alert.alert('ℹ️ Информация', 'Активных покупок не найдено.');
      }
    } catch (error) {
      Alert.alert('Ошибка', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, restorePurchases, loadStorageValues]);

  const forceExpireTrial = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const expiredTime = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      await AsyncStorage.setItem('trialStartedAt', expiredTime);
      await AsyncStorage.setItem('trialStartISO', expiredTime);
      if (Platform.OS !== 'web') {
        await SecureStore.setItemAsync('trialStartAt', expiredTime);
      }
      await refreshStatus();
      await loadStorageValues();
      Alert.alert('✅ Успех', 'Trial принудительно истёк.');
    } catch (error) {
      Alert.alert('Ошибка', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, refreshStatus, loadStorageValues]);

  const clearAllData = useCallback(async () => {
    Alert.alert(
      '⚠️ Предупреждение',
      'Это удалит ВСЕ данные приложения включая авторизацию. Уверены?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить всё',
          style: 'destructive',
          onPress: async () => {
            setIsProcessing(true);
            try {
              await AsyncStorage.clear();
              if (Platform.OS !== 'web') {
                for (const key of SECURE_STORE_KEYS) {
                  try {
                    await SecureStore.deleteItemAsync(key);
                  } catch {}
                }
              }
              await logout();
              Alert.alert('✅ Успех', 'Все данные удалены.');
              router.replace('/');
            } catch (error) {
              Alert.alert('Ошибка', error instanceof Error ? error.message : 'Unknown error');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  }, [logout, router]);

  const toggleKey = (key: string) => {
    setSelectedKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const activeEntitlements = customerInfo?.entitlements?.active 
    ? Object.keys(customerInfo.entitlements.active) 
    : [];

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Инструменты подписки',
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#FFD700',
        }} 
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>🛠 Тестирование подписки</Text>
            <Text style={styles.subtitle}>Доступно в TestFlight и Dev</Text>
          </View>

          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Текущий статус</Text>
            <View style={styles.statusGrid}>
              <View style={styles.statusItem}>
                <User size={16} color="#888" />
                <Text style={styles.statusLabel}>Пользователь:</Text>
                <Text style={styles.statusValue} numberOfLines={1}>
                  {user?.email || 'Не авторизован'}
                </Text>
              </View>
              <View style={styles.statusItem}>
                <Shield size={16} color="#888" />
                <Text style={styles.statusLabel}>Статус:</Text>
                <Text style={[styles.statusValue, status === 'premium' && styles.premiumText]}>
                  {status === 'premium' ? 'Premium' : status === 'trial' ? 'Trial' : 'Free'}
                </Text>
              </View>
              <View style={styles.statusItem}>
                <CreditCard size={16} color="#888" />
                <Text style={styles.statusLabel}>Premium:</Text>
                <Text style={[styles.statusValue, isPremium && styles.premiumText]}>
                  {isPremium ? 'Активен' : 'Неактивен'}
                </Text>
              </View>
              <View style={styles.statusItem}>
                <Clock size={16} color="#888" />
                <Text style={styles.statusLabel}>Trial:</Text>
                <Text style={styles.statusValue}>
                  {isTrialActive ? 'Активен' : isTrialExpired ? 'Истёк' : 'Не начат'}
                </Text>
              </View>
              {trialExpiresAt && (
                <View style={styles.statusItem}>
                  <Settings size={16} color="#888" />
                  <Text style={styles.statusLabel}>Истекает:</Text>
                  <Text style={styles.statusValue} numberOfLines={1}>
                    {new Date(trialExpiresAt).toLocaleString('ru-RU')}
                  </Text>
                </View>
              )}
              {activeEntitlements.length > 0 && (
                <View style={styles.statusItem}>
                  <CheckCircle size={16} color="#4CAF50" />
                  <Text style={styles.statusLabel}>Entitlements:</Text>
                  <Text style={[styles.statusValue, styles.premiumText]}>
                    {activeEntitlements.join(', ')}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔄 Синхронизация с сервером</Text>
            <Text style={styles.sectionSubtitle}>
              Используйте эти кнопки для синхронизации с RevenueCat
            </Text>
            
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
              onPress={forceServerSync}
              disabled={isProcessing}
            >
              <Server size={20} color="#FFF" />
              <Text style={styles.actionButtonText}>Синхронизировать с сервером</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
              onPress={performRestorePurchases}
              disabled={isProcessing}
            >
              <RefreshCw size={20} color="#FFF" />
              <Text style={styles.actionButtonText}>Восстановить покупки</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🧪 Тестовые действия</Text>
            
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#FF9800' }]}
              onPress={resetLocalCache}
              disabled={isProcessing}
            >
              <CloudOff size={20} color="#FFF" />
              <Text style={styles.actionButtonText}>Сбросить локальный кеш подписки</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#E91E63' }]}
              onPress={forceExpireTrial}
              disabled={isProcessing}
            >
              <XCircle size={20} color="#FFF" />
              <Text style={styles.actionButtonText}>Принудительно завершить Trial</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#9C27B0' }]}
              onPress={performFullReset}
              disabled={isProcessing}
            >
              <RotateCcw size={20} color="#FFF" />
              <Text style={styles.actionButtonText}>Полный сброс (как первый запуск)</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📦 Хранилище</Text>
            <Text style={styles.sectionSubtitle}>Текущие значения в хранилище</Text>
            
            {Object.entries(storageValues).map(([key, value]) => (
              <TouchableOpacity
                key={key}
                style={styles.storageKeyRow}
                onPress={() => toggleKey(key)}
                activeOpacity={0.7}
              >
                <View style={styles.checkbox}>
                  {selectedKeys.includes(key) && <CheckCircle size={16} color="#FFD700" />}
                </View>
                <View style={styles.storageKeyInfo}>
                  <Text style={styles.storageKeyText}>{key}</Text>
                  <Text style={styles.storageValueText} numberOfLines={1}>
                    {value ?? '(null)'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={loadStorageValues}
            >
              <RefreshCw size={16} color="#FFD700" />
              <Text style={styles.refreshButtonText}>Обновить значения</Text>
            </TouchableOpacity>

            {selectedKeys.length > 0 && (
              <TouchableOpacity
                style={styles.clearSelectedButton}
                onPress={async () => {
                  setIsProcessing(true);
                  try {
                    const asyncKeys = selectedKeys.filter(k => !k.startsWith('[Secure]'));
                    const secureKeys = selectedKeys
                      .filter(k => k.startsWith('[Secure]'))
                      .map(k => k.replace('[Secure] ', ''));
                    
                    if (asyncKeys.length > 0) {
                      await AsyncStorage.multiRemove(asyncKeys);
                    }
                    
                    if (Platform.OS !== 'web' && secureKeys.length > 0) {
                      for (const key of secureKeys) {
                        await SecureStore.deleteItemAsync(key);
                      }
                    }
                    
                    Alert.alert('✅ Успех', `Удалено ${selectedKeys.length} ключей`);
                    setSelectedKeys([]);
                    await loadStorageValues();
                    await refreshStatus();
                  } catch {
                    Alert.alert('Ошибка', 'Не удалось удалить ключи');
                  } finally {
                    setIsProcessing(false);
                  }
                }}
              >
                <Trash2 size={18} color="#FF6B6B" />
                <Text style={styles.clearSelectedText}>
                  Удалить {selectedKeys.length} выбранных
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.dangerZone}>
            <Text style={styles.dangerTitle}>⚠️ Опасная зона</Text>
            <TouchableOpacity
              style={styles.dangerButton}
              onPress={clearAllData}
              disabled={isProcessing}
            >
              <Trash2 size={20} color="#FFF" />
              <Text style={styles.dangerButtonText}>Удалить ВСЕ данные приложения</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>ℹ️ Информация</Text>
            <Text style={styles.infoText}>
              • Синхронизировать с сервером - получает актуальный статус из RevenueCat{'\n'}
              • Сбросить локальный кеш - удаляет локальные данные, но не отменяет подписку{'\n'}
              • Полный сброс - сбрасывает всё и синхронизирует с сервером{'\n'}
              • Для тестирования Sandbox подписок используйте тестовый Apple ID
            </Text>
          </View>

          {isProcessing && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#FFD700" />
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  header: {
    paddingVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  statusCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.15)',
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFD700',
    marginBottom: 16,
  },
  statusGrid: {
    gap: 12,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    flex: 1,
  },
  premiumText: {
    color: '#FFD700',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 12,
  },
  actionButton: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  storageKeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    marginBottom: 6,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,215,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  storageKeyInfo: {
    flex: 1,
  },
  storageKeyText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  storageValueText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    marginTop: 8,
  },
  refreshButtonText: {
    fontSize: 14,
    color: '#FFD700',
    fontWeight: '500',
  },
  clearSelectedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.4)',
  },
  clearSelectedText: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  dangerZone: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,107,107,0.2)',
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
    marginBottom: 12,
  },
  dangerButton: {
    backgroundColor: '#FF4444',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dangerButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  infoBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.3)',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 18,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});