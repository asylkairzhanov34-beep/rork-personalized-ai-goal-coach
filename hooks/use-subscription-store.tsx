import { useState, useEffect, useCallback, useMemo } from 'react';
import { Platform, Alert } from 'react-native';
import type { PurchasesPackage, CustomerInfo as RCCustomerInfo } from 'react-native-purchases';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { CustomerInfo, SubscriptionPackage, SubscriptionStatus } from '@/types/subscription';

type PurchasesModule = any;

type StoredSubscription = {
  packageId: string;
  identifier: string;
  purchaseDate: string;
  expiryDate?: string;
};

const TRIAL_DURATION_DAYS = 1;
const TRIAL_START_KEY = 'trialStartAt';
const PAYWALL_SEEN_KEY = 'hasSeenPaywall';
const SUBSCRIPTION_STORAGE_KEY = '@subscription_status';

// RevenueCat Keys
const REVENUECAT_API_KEY = {
  ios: 'appl_NIzzmGwASbGFsnfAddnshynSnsG',
  android: 'goog_placeholder_key', // Add Android key if available
  web: '',
};

const WEB_MOCK_PACKAGES: SubscriptionPackage[] = [
  {
    identifier: '$rc_monthly',
    product: {
      identifier: 'premium_monthly',
      title: 'Месячная подписка',
      description: 'Premium доступ на 1 месяц',
      price: 9.99,
      priceString: '$9.99',
      currencyCode: 'USD',
    },
  },
  {
    identifier: '$rc_annual',
    product: {
      identifier: 'premium_yearly',
      title: 'Годовая подписка',
      description: 'Premium доступ на 12 месяцев (экономия $40.88)',
      price: 79,
      priceString: '$79.00',
      currencyCode: 'USD',
    },
  },
];

const YEAR_IDENTIFIERS = ['year', 'yearly', 'annual', '$rc_annual'];

const isYearlyIdentifier = (identifier: string) =>
  YEAR_IDENTIFIERS.some(token => identifier.toLowerCase().includes(token));

const buildCustomerInfoFromMock = (packageId: string): CustomerInfo => ({
  activeSubscriptions: [packageId],
  allPurchasedProductIdentifiers: [packageId],
  entitlements: {
    active: {
      premium: {
        identifier: 'premium',
        productIdentifier: packageId,
        isActive: true,
      },
    },
  },
});

const normalizePackageIdentifier = (
  identifier: string,
  packages: SubscriptionPackage[],
): { packageId: string; identifier: string } => {
  const found = packages.find(
    pkg => pkg.identifier === identifier || pkg.product.identifier === identifier,
  );

  if (found) {
    return { packageId: found.product.identifier, identifier: found.identifier };
  }

  return { packageId: identifier, identifier };
};

// Helper for storage (SecureStore on mobile, AsyncStorage on web)
const storage = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      return AsyncStorage.setItem(key, value);
    }
    return SecureStore.setItemAsync(key, value);
  },
};

