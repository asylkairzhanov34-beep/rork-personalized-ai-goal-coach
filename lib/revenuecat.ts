import { Platform } from 'react-native';
import Constants from 'expo-constants';

// ============================================
// ТИПЫ
// ============================================

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

// ============================================
// ОПРЕДЕЛЕНИЕ СРЕДЫ
// ============================================

const isRorkSandbox = (): boolean => {
  if (typeof window !== 'undefined' && typeof window.location !== 'undefined') {
    const hostname = window.location.hostname || '';
    return hostname.includes('e2b.app') || hostname.includes('rork');
  }
  return false;
};

const isExpoGoRuntime = Constants?.appOwnership === 'expo';
const isWeb = Platform.OS === 'web';

const canUseNativePurchases = (): boolean => {
  if (isRorkSandbox()) return false;
  if (isWeb) return false;
  if (isExpoGoRuntime) return false;
  return Platform.OS === 'ios' || Platform.OS === 'android';
};

// ============================================
// API КЛЮЧИ
// ============================================

const HARDCODED_IOS_KEY = 'appl_NIzzmGwASbGFsnfAddnshynSnsG';

const API_KEYS = {
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || HARDCODED_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '',
};

const getApiKey = (): string => {
  if (Platform.OS === 'ios') return API_KEYS.ios;
  if (Platform.OS === 'android') return API_KEYS.android;
  return '';
};

// ============================================
// СОСТОЯНИЕ МОДУЛЯ
// ============================================

let moduleRef: PurchasesModule | null = null;
let isConfigured = false;
let cachedOriginalPackages: any[] = [];

// ============================================
// ЗАГРУЗКА МОДУЛЯ
// ============================================

const loadPurchasesModule = (): PurchasesModule | null => {
  if (moduleRef) return moduleRef;
  
  // В Rork/Web/Expo Go - модуль недоступен
  if (!canUseNativePurchases()) {
    return null;
  }
  
  try {
    const RNPurchases = require('react-native-purchases');
    moduleRef = RNPurchases.default ?? RNPurchases;
    console.log('[RevenueCat] ✅ Native module loaded');
    return moduleRef;
  } catch (error) {
    console.error('[RevenueCat] ❌ Failed to load module:', error);
    return null;
  }
};

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================

export const initializeRevenueCat = async (): Promise<boolean> => {
  // Проверяем среду
  if (isRorkSandbox()) {
    console.log('[RevenueCat] ℹ️ Rork Sandbox - purchases available only on real device via TestFlight');
    return false;
  }
  
  if (isWeb) {
    console.log('[RevenueCat] ℹ️ Web platform - purchases not supported');
    return false;
  }
  
  if (isExpoGoRuntime) {
    console.log('[RevenueCat] ℹ️ Expo Go - use TestFlight for purchases');
    return false;
  }
  
  if (isConfigured) {
    console.log('[RevenueCat] Already configured');
    return true;
  }
  
  const module = loadPurchasesModule();
  if (!module) {
    console.error('[RevenueCat] ❌ Module not available');
    return false;
  }
  
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error('[RevenueCat] ❌ No API key for:', Platform.OS);
    return false;
  }
  
  try {
    console.log('[RevenueCat] Configuring for', Platform.OS, '...');
    
    // Debug логи для отладки
    if (__DEV__ && module.LOG_LEVEL) {
      await module.setLogLevel(module.LOG_LEVEL.DEBUG);
    }
    
    await module.configure({ apiKey });
    isConfigured = true;
    console.log('[RevenueCat] ✅ Configured successfully');
    return true;
  } catch (error) {
    console.error('[RevenueCat] ❌ Configuration failed:', error);
    return false;
  }
};

// ============================================
// ПРОВЕРКА ДОСТУПНОСТИ
// ============================================

export const isRevenueCatAvailable = (): boolean => {
  return canUseNativePurchases() && isConfigured;
};

export const isInSandboxEnvironment = (): boolean => {
  return isRorkSandbox() || isWeb || isExpoGoRuntime;
};

// ============================================
// ПОЛУЧЕНИЕ OFFERINGS (реальные цены из App Store)
// ============================================

export const getOfferings = async (): Promise<RevenueCatOfferings | null> => {
  // В sandbox средах - возвращаем null
  if (!canUseNativePurchases()) {
    console.log('[RevenueCat] ℹ️ Cannot fetch offerings - not on real device');
    return null;
  }
  
  const module = loadPurchasesModule();
  if (!module || !isConfigured) {
    console.error('[RevenueCat] ❌ getOfferings - not initialized');
    return null;
  }
  
  try {
    console.log('[RevenueCat] 📦 Fetching offerings from App Store...');
    const offerings = await module.getOfferings();
    
    if (!offerings?.current) {
      console.warn('[RevenueCat] ⚠️ No current offering');
      console.warn('[RevenueCat] → Check RevenueCat Dashboard → Offerings → Set as Current');
      return null;
    }
    
    console.log('[RevenueCat] ✅ Offerings loaded:', offerings.current.identifier);
    
    // Логируем реальные цены из App Store
    offerings.current.availablePackages?.forEach((pkg, i) => {
      console.log(`[RevenueCat] Package ${i + 1}: ${pkg.product.identifier} - ${pkg.product.priceString}`);
    });
    
    // Кэшируем для покупки
    cachedOriginalPackages = offerings.current.availablePackages || [];
    
    return offerings;
  } catch (error) {
    console.error('[RevenueCat] ❌ getOfferings failed:', error);
    return null;
  }
};

// ============================================
// ИНФОРМАЦИЯ О ПОЛЬЗОВАТЕЛЕ
// ============================================

