import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type {
  CustomerInfo,
  PurchasesOfferings,
  PurchasesPackage,
} from 'react-native-purchases';

type PurchasesModule = any;

const API_KEYS = {
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '',
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '',
};

const isExpoGoRuntime = Constants?.appOwnership === 'expo';
const canUseNativeRevenueCat = Platform.OS !== 'web' && !isExpoGoRuntime;

let hasLoggedNativeDisable = false;
const logNativeDisabled = (reason: string) => {
  if (hasLoggedNativeDisable) {
    return;
  }
  hasLoggedNativeDisable = true;
  console.info(`[RevenueCat] Native SDK disabled: ${reason}`);
};

let moduleRef: PurchasesModule | null = null;
let initializationPromise: Promise<PurchasesModule | null> | null = null;

const loadModule = async (): Promise<PurchasesModule | null> => {
  if (Platform.OS === 'web') {
    logNativeDisabled('web platform is not supported');
    return null;
  }

  if (!canUseNativeRevenueCat) {
    logNativeDisabled('Expo Go runtime does not expose native store APIs');
    return null;
  }

  if (moduleRef) {
    return moduleRef;
  }

  try {
    const Purchases = require('react-native-purchases').default || require('react-native-purchases');
    moduleRef = Purchases as PurchasesModule;
    return moduleRef;
  } catch (error) {
    console.error('[RevenueCat] Failed to import react-native-purchases', error);
    moduleRef = null;
    return null;
  }
};

const getApiKey = () => {
  if (Platform.OS === 'ios') {
    return API_KEYS.ios;
  }

  if (Platform.OS === 'android') {
    return API_KEYS.android;
  }

  return '';
};

export const initializeSubscriptionFlow = async (): Promise<PurchasesModule | null> => {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    if (Platform.OS === 'web' || !canUseNativeRevenueCat) {
      logNativeDisabled(
        Platform.OS === 'web'
          ? 'web platform is not supported'
          : 'Expo Go runtime does not expose native store APIs',
      );
      return null;
    }

    const module = await loadModule();
    if (!module) {
      return null;
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      console.warn('[RevenueCat] Missing API key for current platform');
      return null;
    }

    try {
      if (__DEV__ && module?.setLogLevel) {
        await module.setLogLevel(module.LOG_LEVEL.DEBUG);
      }
      if (module?.configure) {
        await module.configure({ apiKey });
      }
      return module;
    } catch (error) {
      console.error('[RevenueCat] configure failed', error);
      return null;
    }
  })();

  return initializationPromise;
};

export const getPurchasesModule = () => moduleRef;

export const fetchOfferings = async (): Promise<PurchasesOfferings | null> => {
  const module = await initializeSubscriptionFlow();
  if (!module) {
    return null;
  }

  try {
    return await module.getOfferings();
  } catch (error) {
    console.error('[RevenueCat] getOfferings failed', error);
    return null;
  }
};

export const fetchCustomerInfo = async (): Promise<CustomerInfo | null> => {
  const module = await initializeSubscriptionFlow();
  if (!module) {
    return null;
  }

  try {
    return await module.getCustomerInfo();
  } catch (error) {
    console.error('[RevenueCat] getCustomerInfo failed', error);
    return null;
  }
};

export const purchasePackageByIdentifier = async (
  identifier: string,
): Promise<{ info: CustomerInfo; purchasedPackage: PurchasesPackage } | null> => {
  const module = await initializeSubscriptionFlow();
  if (!module) {
    return null;
  }

  try {
    const offerings = await module.getOfferings();
    const available = offerings.current?.availablePackages.find(
      (pkg: PurchasesPackage) => pkg.identifier === identifier,
    );

    if (!available) {
      console.warn('[RevenueCat] Package not found in offerings', identifier);
      return null;
    }

    const result = await module.purchasePackage(available);
    return { info: result.customerInfo, purchasedPackage: available };
  } catch (error) {
    console.error('[RevenueCat] purchasePackage failed', error);
    throw error;
  }
};

export const restorePurchasesFromRevenueCat = async (): Promise<CustomerInfo | null> => {
  const module = await initializeSubscriptionFlow();
  if (!module) {
    return null;
  }

  try {
    return await module.restorePurchases();
  } catch (error) {
    console.error('[RevenueCat] restorePurchases failed', error);
    throw error;
  }
};
