import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  Trash2, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  User, 
  Settings,
  CreditCard 
} from 'lucide-react-native';
import { useSubscription } from '@/hooks/use-subscription-store';
import { useAuth } from '@/hooks/use-auth-store';
import { useSubscriptionStatus } from '@/hooks/use-subscription-status';

const STORAGE_KEYS = [
  'hasSeenPaywall',
  'trialStartedAt',
  'isPremium',
  'auth_user',
  'auth_sessions',
  'current_session',
  'registered_users',
  'firstTimeSetup',
  'subscription_state',
];

export default function DevSubscriptionTools() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const { status, checkSubscriptionStatus, cancelSubscriptionForDev } = useSubscription();
  const { user, logout } = useAuth();
  const { 
    isPremium,
    isTrialActive,
    isTrialExpired,
    trialExpiresAt,
    startTrial,
    refreshStatus,
  } = useSubscriptionStatus();

  const resetTrialData = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await AsyncStorage.multiRemove(['trialStartedAt', 'hasSeenPaywall']);
      await refreshStatus();
      Alert.alert('✅ Success', 'Trial data reset. Restart app to see first launch flow.');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, refreshStatus]);

  const forceExpireTrial = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const expiredTime = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      await AsyncStorage.setItem('trialStartedAt', expiredTime);
      await refreshStatus();
      Alert.alert('✅ Success', 'Trial forcefully expired. Restart app to see blocking modal.');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, refreshStatus]);

  const simulatePurchase = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await AsyncStorage.setItem('isPremium', 'true');
      router.push({
        pathname: '/subscription-success',
        params: {
          planName: 'Premium (Simulated)',
          trialStatus: 'Active',
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }
      });
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, router]);

  const cancelSubscription = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await cancelSubscriptionForDev();
      await refreshStatus();
      Alert.alert('✅ Success', 'Subscription cancelled (test mode).');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, cancelSubscriptionForDev, refreshStatus]);

  const clearAllData = useCallback(async () => {
    Alert.alert(
      '⚠️ Warning',
      'This will clear ALL app data including auth. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setIsProcessing(true);
            try {
              await AsyncStorage.multiRemove(STORAGE_KEYS);
              await AsyncStorage.clear(); // Clear everything
              await logout();
              Alert.alert('✅ Success', 'All data cleared. App will restart.');
              router.replace('/');
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
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

  if (!__DEV__) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.notAvailable}>
          <Text style={styles.notAvailableText}>
            Developer tools are only available in development builds
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>🛠 Developer Tools</Text>
          <Text style={styles.subtitle}>Test subscription flows</Text>
        </View>

        {/* Current Status */}
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Current Status</Text>
          <View style={styles.statusGrid}>
            <View style={styles.statusItem}>
              <User size={16} color="#888" />
              <Text style={styles.statusLabel}>User:</Text>
              <Text style={styles.statusValue} numberOfLines={1}>
                {user?.email || 'Not logged in'}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <CreditCard size={16} color="#888" />
              <Text style={styles.statusLabel}>Premium:</Text>
              <Text style={[styles.statusValue, isPremium && styles.premiumText]}>
                {isPremium ? 'Active' : 'Inactive'}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <Clock size={16} color="#888" />
              <Text style={styles.statusLabel}>Trial:</Text>
              <Text style={styles.statusValue}>
                {isTrialActive ? 'Active' : isTrialExpired ? 'Expired' : 'Not started'}
              </Text>
            </View>
            {trialExpiresAt && (
              <View style={styles.statusItem}>
                <Settings size={16} color="#888" />
                <Text style={styles.statusLabel}>Expires:</Text>
                <Text style={styles.statusValue} numberOfLines={1}>
                  {new Date(trialExpiresAt).toLocaleString()}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#4A90E2' }]}
            onPress={resetTrialData}
            disabled={isProcessing}
          >
            <RefreshCw size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>Reset All Subscription Data</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#E25B45' }]}
            onPress={forceExpireTrial}
            disabled={isProcessing}
          >
            <XCircle size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>Force Expire Trial</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#5CB85C' }]}
            onPress={simulatePurchase}
            disabled={isProcessing}
          >
            <CheckCircle size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>Simulate Purchase Success</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#9B59B6' }]}
            onPress={cancelSubscription}
            disabled={isProcessing}
          >
            <CreditCard size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>Cancel Subscription (TEST ONLY)</Text>
          </TouchableOpacity>
        </View>

        {/* Storage Keys */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Storage Keys</Text>
          <Text style={styles.sectionSubtitle}>Select keys to inspect/clear</Text>
          {STORAGE_KEYS.map(key => (
            <TouchableOpacity
              key={key}
              style={styles.storageKeyRow}
              onPress={() => toggleKey(key)}
              activeOpacity={0.7}
            >
              <View style={styles.checkbox}>
                {selectedKeys.includes(key) && <CheckCircle size={16} color="#FFD700" />}
              </View>
              <Text style={styles.storageKeyText}>{key}</Text>
            </TouchableOpacity>
          ))}
          
          {selectedKeys.length > 0 && (
            <TouchableOpacity
              style={styles.clearSelectedButton}
              onPress={async () => {
                setIsProcessing(true);
                try {
                  await AsyncStorage.multiRemove(selectedKeys);
                  Alert.alert('✅ Success', `Cleared ${selectedKeys.length} keys`);
                  setSelectedKeys([]);
                  await refreshStatus();
                } catch (error) {
                  Alert.alert('Error', 'Failed to clear keys');
                } finally {
                  setIsProcessing(false);
                }
              }}
            >
              <Trash2 size={18} color="#FF6B6B" />
              <Text style={styles.clearSelectedText}>
                Clear {selectedKeys.length} selected keys
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Danger Zone */}
        <View style={styles.dangerZone}>
          <Text style={styles.dangerTitle}>⚠️ Danger Zone</Text>
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={clearAllData}
            disabled={isProcessing}
          >
            <Trash2 size={20} color="#FFF" />
            <Text style={styles.dangerButtonText}>Clear ALL App Data</Text>
          </TouchableOpacity>
        </View>

        {isProcessing && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FFD700" />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
    paddingVertical: 12,
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
  storageKeyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    flex: 1,
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
  notAvailable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  notAvailableText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFD700',
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
});