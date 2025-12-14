import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type GestureResponderEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { COLORS as THEME_COLORS, theme } from '@/constants/theme';

const TAB_COLORS = {
  bgStart: THEME_COLORS.background,
  bgEnd: '#001F3F',
  gold: THEME_COLORS.primary,
  inactive: 'rgba(255, 255, 255, 0.55)',
  border: THEME_COLORS.glassBorder,
  ripple: 'rgba(255, 215, 0, 0.28)',
  glass: THEME_COLORS.glass,
} as const;

const TAB_SIZES = {
  height: 72,
  maxWidth: 430,
  iconHost: 52,
  radius: theme.borderRadius.full,
} as const;

type TabButtonLayout = {
  width: number;
  height: number;
};

function useHapticTap() {
  return useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
  }, []);
}

type TabButtonProps = {
  isFocused: boolean;
  icon: React.ReactNode;
  onPress: () => void;
  onLongPress: () => void;
  testID?: string;
  accessibilityLabel?: string;
};

const TabButton = React.memo<TabButtonProps>(
  ({ isFocused, icon, onPress, onLongPress, testID, accessibilityLabel }) => {
    const hapticTap = useHapticTap();

    const activeT = useRef(new Animated.Value(isFocused ? 1 : 0)).current;
    const scale = useRef(new Animated.Value(1)).current;
    const rippleOpacity = useRef(new Animated.Value(0)).current;
    const rippleScale = useRef(new Animated.Value(0)).current;
    const [layout, setLayout] = useState<TabButtonLayout>({ width: 1, height: 1 });
    const [rippleXY, setRippleXY] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    useEffect(() => {
      Animated.timing(activeT, {
        toValue: isFocused ? 1 : 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, [isFocused, activeT]);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      setLayout({ width: Math.max(1, width), height: Math.max(1, height) });
    }, []);

    const runPressAnim = useCallback(() => {
      scale.stopAnimation();
      scale.setValue(1);
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.1,
          duration: 150,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          speed: 18,
          bounciness: 10,
          useNativeDriver: true,
        }),
      ]).start();
    }, [scale]);

    const runRipple = useCallback(
      (x: number, y: number) => {
        setRippleXY({ x, y });
        rippleOpacity.stopAnimation();
        rippleScale.stopAnimation();
        rippleOpacity.setValue(1);
        rippleScale.setValue(0);

        Animated.parallel([
          Animated.timing(rippleScale, {
            toValue: 1,
            duration: 420,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(rippleOpacity, {
            toValue: 0,
            duration: 420,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      },
      [rippleOpacity, rippleScale],
    );

    const onPressIn = useCallback(
      (e: GestureResponderEvent) => {
        const { locationX, locationY } = e.nativeEvent;
        runPressAnim();
        runRipple(locationX, locationY);
      },
      [runPressAnim, runRipple],
    );

    const handlePress = useCallback(() => {
      hapticTap();
      onPress();
    }, [hapticTap, onPress]);

    const rippleSize = useMemo(() => {
      const base = Math.max(layout.width, layout.height);
      return Math.max(64, base * 1.65);
    }, [layout.height, layout.width]);

    const rippleStyle = useMemo(() => {
      const left = rippleXY.x - rippleSize / 2;
      const top = rippleXY.y - rippleSize / 2;

      return [
        styles.ripple,
        {
          width: rippleSize,
          height: rippleSize,
          borderRadius: rippleSize / 2,
          left,
          top,
          opacity: rippleOpacity,
          transform: [{ scale: rippleScale }],
        },
      ] as const;
    }, [rippleOpacity, rippleScale, rippleSize, rippleXY.x, rippleXY.y]);

    const inactiveOpacity = activeT.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0],
    });

    return (
      <Pressable
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        onLayout={onLayout}
        onPress={handlePress}
        onLongPress={onLongPress}
        onPressIn={onPressIn}
        style={styles.tabButton}
      >
        <View style={styles.pressableInner}>
          <Animated.View pointerEvents="none" style={rippleStyle} />

          <Animated.View
            style={[
              styles.iconHost,
              {
                transform: [{ scale }],
              },
            ]}
          >
            <Animated.View
              pointerEvents="none"
              style={[
                styles.glow,
                {
                  opacity: activeT,
                  transform: [{ scale: activeT.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
                },
              ]}
            />

            <Animated.View style={{ opacity: inactiveOpacity }}>{icon}</Animated.View>
            <Animated.View style={[styles.activeIconOverlay, { opacity: activeT }]}>{icon}</Animated.View>
          </Animated.View>
        </View>
      </Pressable>
    );
  },
);
TabButton.displayName = 'TabButton';

export function AnimatedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const fade = useRef(new Animated.Value(1)).current;
  const prevIndexRef = useRef<number>(state.index);

  useEffect(() => {
    if (prevIndexRef.current === state.index) return;
    prevIndexRef.current = state.index;

    fade.stopAnimation();
    Animated.sequence([
      Animated.timing(fade, {
        toValue: 0.35,
        duration: 80,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(fade, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, state.index]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, 12),
          opacity: fade,
        },
      ]}
      pointerEvents="box-none"
      testID="telegramTabBar"
    >
      <LinearGradient
        colors={[TAB_COLORS.bgStart, TAB_COLORS.bgEnd]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.bar}
      >
        <View style={styles.glassOverlay} pointerEvents="none" />
        <View style={styles.row}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
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
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            const iconNode = options.tabBarIcon?.({
              focused: isFocused,
              color: isFocused ? TAB_COLORS.gold : TAB_COLORS.inactive,
              size: 26,
            });

            return (
              <TabButton
                key={route.key}
                testID={`tab-${route.name}`}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                isFocused={isFocused}
                icon={
                  <View style={styles.iconWrap}>
                    <View style={styles.iconInactive}>{iconNode}</View>
                    <View style={styles.iconActive} pointerEvents="none">
                      {React.isValidElement(iconNode)
                        ? React.cloneElement(iconNode, {
                            color: TAB_COLORS.gold,
                          } as Record<string, unknown>)
                        : iconNode}
                    </View>
                  </View>
                }
                onPress={onPress}
                onLongPress={onLongPress}
              />
            );
          })}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    maxWidth: TAB_SIZES.maxWidth,
    borderRadius: TAB_SIZES.radius,
    borderWidth: 1,
    borderColor: TAB_COLORS.border,
    overflow: 'hidden',
    height: TAB_SIZES.height,
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.55,
        shadowRadius: 18,
      },
      android: {
        elevation: 14,
      },
      web: {
        boxShadow: '0 10px 22px rgba(0,0,0,0.55)',
      },
    }) as any,
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  row: {
    height: TAB_SIZES.height,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  tabButton: {
    flex: 1,
    height: '100%',
  },
  pressableInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ripple: {
    position: 'absolute',
    backgroundColor: TAB_COLORS.ripple,
  },
  iconHost: {
    width: TAB_SIZES.iconHost,
    height: TAB_SIZES.iconHost,
    borderRadius: TAB_SIZES.iconHost / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TAB_COLORS.glass,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  glow: {
    position: 'absolute',
    width: TAB_SIZES.iconHost,
    height: TAB_SIZES.iconHost,
    borderRadius: TAB_SIZES.iconHost / 2,
    backgroundColor: 'rgba(255, 215, 0, 0.10)',
    ...Platform.select({
      ios: {
        shadowColor: TAB_COLORS.gold,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.55,
        shadowRadius: 4,
      },
      android: {
        elevation: 0,
      },
      web: {
        boxShadow: '0 0 8px rgba(255, 215, 0, 0.35)',
      },
    }) as any,
  },
  iconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInactive: {
    position: 'absolute',
    opacity: 1,
  },
  iconActive: {
    position: 'absolute',
    opacity: 1,
  },
  activeIconOverlay: {
    position: 'absolute',
  },
});
