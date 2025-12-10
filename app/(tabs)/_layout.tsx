import React, { useEffect, useRef, useState } from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform, useWindowDimensions, Animated, LayoutChangeEvent } from 'react-native';
import { Home, Target, Timer, TrendingUp, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

const TAB_COUNT = 5;

function TabBarIcon({ icon: Icon, focused, index, onLayout }: { 
  icon: any; 
  focused: boolean;
  index: number;
  onLayout: (index: number, x: number, width: number) => void;
}) {
  const scaleAnim = useRef(new Animated.Value(focused ? 1.15 : 1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(focused ? 1 : 0.5)).current;

  useEffect(() => {
    if (focused) {
      Animated.sequence([
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1.25,
            tension: 300,
            friction: 10,
            useNativeDriver: true,
          }),
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]),
        Animated.spring(scaleAnim, {
          toValue: 1.15,
          tension: 200,
          friction: 15,
          useNativeDriver: true,
        }),
      ]).start();
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 200,
          friction: 15,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.5,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [focused]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '8deg'],
  });

  const handleLayout = (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    onLayout(index, x, width);
  };

  return (
    <View 
      style={styles.iconContainer}
      onLayout={handleLayout}
    >
      <Animated.View style={[
        styles.iconWrapper,
        {
          transform: [
            { scale: scaleAnim },
            { rotate },
          ],
          opacity: opacityAnim,
        }
      ]}>
        <Icon 
          size={26} 
          color={focused ? '#FFD600' : 'rgba(255, 255, 255, 0.7)'}
          strokeWidth={focused ? 2.5 : 2}
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
  const [tabLayouts, setTabLayouts] = useState<{ x: number; width: number }[]>([]);
  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const [activeIndex, setActiveIndex] = useState(0);
  const indicatorScaleAnim = useRef(new Animated.Value(1)).current;

  const handleTabLayout = (index: number, x: number, width: number) => {
    setTabLayouts(prev => {
      const newLayouts = [...prev];
      newLayouts[index] = { x, width };
      return newLayouts;
    });
  };

  useEffect(() => {
    if (tabLayouts.length === TAB_COUNT && tabLayouts[activeIndex]) {
      Animated.sequence([
        Animated.timing(indicatorScaleAnim, {
          toValue: 0.8,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.spring(indicatorAnim, {
            toValue: tabLayouts[activeIndex].x + tabLayouts[activeIndex].width / 2 - 24,
            tension: 280,
            friction: 22,
            useNativeDriver: true,
          }),
          Animated.spring(indicatorScaleAnim, {
            toValue: 1,
            tension: 200,
            friction: 15,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [activeIndex, tabLayouts]);

  return (
    <View style={{ flex: 1 }}>
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
          tabBarBackground: () => (
            <View style={{ flex: 1 }}>
              <TabBarBackground />
              {tabLayouts.length === TAB_COUNT && (
                <Animated.View 
                  style={[
                    styles.slidingIndicator,
                    {
                      bottom: Math.max(insets.bottom, 20) + 56,
                      left: screenWidth * 0.08,
                      transform: [
                        { translateX: indicatorAnim },
                        { scaleX: indicatorScaleAnim },
                      ],
                    }
                  ]} 
                />
              )}
            </View>
          ),
        }}
        screenListeners={{
          tabPress: (e) => {
            const tabName = e.target?.split('-')[0];
            const tabNames = ['home', 'plan', 'progress', 'timer', 'profile'];
            const newIndex = tabNames.indexOf(tabName || '');
            if (newIndex !== -1) {
              setActiveIndex(newIndex);
            }
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabBarIcon icon={Home} focused={focused} index={0} onLayout={handleTabLayout} />
            ),
          }}
          listeners={{
            focus: () => setActiveIndex(0),
          }}
        />
        <Tabs.Screen
          name="plan"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabBarIcon icon={Target} focused={focused} index={1} onLayout={handleTabLayout} />
            ),
          }}
          listeners={{
            focus: () => setActiveIndex(1),
          }}
        />
        <Tabs.Screen
          name="progress"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabBarIcon icon={TrendingUp} focused={focused} index={2} onLayout={handleTabLayout} />
            ),
          }}
          listeners={{
            focus: () => setActiveIndex(2),
          }}
        />
        <Tabs.Screen
          name="timer"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabBarIcon icon={Timer} focused={focused} index={3} onLayout={handleTabLayout} />
            ),
          }}
          listeners={{
            focus: () => setActiveIndex(3),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabBarIcon icon={User} focused={focused} index={4} onLayout={handleTabLayout} />
            ),
          }}
          listeners={{
            focus: () => setActiveIndex(4),
          }}
        />
      </Tabs>
    </View>
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
  slidingIndicator: {
    position: 'absolute',
    width: 48,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#FFD600',
    ...Platform.select({
      ios: {
        shadowColor: '#FFD600',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 0 12px rgba(255, 214, 0, 0.8)',
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
});

