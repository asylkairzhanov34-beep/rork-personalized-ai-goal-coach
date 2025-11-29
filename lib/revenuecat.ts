import { Platform } from 'react-native';
import Constants from 'expo-constants';

export interface RevenueCatCustomerInfo {
  activeSubscriptions: string[];
  allPurchasedProductIdentifiers: string[];
  entitlements: {
    active: Record<string, {
      identifier: string;
      productIdentifier: string;
      isActive: boolean;
    }>;
  };
}

export interface RevenueCatProduct {
  identifier: string;
  title: string;
  description: string;
  price: number;
  priceString: string;
  currencyCode: string;
}

export interface RevenueCatPackage {
  identifier: string;
  product: RevenueCatProduct;
}

export interface RevenueCatOfferings {
  current: {
    identifier: string;
    availablePackages: RevenueCatPackage[];
  } | null;
  all: Record<string, unknown>;
}

type PurchasesModule = {
  configure: (config: { apiKey: string }) => Promise<void>;
  setLogLevel: (level: unknown) => Promise<void>;
  LOG_LEVEL: { DEBUG: unknown; VERBOSE: unknown };
  getOfferings: () => Promise<RevenueCatOfferings>;
  getCustomerInfo: () => Promise<RevenueCatCustomerInfo>;
  purchasePackage: (pkg: RevenueCatPackage) => Promise<{ customerInfo: RevenueCatCustomerInfo }>;
  restorePurchases: () => Promise<RevenueCatCustomerInfo>;
};

const API_KEYS = {
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '',
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '',
};

const isExpoGoRuntime = Constants?.appOwnership === 'expo';
const canUseNativeRevenueCat = Platform.OS !== 'web' && !isExpoGoRuntime;

let hasLoggedStatus = false;
const logStatus = (message: string) => {
  if (hasLoggedStatus) return;
  hasLoggedStatus = true;
  console.log(`[RevenueCat] ${message}`);
};

let moduleRef: PurchasesModule | null = null;
let isConfigured = false;

const getApiKey = (): string => {
  if (Platform.OS === 'ios') return API_KEYS.ios;
  if (Platform.OS === 'android') return API_KEYS.android;
  return '';
};

const loadPurchasesModule = (): PurchasesModule | null => {
  if (moduleRef) return moduleRef;
  
  if (Platform.OS === 'web') {
    logStatus('Web platform - using mock mode');
    return null;
  }
  
  if (!canUseNativeRevenueCat) {
    logStatus('Expo Go detected - using mock mode (RevenueCat requires development build)');
    return null;
  }
  
  try {
    const RNPurchases = require('react-native-purchases');
    moduleRef = RNPurchases.default ?? RNPurchases;
    console.log('[RevenueCat] Module loaded successfully');
    return moduleRef;
  } catch (error) {
    console.log('[RevenueCat] Module not available - using mock mode');
    return null;
  }
};

export const initializeRevenueCat = async (): Promise<boolean> => {
  if (isConfigured) {
    console.log('[RevenueCat] Already configured');
    return true;
  }
  
  const module = loadPurchasesModule();
  if (!module) {
    return false;
  }
  
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('[RevenueCat] No API key for platform:', Platform.OS);
    return false;
  }
  
  try {
    console.log('[RevenueCat] Configuring with API key...');
    
    if (__DEV__ && module.LOG_LEVEL) {
      await module.setLogLevel(module.LOG_LEVEL.DEBUG);
    }
    
    await module.configure({ apiKey });
    isConfigured = true;
    console.log('[RevenueCat] Configuration successful');
    return true;
  } catch (error) {
    console.error('[RevenueCat] Configuration failed:', error);
    return false;
  }
};

export const isRevenueCatAvailable = (): boolean => {
  return canUseNativeRevenueCat && !!loadPurchasesModule();
};

export const getOfferings = async (): Promise<RevenueCatOfferings | null> => {
  const module = loadPurchasesModule();
  if (!module || !isConfigured) {
    console.error('[RevenueCat] ❌ getOfferings - module not ready');
    return null;
  }
  
  try {
    console.log('[RevenueCat] 📦 Fetching offerings...');
    const offerings = await module.getOfferings();
    
    if (!offerings?.current) {
      console.warn('[RevenueCat] ⚠️ No current offering available');
      console.warn('[RevenueCat] Check RevenueCat Dashboard → Offerings');
      return null;
    }
    
    console.log('[RevenueCat] ✅ Offerings fetched');
    console.log('[RevenueCat] Current offering:', offerings.current.identifier);
    console.log('[RevenueCat] Available packages:', offerings.current.availablePackages?.length ?? 0);
    
    offerings.current.availablePackages?.forEach((pkg: RevenueCatPackage, index: number) => {
      console.log(`[RevenueCat] Package ${index + 1}:`, pkg.product.identifier, '-', pkg.product.priceString);
    });
    
    return offerings;
  } catch (error) {
    console.error('[RevenueCat] ❌ getOfferings failed:', error);
    return null;
  }
};