export const [SubscriptionProvider, useSubscription] = createContextHook(() => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [status, setStatus] = useState<SubscriptionStatus>('loading');
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [purchasesModule, setPurchasesModule] = useState<PurchasesModule | null>(null);
  const [isMockMode, setIsMockMode] = useState(false);
  
  // Trial state
  const [trialStartAt, setTrialStartAt] = useState<string | null>(null);
  const [hasSeenPaywall, setHasSeenPaywall] = useState(false);
  const [isTrialActive, setIsTrialActive] = useState(false);
  const [isTrialExpired, setIsTrialExpired] = useState(false);

  const updateCustomerInfo = useCallback((info: RCCustomerInfo) => {
    const hasActiveSubscription = Object.keys(info.entitlements.active).length > 0;

    setCustomerInfo({
      activeSubscriptions: info.activeSubscriptions,
      allPurchasedProductIdentifiers: info.allPurchasedProductIdentifiers,
      entitlements: {
        active: Object.entries(info.entitlements.active).reduce((acc, [key, value]) => {
          acc[key] = {
            identifier: value.identifier,
            productIdentifier: value.productIdentifier,
            isActive: value.isActive,
          };
          return acc;
        }, {} as CustomerInfo['entitlements']['active']),
      },
    });

    setStatus(hasActiveSubscription ? 'premium' : 'free');
  }, []);

  const checkTrialStatus = useCallback(async () => {
    try {
      const start = await storage.getItem(TRIAL_START_KEY);
      const seen = await storage.getItem(PAYWALL_SEEN_KEY);
      
      setTrialStartAt(start);
      setHasSeenPaywall(seen === 'true');

      if (start) {
        const startDate = new Date(start);
        const now = new Date();
        const diffMs = now.getTime() - startDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        
        if (diffDays < TRIAL_DURATION_DAYS) {
          setIsTrialActive(true);
          setIsTrialExpired(false);
        } else {
          setIsTrialActive(false);
          setIsTrialExpired(true);
        }
      } else {
        // No trial started yet
        setIsTrialActive(false);
        setIsTrialExpired(false);
      }
    } catch (error) {
      console.error('[SubscriptionProvider] Error checking trial status:', error);
    }
  }, []);

  const startTrial = useCallback(async () => {
    try {
      const now = new Date().toISOString();
      await storage.setItem(TRIAL_START_KEY, now);
      setTrialStartAt(now);
      setIsTrialActive(true);
      setIsTrialExpired(false);
      console.log('[SubscriptionProvider] Trial started at:', now);
    } catch (error) {
      console.error('[SubscriptionProvider] Error starting trial:', error);
    }
  }, []);

  const markPaywallSeen = useCallback(async () => {
    try {
      await storage.setItem(PAYWALL_SEEN_KEY, 'true');
      setHasSeenPaywall(true);
    } catch (error) {
      console.error('[SubscriptionProvider] Error marking paywall seen:', error);
    }
  }, []);

  const loadMockStatus = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
      if (!stored) {
        setStatus('free');
        setCustomerInfo(null);
        return false;
      }

      const parsed = JSON.parse(stored) as StoredSubscription;
      if (parsed.expiryDate && new Date(parsed.expiryDate) > new Date()) {
        setStatus('premium');
        setCustomerInfo(buildCustomerInfoFromMock(parsed.packageId));
        return true;
      }

      await AsyncStorage.removeItem(SUBSCRIPTION_STORAGE_KEY);
      setStatus('free');
      setCustomerInfo(null);
      return false;
    } catch (error) {
      console.error('Failed to load subscription status from storage:', error);
      setStatus('free');
      setCustomerInfo(null);
      return false;
    }
  }, []);

  const loadOfferings = useCallback(
    async (moduleOverride?: PurchasesModule | null) => {
      const module = moduleOverride ?? purchasesModule;

      if (!module) {
        return;
      }

      try {
        const offerings = await module.getOfferings();

        if (offerings.current && offerings.current.availablePackages.length > 0) {
          const formattedPackages: SubscriptionPackage[] = offerings.current.availablePackages.map(
            (pkg: any) => ({
              identifier: pkg.identifier,
              product: {
                identifier: pkg.product.identifier,
                title: pkg.product.title,
                description: pkg.product.description,
                price: pkg.product.price,
                priceString: pkg.product.priceString,
                currencyCode: pkg.product.currencyCode,
              },
            }),
          );

          setPackages(formattedPackages);
        }
      } catch (error) {
        console.error('[SubscriptionProvider] Failed to load RevenueCat offerings:', error);
      }
    },
    [purchasesModule],
  );

  const activateMockMode = useCallback(async () => {
    setIsMockMode(true);
    setPackages(WEB_MOCK_PACKAGES);
    await loadMockStatus();
    await checkTrialStatus();
  }, [loadMockStatus, checkTrialStatus]);

  useEffect(() => {
    const initializePurchases = async () => {
      try {
        if (Platform.OS === 'web') {
          await activateMockMode();
          setIsInitialized(true);
          return;
        }

        let module: PurchasesModule | null = null;

        try {
          const moduleNamespace = await import('react-native-purchases');
          // @ts-ignore
          module = moduleNamespace.default || moduleNamespace;
          setPurchasesModule(module);
        } catch (error) {
          console.warn('[SubscriptionProvider] RevenueCat not available:', error);
        }

        if (!module) {
          await activateMockMode();
          setIsInitialized(true);
          return;
        }

        if (Platform.OS === 'ios' && !REVENUECAT_API_KEY.ios) {
           console.warn('[SubscriptionProvider] No iOS API key found.');
        }

        const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY.ios : REVENUECAT_API_KEY.android;

        if (!apiKey) {
          await activateMockMode();
          setIsInitialized(true);
          return;
        }

        try {
          if (__DEV__) {
            await module.setLogLevel(module.LOG_LEVEL.DEBUG);
          }
          
          await module.configure({ apiKey });
          
          const info = await module.getCustomerInfo();
          
          updateCustomerInfo(info);
          setIsMockMode(false);
          await loadOfferings(module);
          await checkTrialStatus();
        } catch (error) {
          console.error('[SubscriptionProvider] Configuration failed:', error);
          await activateMockMode();
        }
      } catch (error) {
        console.error('[SubscriptionProvider] Critical error:', error);
        try {
          await activateMockMode();
        } catch (mockError) {
          setStatus('free');
          setPackages(WEB_MOCK_PACKAGES);
        }
      } finally {
        setIsInitialized(true);
      }
    };

    initializePurchases();
  }, [activateMockMode, loadOfferings, updateCustomerInfo, checkTrialStatus]);

  const persistMockSubscription = useCallback(async (data: StoredSubscription) => {
    try {
      await AsyncStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to persist mock subscription state:', error);
    }
  }, []);

  const purchasePackage = useCallback(
    async (packageIdentifier: string): Promise<boolean> => {
      if (isMockMode || !purchasesModule) {
        setIsPurchasing(true);
        try {
          const normalized = normalizePackageIdentifier(packageIdentifier, packages);
          const expiryDate = new Date();

          if (isYearlyIdentifier(normalized.identifier) || isYearlyIdentifier(normalized.packageId)) {
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
          } else {
            expiryDate.setMonth(expiryDate.getMonth() + 1);
          }

          const subscriptionData: StoredSubscription = {
            packageId: normalized.packageId,
            identifier: normalized.identifier,
            purchaseDate: new Date().toISOString(),
            expiryDate: expiryDate.toISOString(),
          };

          await persistMockSubscription(subscriptionData);
          setStatus('premium');
          setCustomerInfo(buildCustomerInfoFromMock(normalized.packageId));
          return true;
        } catch (error) {
          Alert.alert('Ошибка', 'Не удалось оформить подписку.');
          return false;
        } finally {
          setIsPurchasing(false);
        }
      }

      if (!isInitialized) {
        Alert.alert('Ошибка', 'Система оплаты еще не готова.');
        return false;
      }

      setIsPurchasing(true);
      const module = purchasesModule;

      try {
        const offerings = await module.getOfferings();
        const availablePackage = offerings.current?.availablePackages.find(
          (pkg: any) => pkg.identifier === packageIdentifier,
        );

        if (!availablePackage) {
          Alert.alert('Ошибка', 'Выбранный пакет подписки недоступен.');
          return false;
        }

        const { customerInfo: info } = await module.purchasePackage(availablePackage);
        updateCustomerInfo(info);
        return true;
      } catch (error: any) {
        if (!error?.userCancelled) {
          Alert.alert('Ошибка', 'Не удалось оформить подписку.');
        }
        return false;
      } finally {
        setIsPurchasing(false);
      }
    },
    [isInitialized, isMockMode, packages, persistMockSubscription, purchasesModule, updateCustomerInfo],
  );

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    if (isMockMode || !purchasesModule) {
      setIsRestoring(true);
      try {
        return await loadMockStatus();
      } finally {
        setIsRestoring(false);
      }
    }

    if (!isInitialized) return false;

    setIsRestoring(true);
    try {
      const info = await purchasesModule.restorePurchases();
      updateCustomerInfo(info);
      return Object.keys(info.entitlements.active).length > 0;
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось восстановить покупки.');
      return false;
    } finally {
      setIsRestoring(false);
    }
  }, [isInitialized, isMockMode, loadMockStatus, purchasesModule, updateCustomerInfo]);

  const checkSubscriptionStatus = useCallback(async () => {
    await checkTrialStatus();
    
    if (isMockMode || !purchasesModule) {
      await loadMockStatus();
      return;
    }

    if (!isInitialized) return;

    try {
      const info = await purchasesModule.getCustomerInfo();
      updateCustomerInfo(info);
    } catch (error) {
      console.error('SubscriptionProvider: failed to refresh customer info', error);
    }
  }, [isInitialized, isMockMode, loadMockStatus, purchasesModule, updateCustomerInfo, checkTrialStatus]);

  // Access logic
  const canAccessPremiumFeatures = useCallback(() => {
    if (status === 'premium') return true;
    if (isTrialActive && !isTrialExpired) return true;
    return false;
  }, [status, isTrialActive, isTrialExpired]);

  const getFeatureAccess = useCallback(() => {
    const hasAccess = canAccessPremiumFeatures();

    return {
      addTasks: true,
      oneDayPlan: true,
      pomodoroTimer: true,
      basicGamification: true,
      oneDayHistory: true,
      basicThemes: true,
      
      aiAdviceLimit: hasAccess ? Infinity : 3,
      smartTasksLimit: hasAccess ? Infinity : 1,
      
      dailyAICoach: hasAccess,
      weeklyMonthlyPlan: hasAccess,
      weeklyAIReport: hasAccess,
      unlimitedAIAdvice: hasAccess,
      unlimitedSmartTasks: hasAccess,
      extendedHistory: hasAccess,
      levelsAndRewards: hasAccess,
      aiChatAssistant: hasAccess,
      prioritySpeed: hasAccess,
      smartPomodoroAnalytics: hasAccess,
      allFutureFeatures: hasAccess,
    };
  }, [canAccessPremiumFeatures]);

  const value = useMemo(
    () => ({
      isInitialized,
      status,
      packages,
      customerInfo,
      isPurchasing,
      isRestoring,
      isPremium: status === 'premium',
      purchasePackage,
      restorePurchases,
      checkSubscriptionStatus,
      
      // Trial & First Launch
      trialStartAt,
      hasSeenPaywall,
      isTrialActive,
      isTrialExpired,
      startTrial,
      markPaywallSeen,
      
      canAccessPremiumFeatures,
      getFeatureAccess,
    }),
    [
      checkSubscriptionStatus,
      customerInfo,
      isInitialized,
      isPurchasing,
      isRestoring,
      packages,
      purchasePackage,
      restorePurchases,
      status,
      trialStartAt,
      hasSeenPaywall,
      isTrialActive,
      isTrialExpired,
      startTrial,
      markPaywallSeen,
      canAccessPremiumFeatures,
      getFeatureAccess,
    ],
  );

  return value;
});
