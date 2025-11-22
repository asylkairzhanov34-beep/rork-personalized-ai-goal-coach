import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useFirstTimeSetup } from '@/hooks/use-first-time-setup';
import { useAuth } from '@/hooks/use-auth-store';
import { useSubscription } from '@/hooks/use-subscription-store';
import PaywallModal from '@/components/PaywallModal';

export default function Index() {
  const [isReady, setIsReady] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const { profile, isLoading: setupLoading } = useFirstTimeSetup();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { 
    isInitialized: subInitialized,
    isPremium,
    trialStartAt,
    startTrial,
  } = useSubscription();

  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallDismissed, setPaywallDismissed] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    
    const initializeApp = async () => {
      // Artificial delay for splash
      await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
      setIsReady(true);
    };

    initializeApp();
  }, [isClient]);

  // Handle First Launch Trial Logic
  useEffect(() => {
    if (!subInitialized || !isReady || authLoading || setupLoading) return;
    if (!isAuthenticated) return;
    if (!profile?.isCompleted) return; // Don't show on setup

    // If not premium and no trial started -> Start trial & Show Paywall
    if (!isPremium && !trialStartAt && !paywallDismissed) {
      console.log('[Index] First launch detected, starting trial & showing paywall');
      startTrial();
      setShowPaywall(true);
    }
  }, [subInitialized, isReady, authLoading, setupLoading, isAuthenticated, profile, isPremium, trialStartAt, paywallDismissed, startTrial]);

  if (!isClient || !isReady || authLoading || setupLoading || !subInitialized) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/auth" />;
  }

  if (!profile || !profile.nickname || !profile.isCompleted) {
    return <Redirect href="/first-time-setup" />;
  }

  if (showPaywall) {
    return (
      <PaywallModal 
        visible={true} 
        onClose={() => {
          setShowPaywall(false);
          setPaywallDismissed(true);
        }} 
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
    backgroundColor: '#000000',
  },
});
