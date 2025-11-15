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
        console.log('Index: Initializing app...');
        
        // Small delay to ensure providers are ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        setIsReady(true);
        console.log('Index: App ready');
      } catch (err) {
        console.error('Index: Initialization error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        // Still set ready to true to allow navigation
        setIsReady(true);
      }
    };

    initializeApp();
  }, []);

  if (error) {
    console.warn('Index: Error occurred but continuing:', error);
  }

  if (!isReady || authLoading || setupLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

  // First check if user is authenticated
  if (!isAuthenticated) {
    console.log('Index: User not authenticated, redirecting to auth...');
    return <Redirect href="/auth" />;
  }

  // Check if first-time setup is completed
  if (!profile || !profile.isCompleted) {
    console.log('Index: First-time setup not completed, redirecting...');
    return <Redirect href="/first-time-setup" />;
  }

  // Navigate to home if setup is complete
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

