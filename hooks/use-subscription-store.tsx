import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import Purchases, { PurchasesPackage, CustomerInfo as RCCustomerInfo } from 'react-native-purchases';
import createContextHook from '@nkzw/create-context-hook';
import { CustomerInfo, SubscriptionPackage, SubscriptionStatus } from '@/types/subscription';

const REVENUECAT_API_KEY = {
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '',
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '',
  web: process.env.EXPO_PUBLIC_REVENUECAT_WEB_KEY || '',
};

export const [SubscriptionProvider, useSubscription] = createContextHook(() => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [status, setStatus] = useState<SubscriptionStatus>('loading');
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    const initializePurchases = async () => {
      if (Platform.OS === 'web') {
        console.log('RevenueCat not supported on web');
        setStatus('free');
        setIsInitialized(true);
        return;
      }

      try {
        console.log('Initializing RevenueCat...');
        
        let apiKey = Platform.OS === 'ios' 
          ? REVENUECAT_API_KEY.ios 
          : REVENUECAT_API_KEY.android;

        if (!apiKey && REVENUECAT_API_KEY.web) {
          console.log('Using RevenueCat Web Billing API key for testing');
          apiKey = REVENUECAT_API_KEY.web;
        }

        if (!apiKey) {
          throw new Error('No RevenueCat API key found. Please add EXPO_PUBLIC_REVENUECAT_WEB_KEY to your .env file.');
        }

        await Purchases.configure({ apiKey });
        console.log('RevenueCat configured successfully');

        const info = await Purchases.getCustomerInfo();
        updateCustomerInfo(info);

        await loadOfferings();

        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize RevenueCat:', error);
        setStatus('free');
        setIsInitialized(true);
      }
    };

    initializePurchases();
  }, []);

  const updateCustomerInfo = (info: RCCustomerInfo) => {
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
  };

  const loadOfferings = async () => {
    try {
      const offerings = await Purchases.getOfferings();
      
      if (offerings.current && offerings.current.availablePackages.length > 0) {
        const formattedPackages: SubscriptionPackage[] = offerings.current.availablePackages.map(
          (pkg: PurchasesPackage) => ({
            identifier: pkg.identifier,
            product: {
              identifier: pkg.product.identifier,
              title: pkg.product.title,
              description: pkg.product.description,
              price: pkg.product.price,
              priceString: pkg.product.priceString,
              currencyCode: pkg.product.currencyCode,
            },
          })
        );

        setPackages(formattedPackages);
        console.log(`Loaded ${formattedPackages.length} subscription packages`);
      } else {
        console.log('No offerings available');
      }
    } catch (error) {
      console.error('Failed to load offerings:', error);
    }
  };

  const purchasePackage = async (packageIdentifier: string): Promise<boolean> => {
    if (Platform.OS === 'web') {
      console.log('Purchases not supported on web');
      return false;
    }

    setIsPurchasing(true);

    try {
      const pkg = packages.find(p => p.identifier === packageIdentifier);
      
      if (!pkg) {
        console.error('Package not found:', packageIdentifier);
        return false;
      }

      const offerings = await Purchases.getOfferings();
      const purchasePackage = offerings.current?.availablePackages.find(
        p => p.identifier === packageIdentifier
      );

      if (!purchasePackage) {
        console.error('Purchase package not found');
        return false;
      }

      console.log('Starting purchase for package:', packageIdentifier);
      const { customerInfo: info } = await Purchases.purchasePackage(purchasePackage);
      
      updateCustomerInfo(info);
      console.log('Purchase successful');
      
      return true;
    } catch (error: any) {
      if (error.userCancelled) {
        console.log('Purchase cancelled by user');
      } else {
        console.error('Purchase failed:', error);
      }
      return false;
    } finally {
      setIsPurchasing(false);
    }
  };

  const restorePurchases = async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      console.log('Restore not supported on web');
      return false;
    }

    setIsRestoring(true);

    try {
      console.log('Restoring purchases...');
      const info = await Purchases.restorePurchases();
      
      updateCustomerInfo(info);
      console.log('Purchases restored successfully');
      
      return Object.keys(info.entitlements.active).length > 0;
    } catch (error) {
      console.error('Failed to restore purchases:', error);
      return false;
    } finally {
      setIsRestoring(false);
    }
  };

  const checkSubscriptionStatus = useCallback(async () => {
    if (Platform.OS === 'web') return;

    try {
      const info = await Purchases.getCustomerInfo();
      updateCustomerInfo(info);
    } catch (error) {
      console.error('Failed to check subscription status:', error);
    }
  }, []);

  const isPremium = status === 'premium';

  return {
    isInitialized,
    status,
    packages,
    customerInfo,
    isPurchasing,
    isRestoring,
    isPremium,
    purchasePackage,
    restorePurchases,
    checkSubscriptionStatus,
  };
});
