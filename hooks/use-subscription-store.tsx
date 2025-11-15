import { useState, useEffect, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import Purchases, { PurchasesPackage, CustomerInfo as RCCustomerInfo } from 'react-native-purchases';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CustomerInfo, SubscriptionPackage, SubscriptionStatus } from '@/types/subscription';

const REVENUECAT_API_KEY = {
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '',
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '',
  web: process.env.EXPO_PUBLIC_REVENUECAT_WEB_KEY || '',
};

const WEB_MOCK_PACKAGES: SubscriptionPackage[] = [
  {
    identifier: 'monthly',
    product: {
      identifier: 'premium_monthly',
      title: 'Месячная подписка',
      description: 'Premium доступ на 1 месяц',
      price: 299,
      priceString: '299 ₽',
      currencyCode: 'RUB',
    },
  },
  {
    identifier: 'yearly',
    product: {
      identifier: 'premium_yearly',
      title: 'Годовая подписка',
      description: 'Premium доступ на 12 месяцев (выгода 40%)',
      price: 1990,
      priceString: '1 990 ₽',
      currencyCode: 'RUB',
    },
  },
];

const SUBSCRIPTION_STORAGE_KEY = '@subscription_status';

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
        console.log('Web platform: using mock subscription system');
        
        try {
          const stored = await AsyncStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
          if (stored) {
            const data = JSON.parse(stored);
            
            if (data.expiryDate && new Date(data.expiryDate) > new Date()) {
              setStatus('premium');
              setCustomerInfo({
                activeSubscriptions: [data.packageId],
                allPurchasedProductIdentifiers: [data.packageId],
                entitlements: {
                  active: {
                    premium: {
                      identifier: 'premium',
                      productIdentifier: data.packageId,
                      isActive: true,
                    },
                  },
                },
              });
            } else {
              setStatus('free');
              await AsyncStorage.removeItem(SUBSCRIPTION_STORAGE_KEY);
            }
          } else {
            setStatus('free');
          }
        } catch (error) {
          console.error('Failed to load web subscription status:', error);
          setStatus('free');
        }
        
        setPackages(WEB_MOCK_PACKAGES);
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
      console.log('Web purchase:', packageIdentifier);
      
      setIsPurchasing(true);
      
      try {
        const pkg = packages.find(p => p.identifier === packageIdentifier);
        
        if (!pkg) {
          Alert.alert('Ошибка', 'Пакет не найден');
          return false;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        let expiryDate = new Date();
        if (packageIdentifier === 'monthly') {
          expiryDate.setMonth(expiryDate.getMonth() + 1);
        } else if (packageIdentifier === 'yearly') {
          expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        }
        
        const subscriptionData = {
          packageId: pkg.product.identifier,
          identifier: packageIdentifier,
          purchaseDate: new Date().toISOString(),
          expiryDate: expiryDate.toISOString(),
        };
        
        await AsyncStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(subscriptionData));
        
        setStatus('premium');
        setCustomerInfo({
          activeSubscriptions: [pkg.product.identifier],
          allPurchasedProductIdentifiers: [pkg.product.identifier],
          entitlements: {
            active: {
              premium: {
                identifier: 'premium',
                productIdentifier: pkg.product.identifier,
                isActive: true,
              },
            },
          },
        });
        
        console.log('Web purchase successful');
        return true;
      } catch (error) {
        console.error('Web purchase failed:', error);
        Alert.alert('Ошибка', 'Не удалось оформить подписку');
        return false;
      } finally {
        setIsPurchasing(false);
      }
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
      console.log('Web restore purchases');
      
      setIsRestoring(true);
      
      try {
        const stored = await AsyncStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
        
        if (!stored) {
          return false;
        }
        
        const data = JSON.parse(stored);
        
        if (data.expiryDate && new Date(data.expiryDate) > new Date()) {
          setStatus('premium');
          setCustomerInfo({
            activeSubscriptions: [data.packageId],
            allPurchasedProductIdentifiers: [data.packageId],
            entitlements: {
              active: {
                premium: {
                  identifier: 'premium',
                  productIdentifier: data.packageId,
                  isActive: true,
                },
              },
            },
          });
          return true;
        } else {
          await AsyncStorage.removeItem(SUBSCRIPTION_STORAGE_KEY);
          setStatus('free');
          return false;
        }
      } catch (error) {
        console.error('Web restore failed:', error);
        return false;
      } finally {
        setIsRestoring(false);
      }
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
