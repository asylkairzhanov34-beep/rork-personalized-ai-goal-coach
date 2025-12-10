import React, { useEffect, useRef, useCallback, memo } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Home, Target, Timer, TrendingUp, User } from 'lucide-react-native';

const TAB_COUNT = 5;
const TAB_BAR_HEIGHT = 72;
const INDICATOR_SIZE = 52;
const ICON_SIZE = 24;

const TAB_ICONS = {
  home: Home,
  plan: Target,
  progress: TrendingUp,
  timer: Timer,
  profile: User,
};

interface TabItemProps {
  index: number;
  routeName: string;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

const TabItem = memo<TabItemProps>(({ index, routeName, isFocused, onPress, onLongPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const iconColorAnim = useRef(new Animated.Value(isFocused ? 1 : 0)).current;
  const backgroundOpacityAnim = useRef(new Animated.Value(isFocused ? 1 : 0)).current;
  const glowOpacityAnim = useRef(new Animated.Value(isFocused ? 0.6 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateYAnim, {
        toValue: isFocused ? -4 : 0,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }),
      Animated.timing(iconColorAnim, {
        toValue: isFocused ? 1 : 0,
        duration: 250,
        useNativeDriver: false,
      }),
      Animated.timing(backgroundOpacityAnim, {
        toValue: isFocused ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(glowOpacityAnim, {
        toValue: isFocused ? 0.6 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isFocused, translateYAnim, iconColorAnim, backgroundOpacityAnim, glowOpacityAnim]);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.85,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 8,
    }).start();
  }, [scaleAnim]);

  const handlePress = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  }, [onPress]);

  const iconColor = iconColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255, 255, 255, 0.5)', '#FFD700'],
  });

  const IconComponent = TAB_ICONS[routeName as keyof typeof TAB_ICONS] || Home;

  return (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={styles.tabButton}
      testID={`tab-${routeName}`}
    >
      <Animated.View
        style={[
          styles.tabItemContainer,
          {
            transform: [
              { scale: scaleAnim },
              { translateY: translateYAnim },
            ],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.glowEffect,
            {
              opacity: glowOpacityAnim,
            },
          ]}
        />
        
        <Animated.View
          style={[
            styles.indicatorBackground,
            {
              opacity: backgroundOpacityAnim,
            },
          ]}
        />
        
        <Animated.View style={styles.iconWrapper}>
          <AnimatedIcon 
            IconComponent={IconComponent} 
            color={iconColor} 
            size={ICON_SIZE}
            strokeWidth={isFocused ? 2.5 : 2}
          />
        </Animated.View>
        
        <Animated.View
          style={[
            styles.dotIndicator,
            {
              opacity: backgroundOpacityAnim,
              transform: [
                {
                  scale: backgroundOpacityAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                  }),
                },
              ],
            },
          ]}
        />
      </Animated.View>
    </TouchableOpacity>
  );
});

TabItem.displayName = 'TabItem';

interface AnimatedIconProps {
  IconComponent: any;
  color: Animated.AnimatedInterpolation<string>;
  size: number;
  strokeWidth: number;
}

const AnimatedIcon = memo<AnimatedIconProps>(({ IconComponent, color, size, strokeWidth }) => {
  return (
    <Animated.View>
      <IconComponent
        size={size}
        color={color as unknown as string}
        strokeWidth={strokeWidth}
      />
    </Animated.View>
  );
});

AnimatedIcon.displayName = 'AnimatedIcon';

interface AnimatedTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

export const AnimatedTabBar: React.FC<AnimatedTabBarProps> = memo(({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  const tabWidth = (screenWidth - 48) / TAB_COUNT;
  
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: state.index * tabWidth,
      useNativeDriver: true,
      tension: 68,
      friction: 12,
    }).start();
  }, [state.index, slideAnim, tabWidth]);

  const bottomPadding = Math.max(insets.bottom, 16);

  return (
    <View 
      style={[
        styles.container, 
        { 
          paddingBottom: bottomPadding,
          height: TAB_BAR_HEIGHT + bottomPadding,
        }
      ]}
    >
      <View style={styles.backgroundBlur} />
      
      <View style={styles.innerContainer}>
        <Animated.View
          style={[
            styles.slidingIndicator,
            {
              width: tabWidth,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          <View style={styles.slidingIndicatorInner} />
        </Animated.View>
        
        <View style={styles.tabBarContainer}>
          {state.routes.map((route: any, index: number) => {
            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const onLongPress = () => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            return (
              <TabItem
                key={route.key}
                index={index}
                routeName={route.name}
                isFocused={isFocused}
                onPress={onPress}
                onLongPress={onLongPress}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
});

AnimatedTabBar.displayName = 'AnimatedTabBar';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  backgroundBlur: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
      },
      android: {
        elevation: 16,
      },
      web: {
        boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.3)',
      },
    }) as any,
  },
  innerContainer: {
    flex: 1,
    marginHorizontal: 24,
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
      },
    }) as any,
  },
  slidingIndicator: {
    position: 'absolute',
    top: 8,
    left: 0,
    height: TAB_BAR_HEIGHT - 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  slidingIndicatorInner: {
    width: INDICATOR_SIZE,
    height: INDICATOR_SIZE,
    borderRadius: INDICATOR_SIZE / 2,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  tabBarContainer: {
    flexDirection: 'row',
    height: TAB_BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'space-around',
    zIndex: 1,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabItemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: INDICATOR_SIZE,
    height: INDICATOR_SIZE,
    position: 'relative',
  },
  glowEffect: {
    position: 'absolute',
    width: INDICATOR_SIZE + 20,
    height: INDICATOR_SIZE + 20,
    borderRadius: (INDICATOR_SIZE + 20) / 2,
    backgroundColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
      },
      android: {},
      web: {
        boxShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
      },
    }) as any,
  },
  indicatorBackground: {
    position: 'absolute',
    width: INDICATOR_SIZE,
    height: INDICATOR_SIZE,
    borderRadius: INDICATOR_SIZE / 2,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 0, 0.25)',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: ICON_SIZE,
    height: ICON_SIZE,
    zIndex: 2,
  },
  dotIndicator: {
    position: 'absolute',
    bottom: -2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFD700',
  },
});

export default AnimatedTabBar;
