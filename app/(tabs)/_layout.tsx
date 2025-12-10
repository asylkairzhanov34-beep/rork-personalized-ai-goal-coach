import React from 'react';
import { Tabs } from 'expo-router';
import { AnimatedTabBar } from '@/components/AnimatedTabBar';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
      tabBar={(props) => <AnimatedTabBar {...props} />}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="plan" />
      <Tabs.Screen name="progress" />
      <Tabs.Screen name="timer" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