export const getCustomerInfo = async (): Promise<RevenueCatCustomerInfo | null> => {
  if (!canUseNativePurchases()) {
    return null;
  }
  
  const module = loadPurchasesModule();
  if (!module || !isConfigured) {
    return null;
  }
  
  try {
    const info = await module.getCustomerInfo();
    console.log('[RevenueCat] 👤 Customer info:', {
      activeSubscriptions: info.activeSubscriptions,
      entitlements: Object.keys(info.entitlements?.active || {}),
    });
    return info;
  } catch (error) {
    console.error('[RevenueCat] ❌ getCustomerInfo failed:', error);
    return null;
  }
};

// ============================================
// ПОКУПКА (реальная через Apple Sandbox)
// ============================================

export const purchasePackage = async (
  pkg: RevenueCatPackage | any
): Promise<{ customerInfo: RevenueCatCustomerInfo } | null> => {
  if (!canUseNativePurchases()) {
    throw new Error('Purchases only available on real device via TestFlight');
  }
  
  const module = loadPurchasesModule();
  if (!module || !isConfigured) {
    throw new Error('RevenueCat not initialized');
  }
  
  try {
    console.log('[RevenueCat] 🛒 Starting purchase:', pkg.identifier);
    console.log('[RevenueCat] Product:', pkg.product?.identifier);
    console.log('[RevenueCat] Price:', pkg.product?.priceString);
    
    const result = await module.purchasePackage(pkg);
    
    console.log('[RevenueCat] ✅ Purchase successful!');
    console.log('[RevenueCat] Active subscriptions:', result.customerInfo.activeSubscriptions);
    console.log('[RevenueCat] Entitlements:', Object.keys(result.customerInfo.entitlements?.active || {}));
    
    return result;
  } catch (error: any) {
    if (error?.userCancelled) {
      console.log('[RevenueCat] ℹ️ User cancelled purchase');
      throw { userCancelled: true };
    }
    
    console.error('[RevenueCat] ❌ Purchase failed');
    console.error('[RevenueCat] Error code:', error?.code);
    console.error('[RevenueCat] Error message:', error?.message);
    console.error('[RevenueCat] Underlying error:', error?.underlyingErrorMessage);
    
    throw error;
  }
};

// ============================================
// ПОКУПКА ПО ИДЕНТИФИКАТОРУ
// ============================================

export const purchasePackageByIdentifier = async (
  identifier: string
): Promise<{ info: RevenueCatCustomerInfo; purchasedPackage: RevenueCatPackage } | null> => {
  console.log('[RevenueCat] 🛒 purchasePackageByIdentifier:', identifier);
  
  // Ищем пакет в кэше
  let pkg = cachedOriginalPackages.find(
    (p) => p.identifier === identifier || p.product?.identifier === identifier
  );
  
  // Если не найден - загружаем свежие offerings
  if (!pkg) {
    console.log('[RevenueCat] Package not cached, fetching...');
    const offerings = await getOfferings();
    
    if (!offerings?.current?.availablePackages) {
      throw new Error('No offerings available');
    }
    
    pkg = cachedOriginalPackages.find(
      (p) => p.identifier === identifier || p.product?.identifier === identifier
    );
  }
  
  if (!pkg) {
    const available = cachedOriginalPackages.map(p => p.identifier).join(', ');
    throw new Error(`Package "${identifier}" not found. Available: ${available}`);
  }
  
  console.log('[RevenueCat] ✅ Found package:', pkg.identifier, '-', pkg.product?.priceString);
  
  const result = await purchasePackage(pkg);
  if (!result) return null;
  
  return { 
    info: result.customerInfo, 
    purchasedPackage: {
      identifier: pkg.identifier,
      product: {
        identifier: pkg.product?.identifier,
        title: pkg.product?.title,
        description: pkg.product?.description,
        price: pkg.product?.price,
        priceString: pkg.product?.priceString,
        currencyCode: pkg.product?.currencyCode,
      }
    }
  };
};

// ============================================
// ВОССТАНОВЛЕНИЕ ПОКУПОК
// ============================================

export const restorePurchases = async (): Promise<RevenueCatCustomerInfo | null> => {
  if (!canUseNativePurchases()) {
    throw new Error('Restore only available on real device');
  }
  
  const module = loadPurchasesModule();
  if (!module || !isConfigured) {
    throw new Error('RevenueCat not initialized');
  }
  
  try {
    console.log('[RevenueCat] 🔄 Restoring purchases...');
    const info = await module.restorePurchases();
    console.log('[RevenueCat] ✅ Restore complete');
    console.log('[RevenueCat] Active subscriptions:', info.activeSubscriptions);
    return info;
  } catch (error) {
    console.error('[RevenueCat] ❌ Restore failed:', error);
    throw error;
  }
};

// ============================================
// СИНХРОНИЗАЦИЯ
// ============================================

export const syncWithRevenueCat = async (): Promise<RevenueCatCustomerInfo | null> => {
  return getCustomerInfo();
};

export const invalidateCustomerInfoCache = async (): Promise<void> => {
  if (!canUseNativePurchases()) return;
  
  const module = loadPurchasesModule();
  if (!module || !isConfigured) return;
  
  try {
    if (typeof (module as any).invalidateCustomerInfoCache === 'function') {
      await (module as any).invalidateCustomerInfoCache();
      console.log('[RevenueCat] Cache invalidated');
    }
  } catch (error) {
    console.error('[RevenueCat] Cache invalidation failed:', error);
  }
};

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

export const getOriginalPackages = (): any[] => cachedOriginalPackages;

export const getOfferingsWithCache = getOfferings;

// ============================================
// LEGACY EXPORTS
// ============================================

export const initializeSubscriptionFlow = initializeRevenueCat;
export const fetchOfferings = getOfferings;
export const fetchCustomerInfo = getCustomerInfo;
export const restorePurchasesFromRevenueCat = restorePurchases;
