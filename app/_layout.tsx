import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, Component, ReactNode, useState, useCallback } from "react";
import { StyleSheet, Text, View, LogBox, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { clearAllStorageIfCorrupted } from '@/utils/storage-helper';
import { GoalProvider } from '@/hooks/use-goal-store';
import { AuthProvider } from '@/hooks/use-auth-store';
import { TimerProvider } from '@/hooks/use-timer-store';
import { ChatProvider } from '@/hooks/use-chat-store';
import { ManifestationProvider } from '@/hooks/use-manifestation-store';
import { FirstTimeSetupProvider } from '@/hooks/use-first-time-setup';
import { SubscriptionProvider } from '@/hooks/use-subscription-store';
import { trpc, trpcReactClient } from '@/lib/trpc';
import Purchases from 'react-native-purchases';

import { GlobalSubscriptionGate } from '@/components/GlobalSubscriptionGate';
import { useAppBackgroundInit } from '@/hooks/use-app-background-init';

// Error Boundary to catch inspector and other development errors
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error info:', errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.title}>Что-то пошло не так</Text>
          <Text style={errorStyles.message}>
            Перезапустите приложение
          </Text>
          <Text style={errorStyles.errorDetail}>
            {this.state.error.message}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

SplashScreen.preventAutoHideAsync().catch(err => {
  console.error('Failed to prevent auto hide splash:', err);
});

LogBox.ignoreLogs([
  'source.uri should not be an empty string',
  'Require cycle',
  'new NativeEventEmitter',
  'ViewPropTypes',
]);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

function RootLayoutNav() {
  useAppBackgroundInit();
  
  return (
    <Stack 
      screenOptions={{ 
        headerBackTitle: "Back",
        animation: 'fade',
        animationDuration: 200,
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          headerShown: false,
          animation: 'none'
        }} 
      />
      <Stack.Screen 
        name="(tabs)" 
        options={{ 
          headerShown: false,
          animation: 'fade'
        }} 
      />
      <Stack.Screen 
        name="onboarding" 
        options={{ 
          headerShown: false, 
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom'
        }} 
      />
      <Stack.Screen 
        name="goal-creation" 
        options={{ 
          headerShown: false, 
          presentation: 'modal',
          animation: 'slide_from_bottom'
        }} 
      />
      <Stack.Screen 
        name="auth" 
        options={{ 
          headerShown: false,
          presentation: 'fullScreenModal',
          animation: 'fade'
        }} 
      />
      <Stack.Screen 
        name="chat" 
        options={{ 
          headerShown: false,
          presentation: 'modal',
          animation: 'slide_from_bottom'
        }} 
      />
      <Stack.Screen 
        name="breathing" 
        options={{ 
          headerShown: false,
          presentation: 'modal',
          animation: 'slide_from_bottom'
        }} 
      />
      <Stack.Screen 
        name="breathing/[id]" 
        options={{ 
          headerShown: false,
          presentation: 'modal',
          animation: 'slide_from_bottom'
        }} 
      />
      <Stack.Screen 
        name="manifestation" 
        options={{ 
          headerShown: false,
          presentation: 'modal',
          animation: 'slide_from_bottom'
        }} 
      />
      <Stack.Screen 
        name="notifications" 
        options={{ 
          headerShown: true,
          presentation: 'modal',
          animation: 'slide_from_bottom'
        }} 
      />
      <Stack.Screen 
        name="month-overview" 
        options={{ 
          headerShown: false,
          presentation: 'modal',
          animation: 'slide_from_bottom'
        }} 
      />
      <Stack.Screen 
        name="first-time-setup" 
        options={{ 
          headerShown: false,
          presentation: 'fullScreenModal',
          animation: 'fade'
        }} 
      />
      <Stack.Screen 
        name="subscription" 
        options={{ 
          headerShown: false,
          presentation: 'modal',
          animation: 'slide_from_bottom'
        }} 
      />
      <Stack.Screen 
        name="subscription-success" 
        options={{ 
          headerShown: false,
          presentation: 'fullScreenModal',
          animation: 'fade'
        }} 
      />
      <Stack.Screen 
        name="dev-subscription-tools" 
        options={{ 
          headerShown: true,
          title: 'Developer Tools',
          presentation: 'modal',
          animation: 'slide_from_bottom'
        }} 
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    const initRevenueCat = async () => {
      const isRealDevice = Platform.OS === 'ios' || Platform.OS === 'android';
      
      if (!isRealDevice) {
        console.log("📱 [_layout.tsx] Пропуск инициализации (не iOS/Android, Platform:", Platform.OS, ")");
        return;
      }
      
      const HARDCODED_IOS_KEY = 'appl_NIzzmGwASbGFsnfAddnshynSnsG';
      const apiKey = Platform.OS === 'ios' 
        ? HARDCODED_IOS_KEY
        : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
      
      console.log("\n==================== REVENUECAT INIT ====================");
      console.log("📱 [_layout.tsx] Платформа:", Platform.OS);
      console.log("📱 [_layout.tsx] Реальное устройство:", isRealDevice);
      console.log("📱 [_layout.tsx] API Key:", apiKey);
      console.log("========================================================\n");

      if (!apiKey) {
        console.error("❌ [_layout.tsx] API ключ не найден");
        return;
      }

      try {
        console.log("📱 [_layout.tsx] Включение VERBOSE логирования...");
        await Purchases.setLogLevel(Purchases.LOG_LEVEL.VERBOSE);
        
        console.log("📱 [_layout.tsx] Конфигурация RevenueCat...");
        await Purchases.configure({ apiKey });
        console.log("✅ [_layout.tsx] RevenueCat инициализирован!");
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log("📦 [_layout.tsx] Загрузка offerings...");
        const offerings = await Purchases.getOfferings();
        
        console.log("📦 [_layout.tsx] Offerings ответ:", JSON.stringify({
          hasCurrent: !!offerings.current,
          currentId: offerings.current?.identifier,
          allKeys: Object.keys(offerings.all),
          packagesCount: offerings.current?.availablePackages?.length || 0
        }, null, 2));
        
        if (offerings.current?.availablePackages) {
          offerings.current.availablePackages.forEach((pkg: any, idx: number) => {
            console.log(`\n📦 Пакет ${idx + 1}:`);
            console.log(`  identifier: ${pkg.identifier}`);
            console.log(`  product.identifier: ${pkg.product?.identifier}`);
            console.log(`  product.title: ${pkg.product?.title}`);
            console.log(`  product.priceString: ${pkg.product?.priceString}`);
            console.log(`  product.price: ${pkg.product?.price}`);
          });
        } else {
          console.error("❌ [_layout.tsx] НЕТ пакетов! Проверьте:");
          console.error("  1. Bundle ID совпадает в Xcode и RevenueCat");
          console.error("  2. Продукты 'Ready to Submit' в App Store Connect");
          console.error("  3. Продукты прикреплены к Offering в RevenueCat");
          console.error("  4. App Bundle ID в RevenueCat: app.personalized-ai-goal-coach");
        }
      } catch (e: any) {
        console.error("\n==================== REVENUECAT ERROR ====================");
        console.error("❌ Ошибка:", e.message);
        console.error("❌ Code:", e.code);
        console.error("❌ Stack:", e.stack);
        console.error("==========================================================\n");
      }
    };

    initRevenueCat().catch(err => {
      console.error("❌ [_layout.tsx] Uncaught init error:", err);
    });
  }, []);

  useEffect(() => {
    let isMounted = true;

    const prepareApp = async () => {
      try {
        console.log('[RootLayout] Preparing app for hydration');
        await clearAllStorageIfCorrupted();
      } catch (error) {
        console.error('[RootLayout] Preparation error:', error);
      } finally {
        if (isMounted) {
          setAppReady(true);
        }
      }
    };

    prepareApp();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLayout = useCallback(async () => {
    if (appReady) {
      try {
        await SplashScreen.hideAsync();
        console.log('[RootLayout] Splash screen hidden after layout');
      } catch (error) {
        console.error('[RootLayout] Failed to hide splash:', error);
      }
    }
  }, [appReady]);

  if (!appReady) {
    return null;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.container} onLayout={handleLayout}>
        <trpc.Provider client={trpcReactClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <SubscriptionProvider>
              <GlobalSubscriptionGate />
              <AuthProvider>
                <FirstTimeSetupProvider>
                  <GoalProvider>
                    <TimerProvider>
                      <ChatProvider>
                        <ManifestationProvider>
                          <RootLayoutNav />
                        </ManifestationProvider>
                      </ChatProvider>
                    </TimerProvider>
                  </GoalProvider>
                </FirstTimeSetupProvider>
              </AuthProvider>
            </SubscriptionProvider>
          </QueryClientProvider>
        </trpc.Provider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
    color: '#000',
  },
  message: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginBottom: 20,
  },
  errorDetail: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    paddingHorizontal: 20,
  },
});