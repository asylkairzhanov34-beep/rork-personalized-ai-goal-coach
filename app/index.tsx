import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useFirstTimeSetup } from '@/hooks/use-first-time-setup';
import { useAuth } from '@/hooks/use-auth-store';
import { useSubscription } from '@/hooks/use-subscription-store';
import SubscriptionPaywall from '@/components/SubscriptionPaywall';

const ANALYTICS_EVENTS = {
  PAYWALL_SHOWN: 'paywall_shown',
  TRIAL_STARTED: 'trial_started',
  TRIAL_EXPIRED: 'trial_expired',
  FEATURE_BLOCKED: 'feature_blocked',
};

export default function Index() {
  const [isReady, setIsReady] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { profile, isLoading: setupLoading } = useFirstTimeSetup();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { 
    isFirstLaunch, 
    trialInfo, 
    trialOfferShown,
    markTrialOfferShown,
    isInitialized: subInitialized,
    status,
  } = useSubscription();
  const [showFirstLaunchPaywall, setShowFirstLaunchPaywall] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    
    const initializeApp = async () => {
      try {
        console.log('[Index] Initializing...');
        await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
        setIsReady(true);
        console.log('[Index] Ready');
      } catch (err) {
        console.error('[Index] Init error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsReady(true);
      }
    };

    initializeApp();
  }, [isClient]);

  useEffect(() => {
    if (!isClient || !isReady || !subInitialized || !isAuthenticated) return;

    const checkFirstLaunchPaywall = async () => {
      if (status !== 'premium' && isFirstLaunch && !trialOfferShown && profile?.isCompleted) {
        console.log('[Index] First launch after setup, showing paywall', { ANALYTICS_EVENTS });
        setShowFirstLaunchPaywall(true);
        await markTrialOfferShown();
      }
    };

    checkFirstLaunchPaywall();
  }, [isClient, isReady, subInitialized, isAuthenticated, status, isFirstLaunch, trialOfferShown, profile, markTrialOfferShown]);

  if (error) {
    console.warn('[Index] Error occurred but continuing:', error);
  }

  if (!isClient || !isReady || authLoading || setupLoading || !subInitialized) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

  console.log('[Index] Auth status:', { 
    isAuthenticated, 
    hasProfile: !!profile, 
    isCompleted: profile?.isCompleted,
    isFirstLaunch,
    trialOfferShown,
    trialExpired: trialInfo?.isExpired,
    status,
    showFirstLaunchPaywall,
  });

  if (trialInfo?.isExpired && status !== 'premium') {
    console.log('[Index] Trial expired, showing fullscreen paywall', { ANALYTICS_EVENTS });
    return <SubscriptionPaywall visible={true} fullscreen={true} />;
  }

  if (!isAuthenticated) {
    console.log('[Index] -> /auth');
    return <Redirect href="/auth" />;
  }

  if (!profile || !profile.nickname) {
    console.log('[Index] -> /first-time-setup (no profile)');
    return <Redirect href="/first-time-setup" />;
  }

  if (!profile.isCompleted) {
    console.log('[Index] -> /first-time-setup');
    return <Redirect href="/first-time-setup" />;
  }

  if (showFirstLaunchPaywall) {
    console.log('[Index] Showing first launch paywall modal');
    return (
      <>
        <Redirect href="/(tabs)/home" />
        <SubscriptionPaywall
          visible={true}
          onClose={() => setShowFirstLaunchPaywall(false)}
          fullscreen={false}
          isFirstLaunch={true}
        />
      </>
    );
  }

  console.log('[Index] -> /home');
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
});

