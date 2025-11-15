import React from 'react';
import { router } from 'expo-router';
import AuthScreen from '@/screens/AuthScreen';

export default function Auth() {
  const handleAuthSuccess = () => {
    router.replace('/(tabs)/home');
  };

  return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
}