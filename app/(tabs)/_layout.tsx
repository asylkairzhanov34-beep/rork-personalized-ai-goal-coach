import React, { useEffect, useRef } from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform, useWindowDimensions, Animated, TouchableOpacity } from 'react-native';
import { Home, Target, Timer, TrendingUp, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

interface AnimatedTabIconProps {
  icon: any;
  focused: boolean;
  onPress: () => void;
}

function AnimatedTabIcon({ icon: Icon, focused, onPress }: AnimatedTabIconProps) {
  const scaleAnim = useRef(new Animated.Value(focused ? 1 : 0.85)).current;
  const backgroundOpacity = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const glowScale = useRef(new Animated.Value(focused ? 1 : 0.5)).current;
  const iconTranslateY = useRef(new Animated.Value(focused ? -2 : 0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: focused ? 1 : 0.85,
        friction: 6,
        tension: 300,
        useNativeDriver: true,
      }),
      Animated.timing(backgroundOpacity, {
        toValue: focused ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(glowScale, {
        toValue: focused ? 1 : 0.5,
        friction: 5,
        tension: 200,
        useNativeDriver: true,
      }),
      Animated.spring(iconTranslateY, {
        toValue: focused ? -2 : 0,
        friction: 6,
        tension: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused, scaleAnim, backgroundOpacity, glowScale, iconTranslateY]);

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    Animated.sequence([
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(rotateAnim, {
        toValue: 0,
        friction: 3,
        tension: 400,
        useNativeDriver: true,
      }),
    ]).start();
    
    onPress();
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-5deg'],
  });

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={1}
      style={styles.tabTouchable}
    >
      <View style={styles.iconContainer}>
        <Animated.View
          style={[
            styles.glowOuter,
            {
              opacity: backgroundOpacity,
              transform: [{ scale: glowScale }],
            },
          ]}
        />
        
        <Animated.View
          style={[
            styles.iconBackground,
            {
              opacity: backgroundOpacity,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        />
        
        <Animated.View
          style={[
            styles.iconWrapper,
            {
              transform: [
                { scale: scaleAnim },
                { translateY: iconTranslateY },
                { rotate: rotateInterpolate },
              ],
            },
          ]}
        >
          <Icon
            size={26}
            color={focused ? '#FFD600' : 'rgba(255, 255, 255, 0.5)'}
            strokeWidth={focused ? 2.2 : 1.8}
          />
        </Animated.View>
        
        <Animated.View
          style={[
            styles.indicator,
            {
              opacity: backgroundOpacity,
              transform: [
                {
                  scaleX: backgroundOpacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                  }),
                },
              ],
            },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
}

function TabBarBackground() {
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <Animated.View
      style={[
        styles.tabBarBackground,
        {
          left: screenWidth * 0.04,
          right: screenWidth * 0.04,
          bottom: Math.max(insets.bottom, 20),
          opacity: fadeAnim,
          transform: [
            {
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.innerGlow} />
    </Animated.View>
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
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.5)',
        tabBarShowLabel: false,
        tabBarStyle: [
          styles.tabBar,
          {
            paddingHorizontal: screenWidth * 0.06,
            bottom: 0,
            height: 80 + Math.max(insets.bottom, 20),
            paddingBottom: Math.max(insets.bottom, 20),
          },
        ],
        tabBarBackground: () => <TabBarBackground />,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon icon={Home} focused={focused} onPress={() => {}} />
          ),
          tabBarButton: (props) => (
            <AnimatedTabIcon
              icon={Home}
              focused={props.accessibilityState?.selected ?? false}
              onPress={props.onPress as () => void}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon icon={Target} focused={focused} onPress={() => {}} />
          ),
          tabBarButton: (props) => (
            <AnimatedTabIcon
              icon={Target}
              focused={props.accessibilityState?.selected ?? false}
              onPress={props.onPress as () => void}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon icon={TrendingUp} focused={focused} onPress={() => {}} />
          ),
          tabBarButton: (props) => (
            <AnimatedTabIcon
              icon={TrendingUp}
              focused={props.accessibilityState?.selected ?? false}
              onPress={props.onPress as () => void}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="timer"
        options={{
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon icon={Timer} focused={focused} onPress={() => {}} />
          ),
          tabBarButton: (props) => (
            <AnimatedTabIcon
              icon={Timer}
              focused={props.accessibilityState?.selected ?? false}
              onPress={props.onPress as () => void}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon icon={User} focused={focused} onPress={() => {}} />
          ),
          tabBarButton: (props) => (
            <AnimatedTabIcon
              icon={User}
              focused={props.accessibilityState?.selected ?? false}
              onPress={props.onPress as () => void}
            />
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
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 30,
      },
      android: {
        elevation: 16,
      },
      web: {
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
      },
    }) as any,
  },
  innerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabTouchable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 56,
    position: 'relative',
  },
  glowOuter: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: '#FFD600',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
      },
      android: {
        elevation: 0,
      },
      web: {
        boxShadow: '0 0 24px rgba(255, 214, 0, 0.35)',
      },
    }) as any,
  },
  iconBackground: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 214, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 0, 0.2)',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    zIndex: 10,
  },
  indicator: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFD600',
  },
});

