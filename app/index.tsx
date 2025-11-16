import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useFirstTimeSetup } from '@/hooks/use-first-time-setup';
import { useAuth } from '@/hooks/use-auth-store';

export default function Index() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { profile, isLoading: setupLoading } = useFirstTimeSetup();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('[Index] Initializing...');
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        setIsReady(true);
        console.log('[Index] Ready');
      } catch (err) {
        console.error('[Index] Init error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsReady(true);
      }
    };

    initializeApp();
  }, []);

  if (error) {
    console.warn('[Index] Error occurred but continuing:', error);
  }

  if (!isReady || authLoading || setupLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

  console.log('[Index] Auth status:', { isAuthenticated, hasProfile: !!profile, isCompleted: profile?.isCompleted });

  if (!isAuthenticated) {
    console.log('[Index] -> /auth');
    return <Redirect href="/auth" />;
  }

  if (!profile || !profile.isCompleted) {
    console.log('[Index] -> /first-time-setup');
    return <Redirect href="/first-time-setup" />;
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

