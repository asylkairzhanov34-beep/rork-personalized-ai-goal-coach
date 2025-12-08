import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import createContextHook from '@nkzw/create-context-hook';
import { CustomerInfo, SubscriptionPackage, SubscriptionStatus } from '@/types/subscription';
import {
  initializeRevenueCat,
  getCustomerInfo,
  purchasePackageByIdentifier,
  restorePurchases as restorePurchasesRC,
  syncWithRevenueCat,
  invalidateCustomerInfoCache,
  getOfferingsWithCache,
  getOriginalPackages,
  RevenueCatCustomerInfo,
  RevenueCatPackage,
} from '@/lib/revenuecat';
import { saveUserSubscription } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth-store';

const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000;
const SUBSCRIPTION_STORAGE_KEY = '@subscription_status';
const FIRST_LAUNCH_KEY = '@first_launch';
const SUBSCRIPTION_OFFER_KEYS = {
  seenOffer: 'hasSeenSubscriptionOffer',
  trialStartISO: 'trialStartISO',
};

const SECURE_KEYS = {
  trialStartAt: 'trialStartAt',
  hasSeenPaywall: 'hasSeenPaywall',
  subscriptionActive: 'subscriptionActive',
};

const ANALYTICS_EVENTS = {
  PAYWALL_SHOWN: 'paywall_shown',
  TRIAL_STARTED: 'trial_started',
  TRIAL_EXPIRED: 'trial_expired',
  FEATURE_BLOCKED: 'feature_blocked',
  PURCHASE_INITIATED: 'purchase_initiated',
  PURCHASE_SUCCESS: 'purchase_success',
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

const emitAnalytics = (event: string, payload?: Record<string, unknown>) => {
  console.log(`[SubscriptionAnalytics] ${event}`, payload ?? {});
};

const canUseSecureStore = Platform.OS !== 'web';

const secureGet = async (key: string) => {
  if (canUseSecureStore) {
    return SecureStore.getItemAsync(key);
  }
  return AsyncStorage.getItem(key);
};

const secureSet = async (key: string, value: string) => {
  if (canUseSecureStore) {
    return SecureStore.setItemAsync(key, value);
  }
  return AsyncStorage.setItem(key, value);
};

const secureDelete = async (key: string) => {
  if (canUseSecureStore) {
    return SecureStore.deleteItemAsync(key);
  }
  return AsyncStorage.removeItem(key);
};

const isYearlyIdentifier = (identifier: string) =>
  YEAR_IDENTIFIERS.some(token => identifier.toLowerCase().includes(token));

const buildTrialState = (start: string | null) => {
  if (!start) {
    return {
      startedAt: null,
      expiresAt: null,
      isActive: false,
      isExpired: false,
      remainingMs: 0,
    };
  }

  const startedMs = Date.parse(start);
  if (Number.isNaN(startedMs)) {
    return {
      startedAt: null,
      expiresAt: null,
      isActive: false,
      isExpired: false,
      remainingMs: 0,
    };
  }

  const expiresMs = startedMs + TRIAL_DURATION_MS;
  const now = Date.now();
  const remainingMs = Math.max(expiresMs - now, 0);
  const isExpired = now >= expiresMs;

  return {
    startedAt: new Date(startedMs).toISOString(),
    expiresAt: new Date(expiresMs).toISOString(),
    isActive: !isExpired,
    isExpired,
    remainingMs,
  };
};

const defaultTrialState = buildTrialState(null);

const normalizePackageIdentifier = (
  identifier: string,
  packages: SubscriptionPackage[],
) => {
  const found = packages.find(
    pkg => pkg.identifier === identifier || pkg.product.identifier === identifier,
  );

  if (found) {
    return { packageId: found.product.identifier, identifier: found.identifier };
  }

  return { packageId: identifier, identifier };
};

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

const estimateNextBillingDate = (identifier: string) => {
  const date = new Date();
  if (isYearlyIdentifier(identifier)) {
    date.setFullYear(date.getFullYear() + 1);
  } else {
    date.setMonth(date.getMonth() + 1);
  }
  return date.toISOString();
};

export type PurchaseResult = {
  planName: string;
  productId: string;
  priceString: string;
  nextBillingDate?: string;
};

export type TrialState = ReturnType<typeof buildTrialState>;

export const [SubscriptionProvider, useSubscription] = createContextHook(() => {
  const auth = useAuth();
  const user = auth?.user;
  const [isInitialized, setIsInitialized] = useState(false);
  const [status, setStatus] = useState<SubscriptionStatus>('loading');
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isMockMode, setIsMockMode] = useState(false);
  const [trialState, setTrialState] = useState<TrialState>(defaultTrialState);
  const [hasSeenPaywall, setHasSeenPaywall] = useState(false);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);
  const trialStateRef = useRef<TrialState>(defaultTrialState);
  const trialExpiryLoggedRef = useRef(false);

  useEffect(() => {
    trialStateRef.current = trialState;
  }, [trialState]);

  const mapCustomerInfo = useCallback((info: RevenueCatCustomerInfo | null): CustomerInfo | null => {
    if (!info) {
      return null;
    }

    return {
      activeSubscriptions: info.activeSubscriptions ?? [],
      allPurchasedProductIdentifiers: info.allPurchasedProductIdentifiers ?? [],
      entitlements: {
        active: Object.entries(info.entitlements?.active ?? {}).reduce((acc, [key, value]) => {
          acc[key] = {
            identifier: value.identifier,
            productIdentifier: value.productIdentifier,
            isActive: value.isActive,
          };
          return acc;
        }, {} as CustomerInfo['entitlements']['active']),
      },
    };
  }, []);

  const persistCustomerInfo = useCallback(
    async (info: RevenueCatCustomerInfo | null) => {
      const mapped = mapCustomerInfo(info);
      if (mapped) {
        setCustomerInfo(mapped);
      } else {
        setCustomerInfo(null);
      }

      const hasActive = info ? Object.keys(info.entitlements?.active ?? {}).length > 0 : false;

      if (hasActive) {
        setStatus('premium');
        await secureSet(SECURE_KEYS.subscriptionActive, 'true');
        await secureDelete(SECURE_KEYS.trialStartAt);
        await AsyncStorage.removeItem(SUBSCRIPTION_OFFER_KEYS.trialStartISO);
        setTrialState(defaultTrialState);
        trialStateRef.current = defaultTrialState;
        
        if (user?.id) {
          await saveUserSubscription(user.id, {
            status: 'premium',
            customerInfo: mapped,
            updatedAt: new Date().toISOString(),
          }).catch((err: Error) => {
            console.error('[SubscriptionStore] Failed to save subscription to Firebase:', err);
          });
        }
      } else {
        await secureDelete(SECURE_KEYS.subscriptionActive);
        if (trialStateRef.current.isActive) {
          setStatus('trial');
        } else if (!trialStateRef.current.startedAt) {
          setStatus('free');
        }
        
        if (user?.id) {
          await saveUserSubscription(user.id, {
            status: trialStateRef.current.isActive ? 'trial' : 'free',
            trialState: trialStateRef.current,
            updatedAt: new Date().toISOString(),
          }).catch((err: Error) => {
            console.error('[SubscriptionStore] Failed to save subscription to Firebase:', err);
          });
        }
      }
    },
    [mapCustomerInfo, user?.id],
  );

  const hydratePaywallSeen = useCallback(async () => {
    const stored = await secureGet(SECURE_KEYS.hasSeenPaywall);
    setHasSeenPaywall(stored === 'true');
  }, []);

  const hydrateSecurePremiumFlag = useCallback(async () => {
    const stored = await secureGet(SECURE_KEYS.subscriptionActive);
    const isActive = stored === 'true';
    if (isActive) {
      setStatus('premium');
    }
    return isActive;
  }, []);

  const hydrateTrialState = useCallback(async () => {
    const stored = await secureGet(SECURE_KEYS.trialStartAt);
    const next = buildTrialState(stored);
    setTrialState(next);
    trialStateRef.current = next;
    if (next.isActive && status !== 'premium') {
      setStatus('trial');
    }
    return next;
  }, [status]);

  const checkFirstLaunch = useCallback(async () => {
    const firstLaunch = await AsyncStorage.getItem(FIRST_LAUNCH_KEY);
    if (!firstLaunch) {
      await AsyncStorage.setItem(FIRST_LAUNCH_KEY, 'false');
      setIsFirstLaunch(true);
    } else {
      setIsFirstLaunch(false);
    }
  }, []);

  const persistMockSubscription = useCallback(async (data: {
    packageId: string;
    identifier: string;
    expiryDate: string;
  }) => {
    await AsyncStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(data));
  }, []);

  const loadMockStatus = useCallback(async () => {
    const stored = await AsyncStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
    if (!stored) {
      setStatus(trialStateRef.current.isActive ? 'trial' : 'free');
      setCustomerInfo(null);
      return false;
    }

    const parsed = JSON.parse(stored) as {
      packageId: string;
      expiryDate: string;
    };

    if (parsed.expiryDate && new Date(parsed.expiryDate) > new Date()) {
      setStatus('premium');
      setCustomerInfo(buildCustomerInfoFromMock(parsed.packageId));
      return true;
    }

    await AsyncStorage.removeItem(SUBSCRIPTION_STORAGE_KEY);
    setStatus(trialStateRef.current.isActive ? 'trial' : 'free');
    setCustomerInfo(null);
    return false;
  }, []);

  const loadOfferingsFromRevenueCat = useCallback(async () => {
    console.log('[SubscriptionProvider] 📦 Loading offerings from RevenueCat...');
    
    // Используем getOfferingsWithCache для сохранения оригинальных пакетов
    const offerings = await getOfferingsWithCache();
    
    console.log('[SubscriptionProvider] 📦 Offerings result:', {
      hasOfferings: !!offerings,
      hasCurrent: !!offerings?.current,
      packagesCount: offerings?.current?.availablePackages?.length || 0,
    });
    
    if (offerings?.current?.availablePackages?.length) {
      const formatted = offerings.current.availablePackages.map((pkg: RevenueCatPackage) => ({
        identifier: pkg.identifier,
        product: {
          identifier: pkg.product.identifier,
          title: pkg.product.title,
          description: pkg.product.description,
          price: pkg.product.price,
          priceString: pkg.product.priceString,
          currencyCode: pkg.product.currencyCode,
        },
      }));
      setPackages(formatted);
      console.log('[SubscriptionProvider] ✅ Loaded offerings:', formatted.length, 'packages');
      console.log('[SubscriptionProvider] ✅ Original packages cached:', getOriginalPackages().length);
      
      // Логируем каждый пакет
      formatted.forEach((pkg, idx) => {
        console.log(`[SubscriptionProvider] Package ${idx + 1}: ${pkg.product.identifier} - ${pkg.product.priceString}`);
      });
    } else {
      console.warn('[SubscriptionProvider] ⚠️ NO packages received from RevenueCat');
      console.warn('[SubscriptionProvider] ⚠️ Mock mode:', isMockMode);
      console.warn('[SubscriptionProvider] ⚠️ Platform:', Platform.OS);
      
      if (isMockMode || Platform.OS === 'web') {
        setPackages(WEB_MOCK_PACKAGES);
        console.log('[SubscriptionProvider] Using mock packages');
      } else {
        console.error('[SubscriptionProvider] ❌ CRITICAL: Real device but no packages!');
      }
    }
  }, [isMockMode]);

  useEffect(() => {
    const bootstrap = async () => {
      const isExpoGoRuntime = Constants?.appOwnership === 'expo';
      const isRorkSandbox = typeof window !== 'undefined' && (window as any).__RORK_SANDBOX__;
      const isRealDevice = (Platform.OS === 'ios' || Platform.OS === 'android') && !isExpoGoRuntime && !isRorkSandbox;
      
      try {
        console.log('[SubscriptionProvider] Starting initialization...');
        console.log('[SubscriptionProvider] Platform:', Platform.OS);
        console.log('[SubscriptionProvider] appOwnership:', Constants?.appOwnership);
        console.log('[SubscriptionProvider] Is Expo Go:', isExpoGoRuntime);
        console.log('[SubscriptionProvider] Is Rork Sandbox:', isRorkSandbox);
        console.log('[SubscriptionProvider] Is real device:', isRealDevice);
        
        await hydratePaywallSeen();
        const securePremium = await hydrateSecurePremiumFlag();
        const trial = await hydrateTrialState();
        await checkFirstLaunch();

        // Web platform or Rork Sandbox always uses mock mode
        if (Platform.OS === 'web' || isRorkSandbox) {
          console.log('[SubscriptionProvider]', isRorkSandbox ? 'Rork Sandbox' : 'Web platform', '- using mock mode');
          setIsMockMode(true);
          setPackages(WEB_MOCK_PACKAGES);
          if (!securePremium && !trial.isActive) {
            setStatus('free');
          }
          setIsInitialized(true);
          return;
        }
        
        // Real devices (iOS/Android) MUST use RevenueCat
        const initialized = await initializeRevenueCat();
        if (!initialized) {
          console.error('[SubscriptionProvider] ❌ RevenueCat initialization failed');
          if (isRealDevice) {
            console.error('[SubscriptionProvider] ❌ CRITICAL: Real device requires RevenueCat!');
            throw new Error('RevenueCat is required for real devices');
          }
          console.log('[SubscriptionProvider] Using mock mode (Expo Go)');
          setIsMockMode(true);
          setPackages(WEB_MOCK_PACKAGES);
          if (!securePremium && !trial.isActive) {
            setStatus('free');
          }
          setIsInitialized(true);
          return;
        }

        // RevenueCat initialized successfully - NEVER use mock mode
        console.log('[SubscriptionProvider] ✅ RevenueCat initialized');
        setIsMockMode(false);
        
        const info = await getCustomerInfo();
        if (info) {
          await persistCustomerInfo(info);
        } else if (!securePremium && !trial.isActive) {
          setStatus('free');
        }

        await loadOfferingsFromRevenueCat();
        setIsInitialized(true);
        console.log('[SubscriptionProvider] ✅ Initialization complete');
      } catch (error) {
        console.error('[SubscriptionProvider] ❌ Initialization error:', error);
        
        // CRITICAL: For real devices, DO NOT fallback to mock mode
        if (isRealDevice) {
          console.error('[SubscriptionProvider] ❌ FATAL: Cannot use mock mode on real device');
          setIsMockMode(false);
          setPackages([]);
          setStatus('free');
          setIsInitialized(true);
        } else {
          // Only Expo Go, web, or Rork sandbox can use mock
          console.log('[SubscriptionProvider] Falling back to mock mode (non-real device)');
          setIsMockMode(true);
          setPackages(WEB_MOCK_PACKAGES);
          setIsInitialized(true);
        }
      }
    };

    bootstrap();
  }, [checkFirstLaunch, hydratePaywallSeen, hydrateSecurePremiumFlag, hydrateTrialState, loadOfferingsFromRevenueCat, persistCustomerInfo]);

  useEffect(() => {
    if (!trialState.startedAt || trialState.isExpired) {
      return;
    }

    const interval = setInterval(() => {
      setTrialState(current => buildTrialState(current.startedAt));
    }, 60000);

    return () => clearInterval(interval);
  }, [trialState.startedAt, trialState.isExpired]);

  useEffect(() => {
    if (trialState.isActive && status !== 'premium') {
      setStatus('trial');
    }

    if (!trialState.isActive && trialState.startedAt && !trialExpiryLoggedRef.current) {
      emitAnalytics(ANALYTICS_EVENTS.TRIAL_EXPIRED, {
        expired_at: trialState.expiresAt,
      });
      trialExpiryLoggedRef.current = true;
    }

    if (trialState.isActive) {
      trialExpiryLoggedRef.current = false;
    }

    if (trialState.isExpired && !trialState.isActive && status !== 'premium' && !trialState.startedAt) {
      setStatus('free');
    }
  }, [status, trialState]);

  const canAccessPremiumFeatures = useCallback(() => {
    if (status === 'premium') {
      return true;
    }
    return trialState.isActive;
  }, [status, trialState.isActive]);

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

  const markPaywallSeen = useCallback(async () => {
    setHasSeenPaywall(true);
    await secureSet(SECURE_KEYS.hasSeenPaywall, 'true');
  }, []);

  const startTrial = useCallback(async (manualStartISO?: string) => {
    if (trialStateRef.current.startedAt) {
      await AsyncStorage.setItem(
        SUBSCRIPTION_OFFER_KEYS.trialStartISO,
        trialStateRef.current.startedAt,
      );
      await AsyncStorage.setItem(SUBSCRIPTION_OFFER_KEYS.seenOffer, 'true');
      return trialStateRef.current;
    }

    const now = manualStartISO ?? new Date().toISOString();
    await secureSet(SECURE_KEYS.trialStartAt, now);
    await AsyncStorage.setItem(SUBSCRIPTION_OFFER_KEYS.trialStartISO, now);
    await AsyncStorage.setItem(SUBSCRIPTION_OFFER_KEYS.seenOffer, 'true');
    const nextState = buildTrialState(now);
    setTrialState(nextState);
    trialStateRef.current = nextState;
    setStatus('trial');
    emitAnalytics(ANALYTICS_EVENTS.TRIAL_STARTED, { started_at: now });
    
    if (user?.id) {
      await saveUserSubscription(user.id, {
        status: 'trial',
        trialState: nextState,
        updatedAt: new Date().toISOString(),
      }).catch((err: Error) => {
        console.error('[SubscriptionStore] Failed to save trial to Firebase:', err);
      });
    }
    
    return nextState;
  }, [user?.id]);

  const purchasePackage = useCallback(
    async (packageIdentifier: string): Promise<PurchaseResult | null> => {
      const isExpoGoRuntime = Constants?.appOwnership === 'expo';
      const isRorkSandbox = typeof window !== 'undefined' && (window as any).__RORK_SANDBOX__;
      const isRealDevice = (Platform.OS === 'ios' || Platform.OS === 'android') && !isExpoGoRuntime && !isRorkSandbox;
      
      // КРИТИЧНО: Для реальных устройств НИКОГДА не используем Mock Mode
      if (isRealDevice && isMockMode) {
        console.error('[SubscriptionProvider] ❌ CRITICAL: Real device is in mock mode!');
        throw new Error('Mock mode should never be active on real devices');
      }
      
      if (isMockMode || Platform.OS === 'web') {
        setIsPurchasing(true);
        try {
          const normalized = normalizePackageIdentifier(packageIdentifier, packages);
          const expiryDate = estimateNextBillingDate(normalized.identifier);
          await persistMockSubscription({
            packageId: normalized.packageId,
            identifier: normalized.identifier,
            expiryDate,
          });
          const mockInfo = buildCustomerInfoFromMock(normalized.packageId);
          setStatus('premium');
          setCustomerInfo(mockInfo);
          await secureSet(SECURE_KEYS.subscriptionActive, 'true');
          
          if (user?.id) {
            await saveUserSubscription(user.id, {
              status: 'premium',
              customerInfo: mockInfo,
              packageId: normalized.packageId,
              identifier: normalized.identifier,
              expiryDate,
              updatedAt: new Date().toISOString(),
            }).catch((err: Error) => {
              console.error('[SubscriptionStore] Failed to save mock subscription to Firebase:', err);
            });
          }
          
          return {
            planName: normalized.identifier,
            productId: normalized.packageId,
            priceString: packages.find(pkg => pkg.identifier === packageIdentifier)?.product.priceString ?? '',
            nextBillingDate: expiryDate,
          };
        } catch (error) {
          console.error('[SubscriptionProvider] Mock purchase failed', error);
          Alert.alert('Ошибка', 'Не удалось оформить подписку. Попробуйте снова.');
          return null;
        } finally {
          setIsPurchasing(false);
        }
      }

      setIsPurchasing(true);
      emitAnalytics(ANALYTICS_EVENTS.PURCHASE_INITIATED, { packageIdentifier });

      try {
        console.log('[SubscriptionProvider] Initiating purchase for:', packageIdentifier);
        const purchase = await purchasePackageByIdentifier(packageIdentifier);
        if (!purchase) {
          Alert.alert('Ошибка', 'Выбранный пакет недоступен.');
          return null;
        }

        await persistCustomerInfo(purchase.info);
        emitAnalytics(ANALYTICS_EVENTS.PURCHASE_SUCCESS, {
          packageIdentifier,
        });

        return {
          planName: purchase.purchasedPackage.product.title,
          productId: purchase.purchasedPackage.product.identifier,
          priceString: purchase.purchasedPackage.product.priceString,
          nextBillingDate: estimateNextBillingDate(purchase.purchasedPackage.product.identifier),
        };
      } catch (error: any) {
        if (error?.userCancelled) {
          console.log('[SubscriptionProvider] Purchase cancelled by user');
          return null;
        }
        console.error('[SubscriptionProvider] Purchase failed', error);
        Alert.alert('Ошибка', 'Не удалось оформить подписку. Попробуйте снова.');
        return null;
      } finally {
        setIsPurchasing(false);
      }
    },
    [isMockMode, packages, persistCustomerInfo, persistMockSubscription, user?.id],
  );

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    const isExpoGoRuntime = Constants?.appOwnership === 'expo';
    const isRorkSandbox = typeof window !== 'undefined' && (window as any).__RORK_SANDBOX__;
    const isRealDevice = (Platform.OS === 'ios' || Platform.OS === 'android') && !isExpoGoRuntime && !isRorkSandbox;
    
    // КРИТИЧНО: Для реальных устройств НИКОГДА не используем Mock Mode
    if (isRealDevice && isMockMode) {
      console.error('[SubscriptionProvider] ❌ CRITICAL: Real device is in mock mode!');
      throw new Error('Mock mode should never be active on real devices');
    }
    
    if (isMockMode || Platform.OS === 'web') {
      setIsRestoring(true);
      try {
        const restored = await loadMockStatus();
        return restored;
      } finally {
        setIsRestoring(false);
      }
    }

    setIsRestoring(true);
    try {
      console.log('[SubscriptionProvider] Restoring purchases...');
      const info = await restorePurchasesRC();
      if (info) {
        await persistCustomerInfo(info);
        return Object.keys(info.entitlements?.active ?? {}).length > 0;
      }
      return false;
    } catch (error) {
      console.error('[SubscriptionProvider] Restore failed', error);
      Alert.alert('Ошибка', 'Не удалось восстановить покупки. Попробуйте позже.');
      return false;
    } finally {
      setIsRestoring(false);
    }
  }, [isMockMode, loadMockStatus, persistCustomerInfo]);

  const checkSubscriptionStatus = useCallback(async () => {
    if (isMockMode || Platform.OS === 'web') {
      await loadMockStatus();
      return;
    }

    const info = await getCustomerInfo();
    if (info) {
      await persistCustomerInfo(info);
    }
  }, [isMockMode, loadMockStatus, persistCustomerInfo]);

  const cancelSubscriptionForDev = useCallback(async () => {
    console.log('[SubscriptionProvider] Cancelling subscription (dev/test mode)');
    
    await secureDelete(SECURE_KEYS.subscriptionActive);
    setCustomerInfo(null);
    setStatus(trialStateRef.current.isActive ? 'trial' : 'free');
    
    if (isMockMode || Platform.OS === 'web') {
      await AsyncStorage.removeItem(SUBSCRIPTION_STORAGE_KEY);
    }
  }, [isMockMode]);

  const forceRefreshFromServer = useCallback(async (): Promise<boolean> => {
    if (isMockMode || Platform.OS === 'web') {
      console.log('[SubscriptionProvider] Force refresh - mock mode, reloading local state');
      await loadMockStatus();
      return true;
    }

    try {
      console.log('[SubscriptionProvider] Force refreshing from RevenueCat server...');
      await invalidateCustomerInfoCache();
      const info = await syncWithRevenueCat();
      
      if (info) {
        const hasActive = Object.keys(info.entitlements?.active ?? {}).length > 0;
        console.log('[SubscriptionProvider] Server sync result - has active:', hasActive);
        
        if (hasActive) {
          await persistCustomerInfo(info);
          return true;
        } else {
          await secureDelete(SECURE_KEYS.subscriptionActive);
          setCustomerInfo(null);
          setStatus(trialStateRef.current.isActive ? 'trial' : 'free');
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('[SubscriptionProvider] Force refresh failed:', error);
      return false;
    }
  }, [isMockMode, loadMockStatus, persistCustomerInfo]);

  const fullResetForTesting = useCallback(async () => {
    console.log('[SubscriptionProvider] Full reset for testing...');
    
    await Promise.all([
      AsyncStorage.multiRemove([
        SUBSCRIPTION_OFFER_KEYS.trialStartISO,
        SUBSCRIPTION_OFFER_KEYS.seenOffer,
        SUBSCRIPTION_STORAGE_KEY,
        FIRST_LAUNCH_KEY,
      ]),
      secureDelete(SECURE_KEYS.trialStartAt),
      secureDelete(SECURE_KEYS.subscriptionActive),
      secureDelete(SECURE_KEYS.hasSeenPaywall),
    ]);
    
    setHasSeenPaywall(false);
    setTrialState(defaultTrialState);
    trialStateRef.current = defaultTrialState;
    setStatus('free');
    setCustomerInfo(null);
    setIsFirstLaunch(true);
    
    if (!isMockMode && Platform.OS !== 'web') {
      await invalidateCustomerInfoCache();
      const info = await syncWithRevenueCat();
      if (info) {
        const hasActive = Object.keys(info.entitlements?.active ?? {}).length > 0;
        if (hasActive) {
          console.log('[SubscriptionProvider] Server still has active subscription');
          await persistCustomerInfo(info);
        }
      }
    }
    
    console.log('[SubscriptionProvider] Full reset complete');
  }, [isMockMode, persistCustomerInfo]);

  const resetSubscriptionDebug = useCallback(async () => {
    const cleared = buildTrialState(null);
    await Promise.all([
      AsyncStorage.multiRemove([
        SUBSCRIPTION_OFFER_KEYS.trialStartISO,
        SUBSCRIPTION_OFFER_KEYS.seenOffer,
        SUBSCRIPTION_STORAGE_KEY,
      ]),
      secureDelete(SECURE_KEYS.trialStartAt),
      secureDelete(SECURE_KEYS.subscriptionActive),
      secureDelete(SECURE_KEYS.hasSeenPaywall),
    ]);
    setHasSeenPaywall(false);
    setTrialState(cleared);
    trialStateRef.current = cleared;
    setStatus('free');
    setCustomerInfo(null);
  }, []);

  const forceExpireTrial = useCallback(async () => {
    const pastIso = new Date(Date.now() - TRIAL_DURATION_MS - 60 * 1000).toISOString();
    await secureSet(SECURE_KEYS.trialStartAt, pastIso);
    await AsyncStorage.setItem(SUBSCRIPTION_OFFER_KEYS.trialStartISO, pastIso);
    const expiredState = buildTrialState(pastIso);
    setTrialState(expiredState);
    trialStateRef.current = expiredState;
    if (status !== 'premium') {
      setStatus('free');
    }
  }, [status]);

  const simulatePremiumActivation = useCallback(async () => {
    const packageId = 'dev_premium';
    const expiryDate = estimateNextBillingDate(packageId);
    await persistMockSubscription({
      packageId,
      identifier: packageId,
      expiryDate,
    });
    setStatus('premium');
    setCustomerInfo(buildCustomerInfoFromMock(packageId));
    await secureSet(SECURE_KEYS.subscriptionActive, 'true');
  }, [persistMockSubscription]);

  const shouldShowTrialOffer = useMemo(() => {
    return status !== 'premium' && !trialState.startedAt;
  }, [status, trialState.startedAt]);

  const shouldBlockPremium = useMemo(() => {
    return !canAccessPremiumFeatures() && !!trialState.startedAt && trialState.isExpired;
  }, [canAccessPremiumFeatures, trialState.isExpired, trialState.startedAt]);

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
      trialState,
      startTrial,
      hasSeenPaywall,
      markPaywallSeen,
      isFirstLaunch,
      canAccessPremiumFeatures,
      getFeatureAccess,
      shouldShowTrialOffer,
      shouldBlockPremium,
      cancelSubscriptionForDev,
      resetSubscriptionDebug,
      forceExpireTrial,
      simulatePremiumActivation,
      forceRefreshFromServer,
      fullResetForTesting,
    }),
    [
      cancelSubscriptionForDev,
      forceRefreshFromServer,
      fullResetForTesting,
      canAccessPremiumFeatures,
      checkSubscriptionStatus,
      customerInfo,
      forceExpireTrial,
      getFeatureAccess,
      hasSeenPaywall,
      isFirstLaunch,
      isInitialized,
      isPurchasing,
      isRestoring,
      markPaywallSeen,
      packages,
      purchasePackage,
      resetSubscriptionDebug,
      restorePurchases,
      shouldBlockPremium,
      shouldShowTrialOffer,
      simulatePremiumActivation,
      startTrial,
      status,
      trialState,
    ],
  );

  return value;
});
