import React, { useEffect, useState, useRef } from 'react';
import { Redirect } from 'expo-router';
import { StyleSheet, View, Animated, Easing } from 'react-native';
import { useFirstTimeSetup } from '@/hooks/use-first-time-setup';
import { useAuth } from '@/hooks/use-auth-store';
import { useSubscription } from '@/hooks/use-subscription-store';
import { useSubscriptionStatus } from '@/hooks/use-subscription-status';
import SubscriptionOfferModal from '@/src/components/SubscriptionOfferModal';
import { theme } from '@/constants/theme';

export default function Index() {
  const [isReady, setIsReady] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const pulseAnim = useRef(new Animated.Value(0.3)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    
    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.back(1.5)),
      useNativeDriver: true,
    }).start();
    
    pulse.start();
    rotate.start();
    
    return () => {
      pulse.stop();
      rotate.stop();
    };
  }, []);
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

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (
    !isClient ||
    !isReady ||
    authLoading ||
    setupLoading ||
    !subInitialized ||
    subscriptionStatusChecking
  ) {
    return (
      <View style={styles.container}>
        <View style={styles.backgroundGradient} />
        
        <Animated.View style={[styles.loaderContainer, { transform: [{ scale: scaleAnim }] }]}>
          <Animated.View style={[styles.outerRing, { transform: [{ rotate: spin }], opacity: pulseAnim }]} />
          <Animated.View style={[styles.middleRing, { opacity: pulseAnim }]} />
          <View style={styles.innerCircle}>
            <Animated.View style={[styles.innerGlow, { opacity: pulseAnim }]} />
          </View>
        </Animated.View>
        
        <Animated.Text style={[styles.loadingText, { opacity: pulseAnim }]}>Загрузка</Animated.Text>
        <Animated.View style={[styles.dotsContainer, { opacity: pulseAnim }]}>
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotMiddle]} />
          <View style={styles.dot} />
        </Animated.View>
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/auth" />;
  }

  if (!profile || !profile.nickname || !profile.isCompleted) {
    console.log('[Index] Redirecting to first-time-setup:', {
      hasProfile: !!profile,
      hasNickname: !!profile?.nickname,
      isCompleted: profile?.isCompleted
    });
    return <Redirect href="/first-time-setup" />;
  }

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
    backgroundColor: theme.colors.background,
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.background,
  },
  loaderContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outerRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
  },
  middleRing: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  innerCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  innerGlow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    opacity: 0.3,
  },
  loadingText: {
    marginTop: 32,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
    letterSpacing: 2,
  },
  dotsContainer: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 6,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
  },
  dotMiddle: {
    opacity: 0.6,
  },
  blockingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
