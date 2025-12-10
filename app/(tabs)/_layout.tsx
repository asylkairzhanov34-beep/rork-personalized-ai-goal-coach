import React, { useEffect, useRef } from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform, useWindowDimensions, Animated } from 'react-native';
import { Home, Target, Timer, TrendingUp, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


function TabBarIcon({ icon: Icon, focused }: { icon: any; focused: boolean }) {
  const scaleAnim = useRef(new Animated.Value(focused ? 1 : 0.85)).current;
  const opacityAnim = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const bgOpacityAnim = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const iconOpacityAnim = useRef(new Animated.Value(focused ? 1 : 0.6)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (focused) {
      Animated.sequence([
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1.15,
            friction: 5,
            tension: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(bgOpacityAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(iconOpacityAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 200,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -4,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(bounceAnim, {
          toValue: 0,
          friction: 4,
          tension: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 0.85,
          friction: 6,
          tension: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(bgOpacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(iconOpacityAnim, {
          toValue: 0.6,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [focused]);

  return (
    <View style={styles.iconContainer}>
      <Animated.View 
        style={[
          styles.iconWrapper,
          {
            transform: [
              { scale: scaleAnim },
              { translateY: bounceAnim }
            ],
          }
        ]}
      >
        <Animated.View 
          style={[
            styles.activeBackground,
            { opacity: bgOpacityAnim }
          ]} 
        />
        <Animated.View style={{ opacity: iconOpacityAnim }}>
          <Icon 
            size={26} 
            color={focused ? '#FFD600' : 'rgba(255, 255, 255, 0.6)'}
            strokeWidth={2}
          />
        </Animated.View>
        <Animated.View 
          style={[
            styles.glowEffect,
            { opacity: opacityAnim }
          ]} 
        />
      </Animated.View>
    </View>
  );
}

function TabBarBackground() {
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[
      styles.tabBarBackground,
      {
        left: screenWidth * 0.04,
        right: screenWidth * 0.04,
        bottom: Math.max(insets.bottom, 20),
      }
    ]} />
  );
}

export default function TabLayout() {
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FFD600',
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.7)',
        tabBarShowLabel: false,
        tabBarStyle: [
          styles.tabBar,
          {
            paddingHorizontal: screenWidth * 0.08,
            bottom: 0,
            height: 80 + Math.max(insets.bottom, 20),
            paddingBottom: Math.max(insets.bottom, 20),
          }
        ],
        tabBarBackground: () => <TabBarBackground />,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon={Home} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon={Target} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon={TrendingUp} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="timer"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon={Timer} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon={User} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    paddingTop: 20,
    elevation: 0,
    shadowColor: 'transparent',
  },
  tabBarBackground: {
    position: 'absolute',
    height: 80,
    backgroundColor: '#1A1A1A',
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 28,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: '0 8px 28px rgba(0, 0, 0, 0.4)',
      },
    }) as any,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 12,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    borderRadius: 24,
    position: 'relative',
  },
  activeBackground: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 214, 0, 0.12)',
  },
  glowEffect: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFD600',
    opacity: 0.15,
    ...Platform.select({
      ios: {
        shadowColor: '#FFD600',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: {
        elevation: 0,
      },
      web: {
        boxShadow: '0 0 16px rgba(255, 214, 0, 0.4)',
      },
    }) as any,
  },
});

