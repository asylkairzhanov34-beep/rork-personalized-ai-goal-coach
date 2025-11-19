import { useState, useEffect, useCallback, useMemo } from 'react';
import { Platform, Alert } from 'react-native';
import type { PurchasesPackage, CustomerInfo as RCCustomerInfo } from 'react-native-purchases';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CustomerInfo, SubscriptionPackage, SubscriptionStatus } from '@/types/subscription';

type PurchasesModule = any;

type StoredSubscription = {
  packageId: string;
  identifier: string;
  purchaseDate: string;
  expiryDate?: string;
};

const REVENUECAT_API_KEY = {
  ios: 'appl_NIzzmGwASbGFsnfAddnshynSnsG',
  android: 'goog_...', // Add Android key if available
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

const SUBSCRIPTION_STORAGE_KEY = '@subscription_status';

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

export const [SubscriptionProvider, useSubscription] = createContextHook(() => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [status, setStatus] = useState<SubscriptionStatus>('loading');
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [purchasesModule, setPurchasesModule] = useState<PurchasesModule | null>(null);
  const [isMockMode, setIsMockMode] = useState(false);

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
        console.log('Purchases module not available, skipping offerings load');
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
          console.log(`[SubscriptionProvider] Loaded ${formattedPackages.length} subscription packages from RevenueCat`);
        } else {
          console.log('[SubscriptionProvider] RevenueCat returned no available offerings. Check RevenueCat dashboard configuration.');
          // If no offerings found, we might want to show an alert or fallback in dev mode
          if (__DEV__) {
             console.log('[SubscriptionProvider] DEV MODE: You might need to create Offerings in RevenueCat dashboard.');
          }
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
  }, [loadMockStatus]);

  useEffect(() => {
    const initializePurchases = async () => {
      try {
        console.log('[SubscriptionProvider] Starting initialization...');
        
        if (Platform.OS === 'web') {
          console.log('[SubscriptionProvider] Web mode, using mock');
          await activateMockMode();
          setIsInitialized(true);
          return;
        }

        let module: PurchasesModule | null = null;

        try {
          const moduleNamespace = await import('react-native-purchases');
          // @ts-ignore
          const module = moduleNamespace.default || moduleNamespace;
          setPurchasesModule(module);
        } catch (error) {
          console.warn('[SubscriptionProvider] RevenueCat not available:', error);
        }

        if (!module) {
          console.warn('[SubscriptionProvider] Using mock mode (module missing)');
          await activateMockMode();
          setIsInitialized(true);
          return;
        }

        if (Platform.OS === 'ios' && !REVENUECAT_API_KEY.ios) {
           console.warn('[SubscriptionProvider] No iOS API key found. Please check REVENUECAT_API_KEY.');
        }

        const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY.ios : REVENUECAT_API_KEY.android;

        if (!apiKey) {
          console.warn('[SubscriptionProvider] No API key for current platform, using mock mode');
          await activateMockMode();
          setIsInitialized(true);
          return;
        }

        try {
          // Configure with more verbose logging for debugging
          if (__DEV__) {
            await module.setLogLevel(module.LOG_LEVEL.DEBUG);
          }
          
          await module.configure({ apiKey });
          console.log('[SubscriptionProvider] RevenueCat configured with key:', apiKey.substring(0, 8) + '...');
          
          const info = await module.getCustomerInfo();
          console.log('[SubscriptionProvider] Initial customer info retrieved:', info?.activeSubscriptions);
          
          updateCustomerInfo(info);
          setIsMockMode(false);
          await loadOfferings(module);
        } catch (error) {
          console.error('[SubscriptionProvider] Configuration failed:', error);
          // Fallback to mock mode if configuration fails entirely
          console.warn('[SubscriptionProvider] Init failed, falling back to mock mode');
          await activateMockMode();
        }
      } catch (error) {
        console.error('[SubscriptionProvider] Critical error:', error);
        try {
          await activateMockMode();
        } catch (mockError) {
          console.error('[SubscriptionProvider] Mock mode failed:', mockError);
          setStatus('free');
          setPackages(WEB_MOCK_PACKAGES);
        }
      } finally {
        setIsInitialized(true);
        console.log('[SubscriptionProvider] Initialization complete');
      }
    };

    initializePurchases();
  }, [activateMockMode, loadOfferings, updateCustomerInfo]);

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
        console.log('SubscriptionProvider: performing mock purchase', packageIdentifier);
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
          console.log('SubscriptionProvider: mock purchase successful');
          return true;
        } catch (error) {
          console.error('SubscriptionProvider: mock purchase failed', error);
          Alert.alert('Ошибка', 'Не удалось оформить подписку. Попробуйте снова.');
          return false;
        } finally {
          setIsPurchasing(false);
        }
      }

      if (!isInitialized) {
        console.log('SubscriptionProvider: RevenueCat not initialized yet');
        Alert.alert('Ошибка', 'Система оплаты еще не готова. Попробуйте позже.');
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
          console.error('SubscriptionProvider: package not found in offerings');
          Alert.alert('Ошибка', 'Выбранный пакет подписки недоступен.');
          return false;
        }

        console.log('SubscriptionProvider: purchasing package', packageIdentifier);
        const { customerInfo: info } = await module.purchasePackage(availablePackage);
        updateCustomerInfo(info);
        console.log('SubscriptionProvider: purchase completed successfully');
        return true;
      } catch (error: any) {
        if (error?.userCancelled) {
          console.log('SubscriptionProvider: purchase cancelled by user');
        } else {
          console.error('SubscriptionProvider: purchase failed', error);
          Alert.alert('Ошибка', 'Не удалось оформить подписку. Попробуйте снова.');
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
      console.log('SubscriptionProvider: restoring purchases in mock mode');
      setIsRestoring(true);

      try {
        const restored = await loadMockStatus();
        return restored;
      } catch (error) {
        console.error('SubscriptionProvider: failed to restore mock purchases', error);
        return false;
      } finally {
        setIsRestoring(false);
      }
    }

    if (!isInitialized) {
      console.log('SubscriptionProvider: attempted restore before initialization');
      return false;
    }

    setIsRestoring(true);

    try {
      const info = await purchasesModule.restorePurchases();
      updateCustomerInfo(info);
      console.log('SubscriptionProvider: purchases restored successfully');
      return Object.keys(info.entitlements.active).length > 0;
    } catch (error) {
      console.error('SubscriptionProvider: failed to restore purchases', error);
      Alert.alert('Ошибка', 'Не удалось восстановить покупки. Попробуйте позже.');
      return false;
    } finally {
      setIsRestoring(false);
    }
  }, [isInitialized, isMockMode, loadMockStatus, purchasesModule, updateCustomerInfo]);

  const checkSubscriptionStatus = useCallback(async () => {
    if (isMockMode || !purchasesModule) {
      await loadMockStatus();
      return;
    }

    if (!isInitialized) {
      console.log('SubscriptionProvider: skipping status check before initialization');
      return;
    }

    try {
      const info = await purchasesModule.getCustomerInfo();
      updateCustomerInfo(info);
    } catch (error) {
      console.error('SubscriptionProvider: failed to refresh customer info', error);
    }
  }, [isInitialized, isMockMode, loadMockStatus, purchasesModule, updateCustomerInfo]);

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
    }),
    [checkSubscriptionStatus, customerInfo, isInitialized, isPurchasing, isRestoring, packages, purchasePackage, restorePurchases, status],
  );

  return value;
});