export const getCustomerInfo = async (): Promise<RevenueCatCustomerInfo | null> => {
  const module = loadPurchasesModule();
  if (!module || !isConfigured) {
    console.log('[RevenueCat] getCustomerInfo - module not ready');
    return null;
  }
  
  try {
    const info = await module.getCustomerInfo();
    console.log('[RevenueCat] Customer info fetched, active subs:', info?.activeSubscriptions?.length ?? 0);
    return info;
  } catch (error) {
    console.error('[RevenueCat] getCustomerInfo failed:', error);
    return null;
  }
};

export const purchasePackage = async (
  pkg: RevenueCatPackage
): Promise<{ customerInfo: RevenueCatCustomerInfo } | null> => {
  const module = loadPurchasesModule();
  if (!module || !isConfigured) {
    console.error('[RevenueCat] ❌ purchasePackage - module not ready');
    console.error('[RevenueCat] Module loaded:', !!module);
    console.error('[RevenueCat] Configured:', isConfigured);
    return null;
  }
  
  try {
    console.log('[RevenueCat] 🛒 Initiating purchase...');
    console.log('[RevenueCat] Package ID:', pkg.identifier);
    console.log('[RevenueCat] Product ID:', pkg.product.identifier);
    console.log('[RevenueCat] Price:', pkg.product.priceString);
    
    const result = await module.purchasePackage(pkg);
    
    console.log('[RevenueCat] ✅ Purchase successful!');
    console.log('[RevenueCat] Active subscriptions:', result.customerInfo.activeSubscriptions?.length ?? 0);
    console.log('[RevenueCat] Active entitlements:', Object.keys(result.customerInfo.entitlements?.active ?? {}).join(', '));
    
    return result;
  } catch (error: any) {
    if (error?.userCancelled) {
      console.log('[RevenueCat] ℹ️ Purchase cancelled by user');
      throw { userCancelled: true };
    }
    
    console.error('[RevenueCat] ❌ Purchase failed');
    console.error('[RevenueCat] Error code:', error?.code);
    console.error('[RevenueCat] Error message:', error?.message);
    console.error('[RevenueCat] Full error:', JSON.stringify(error, null, 2));
    
    throw error;
  }
};

export const restorePurchases = async (): Promise<RevenueCatCustomerInfo | null> => {
  const module = loadPurchasesModule();
  if (!module || !isConfigured) {
    console.log('[RevenueCat] restorePurchases - module not ready');
    return null;
  }
  
  try {
    console.log('[RevenueCat] Restoring purchases...');
    const info = await module.restorePurchases();
    console.log('[RevenueCat] Restore successful, active subs:', info?.activeSubscriptions?.length ?? 0);
    return info;
  } catch (error) {
    console.error('[RevenueCat] Restore failed:', error);
    throw error;
  }
};

// Legacy exports for compatibility
export const initializeSubscriptionFlow = initializeRevenueCat;
export const fetchOfferings = getOfferings;
export const fetchCustomerInfo = getCustomerInfo;
export const purchasePackageByIdentifier = async (
  identifier: string
): Promise<{ info: RevenueCatCustomerInfo; purchasedPackage: RevenueCatPackage } | null> => {
  const offerings = await getOfferings();
  if (!offerings?.current?.availablePackages) {
    console.warn('[RevenueCat] No offerings available');
    return null;
  }
  
  const pkg = offerings.current.availablePackages.find(p => p.identifier === identifier);
  if (!pkg) {
    console.warn('[RevenueCat] Package not found:', identifier);
    return null;
  }
  
  const result = await purchasePackage(pkg);
  if (!result) return null;
  
  return { info: result.customerInfo, purchasedPackage: pkg };
};
export const restorePurchasesFromRevenueCat = restorePurchases;

export const syncWithRevenueCat = async (): Promise<RevenueCatCustomerInfo | null> => {
  const module = loadPurchasesModule();
  if (!module || !isConfigured) {
    console.log('[RevenueCat] syncWithRevenueCat - module not ready');
    return null;
  }
  
  try {
    console.log('[RevenueCat] Force syncing customer info from server...');
    const info = await module.getCustomerInfo();
    console.log('[RevenueCat] Sync complete, active entitlements:', Object.keys(info?.entitlements?.active ?? {}));
    return info;
  } catch (error) {
    console.error('[RevenueCat] Sync failed:', error);
    return null;
  }
};

export const invalidateCustomerInfoCache = async (): Promise<void> => {
  const module = loadPurchasesModule();
  if (!module || !isConfigured) {
    console.log('[RevenueCat] invalidateCustomerInfoCache - module not ready');
    return;
  }
  
  try {
    if (typeof (module as any).invalidateCustomerInfoCache === 'function') {
      await (module as any).invalidateCustomerInfoCache();
      console.log('[RevenueCat] Customer info cache invalidated');
    } else {
      console.log('[RevenueCat] invalidateCustomerInfoCache not available, fetching fresh info');
      await module.getCustomerInfo();
    }
  } catch (error) {
    console.error('[RevenueCat] Cache invalidation failed:', error);
  }
};
