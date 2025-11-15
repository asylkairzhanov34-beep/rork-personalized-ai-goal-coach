import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, Component, ReactNode } from "react";
import { StyleSheet, Text, View, LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { clearAllStorageIfCorrupted } from '@/utils/storage-helper';
import { GoalProvider } from '@/hooks/use-goal-store';
import { AuthProvider } from '@/hooks/use-auth-store';
import { TimerProvider } from '@/hooks/use-timer-store';
import { ChatProvider } from '@/hooks/use-chat-store';
import { ManifestationProvider } from '@/hooks/use-manifestation-store';
import { FirstTimeSetupProvider } from '@/hooks/use-first-time-setup';
import { SubscriptionProvider } from '@/hooks/use-subscription-store';

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
    console.warn('ErrorBoundary caught an error:', error.message);
    console.warn('Error stack:', error.stack);
    
    // Check if it's a storage-related error and clear storage
    if (error.message?.includes('JSON Parse error') || 
        error.message?.includes('Unexpected character') ||
        error.message?.includes('JSON parse error') ||
        error.message?.includes('Unexpected character: o') ||
        error.stack?.includes('AsyncStorage') ||
        error.stack?.includes('storage-helper') ||
        error.stack?.includes('safeJsonParse') ||
        error.stack?.includes('safeStorageGet')) {
      console.log('Storage error detected, clearing storage...');
      console.log('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack?.substring(0, 500)
      });
      
      clearAllStorageIfCorrupted().then(() => {
        console.log('Storage cleared, resetting error state');
        this.setState({ hasError: false, error: undefined });
      }).catch(() => {
        console.log('Failed to clear storage, but resetting error state anyway');
        this.setState({ hasError: false, error: undefined });
      });
      return;
    }
    
    // Ignore development/inspector errors
    if (error.stack?.includes('inspector') ||
        error.stack?.includes('BridgeModule') ||
        error.message?.includes('createContextHook')) {
      console.log('Ignoring development error:', error.message);
      this.setState({ hasError: false, error: undefined });
      return;
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Don't show error UI for development or storage errors
      if (this.state.error.message?.includes('JSON Parse error') || 
          this.state.error.message?.includes('Unexpected character') ||
          this.state.error.message?.includes('Unexpected character: o') ||
          this.state.error.stack?.includes('inspector') ||
          this.state.error.stack?.includes('AsyncStorage') ||
          this.state.error.stack?.includes('storage-helper') ||
          this.state.error.stack?.includes('safeJsonParse') ||
          this.state.error.stack?.includes('safeStorageGet') ||
          this.state.error.stack?.includes('createContextHook')) {
        return this.props.children;
      }
      
      // Show error UI for actual app errors
      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.title}>Something went wrong</Text>
          <Text style={errorStyles.message}>
            {this.state.error.message || 'An unexpected error occurred'}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

SplashScreen.preventAutoHideAsync();

LogBox.ignoreLogs([
  'source.uri should not be an empty string',
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
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('Initializing app...');
        
        // Clear any corrupted storage first
        await clearAllStorageIfCorrupted();
        
        // Hide splash screen
        await SplashScreen.hideAsync();
        console.log('App initialized successfully');
      } catch (error) {
        console.error('Error during app initialization:', error);
        
        try {
          await SplashScreen.hideAsync();
        } catch (splashError) {
          console.error('Failed to hide splash screen:', splashError);
        }
      }
    };
    
    // Initialize immediately
    initializeApp();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SubscriptionProvider>
          <AuthProvider>
            <FirstTimeSetupProvider>
              <GoalProvider>
                <TimerProvider>
                  <ChatProvider>
                    <ManifestationProvider>
                      <GestureHandlerRootView style={styles.container}>
                        <RootLayoutNav />
                      </GestureHandlerRootView>
                    </ManifestationProvider>
                  </ChatProvider>
                </TimerProvider>
              </GoalProvider>
            </FirstTimeSetupProvider>
          </AuthProvider>
        </SubscriptionProvider>
      </QueryClientProvider>
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
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  message: {
    textAlign: 'center',
    color: '#666',
  },
});