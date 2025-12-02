import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFirstTimeSetup } from '@/hooks/use-first-time-setup';
import { useAuth } from '@/hooks/use-auth-store';
import { useSubscription } from '@/hooks/use-subscription-store';
import { useSubscriptionStatus } from '@/hooks/use-subscription-status';
import SubscriptionOfferModal from '@/src/components/SubscriptionOfferModal';

export default function Index() {
  const [isReady, setIsReady] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { profile, isLoading: setupLoading } = useFirstTimeSetup();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isInitialized: subInitialized } = useSubscription();
  const { 
    checking: subscriptionStatusChecking, 
    shouldShowOffer, 
    startTrial: startTrialFlow
  } = useSubscriptionStatus();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) {
      return;
    }
    const initializeApp = async () => {
      try {
        await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
        setIsReady(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsReady(true);
      }
    };
    initializeApp();
  }, [isClient]);

  if (error) {
    console.warn('[Index] Error occurred but continuing:', error);
  }

  if (
    !isClient ||
    !isReady ||
    authLoading ||
    setupLoading ||
    !subInitialized ||
    subscriptionStatusChecking
  ) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.text}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    console.log('[Index] Not authenticated, redirecting to /auth');
    return <Redirect href="/auth" />;
  }

  if (!profile || !profile.nickname || !profile.isCompleted) {
    console.log('[Index] Profile incomplete, redirecting to /first-time-setup', {
      hasProfile: !!profile,
      hasNickname: profile?.nickname,
      isCompleted: profile?.isCompleted,
    });
    return <Redirect href="/first-time-setup" />;
  }

  console.log('[Index] Profile complete, checking subscription...');

  if (shouldShowOffer) {
    return (
      <SubscriptionOfferModal
        visible
        loading={subscriptionStatusChecking}
        onPrimary={() => startTrialFlow('primary')}
        onSkip={() => startTrialFlow('skip')}
        testID="subscription-offer"
      />
    );
  }

  return <Redirect href="/(tabs)/home" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  blockingContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
});
