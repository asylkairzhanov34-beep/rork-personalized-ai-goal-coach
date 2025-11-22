import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  useWindowDimensions,
  AccessibilityInfo,
  Keyboard,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
  interpolateColor,
  interpolate,
  useDerivedValue,
  runOnJS,
  cancelAnimation,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Zap } from 'lucide-react-native'; // Fallback icon for bot if needed

// --- Types ---

export interface NavBarItem {
  key: string;
  icon: React.ReactNode; // Or a function returning Node
  label: string;
}

export interface NavBarProps {
  items: NavBarItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  onBotPress: () => void;
  floatAboveKeyboard?: boolean;
}

// --- Constants ---

const ACTIVE_COLOR = '#FFD400';
const INACTIVE_COLOR = '#8E8E93'; // Gray
const BG_COLOR = '#0b0b0b';

const BOT_BUTTON_SIZE = 72; // Slightly larger for better touch target
const BOT_BUTTON_RADIUS = BOT_BUTTON_SIZE / 2;

// --- Components ---

const TabItem = ({
  item,
  isActive,
  onPress,
  index,
}: {
  item: NavBarItem;
  isActive: boolean;
  onPress: () => void;
  index: number;
}) => {
  // Shared values for animations
  const scale = useSharedValue(1);
  const rippleOpacity = useSharedValue(0);

  // Derived values
  const colorProgress = useDerivedValue(() => {
    return withTiming(isActive ? 1 : 0, { duration: 180 });
  }, [isActive]);

  const animatedIconStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const animatedLabelStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(colorProgress.value, [0, 1], [0.6, 1]),
    };
  });

  const rippleStyle = useAnimatedStyle(() => {
    return {
      opacity: rippleOpacity.value,
      transform: [{ scale: interpolate(rippleOpacity.value, [0.25, 0], [0.8, 1.5]) }],
    };
  });

  const handlePress = () => {
    // Ripple effect
    rippleOpacity.value = 0.25;
    rippleOpacity.value = withTiming(0, { duration: 420 });

    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={styles.tabItem}
      accessibilityRole="button"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: isActive }}
      hitSlop={10}
    >
      <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
        {/* Ripple */}
        <Animated.View style={[styles.ripple, rippleStyle]} />
        
        {/* Inactive Icon (Gray) */}
        <Animated.View style={[styles.iconLayer, { opacity: interpolate(colorProgress.value, [0, 1], [1, 0]) }]}>
           {/* We assume we can clone and pass color, or the user handles it. 
               For this implementation, I will assume the `icon` prop is flexible or I'll just wrap it in a View that has the color.
               Actually, usually `icon` is a ReactElement. I can't easily change its props without cloneElement.
               But cloneElement isn't animatable.
               
               Workaround: The `items` prop should probably pass a component that takes `color`.
               But the signature says `icon: JSX.Element`.
               I will assume the consumer passes the icon with the correct color based on `isActive`? 
               No, the prompt says "Color ... lerp ... in 180ms".
               
               If I can't control the icon color directly via props in Reanimated, I will use TintColor on the View if possible (only works for images usually).
               
               Alternative: Render the icon twice, once with Gray, once with Yellow.
               But I don't have the component, I have the Element.
               
               Correction: I will assume `icon` is a generic node. 
               The prompt requirements are strict on animation.
               I will try to use `React.cloneElement` if possible, otherwise I will just use the `isActive` boolean to switch color 
               and rely on React's update, which might not be a smooth "lerp" but a quick switch.
               However, to achieve "lerp", I really need the "Two Icons" approach.
               
               I'll assume the `item.icon` is a FUNCTION that takes color. 
               Wait, prompt says `icon: JSX.Element`.
               If it's an element, I can't change it.
               
               I will modify the prop type to `icon: (props: { color: string }) => JSX.Element` internally to make it work better, 
               but the interface says `JSX.Element`.
               
               If strictly `JSX.Element`, I can't animate color smoothly without wrapping it in a MaskedView or similar.
               
               Let's stick to: The consumer passes an element. I will assume it's white or gray. 
               I will use `opacity` to fade between "Inactive" state (Gray) and "Active" state (Yellow).
               But I can't change the color of the Element provided.
               
               Refined Plan: I will expect `icon` to be a React Component (function) in my internal logic, 
               but if it's an Element, I'll try to clone it.
           */}
           {React.isValidElement(item.icon) ? React.cloneElement(item.icon as any, { color: INACTIVE_COLOR, size: 24 }) : null}
        </Animated.View>

        {/* Active Icon (Yellow) */}
        <Animated.View style={[styles.iconLayer, { opacity: colorProgress }]}>
           {React.isValidElement(item.icon) ? React.cloneElement(item.icon as any, { color: ACTIVE_COLOR, size: 24 }) : null}
        </Animated.View>
        
      </Animated.View>
      <Animated.Text style={[styles.label, animatedLabelStyle]}>
        {item.label}
      </Animated.Text>
    </Pressable>
  );
};

const BotButton = ({ onPress }: { onPress: () => void }) => {
  // Animations
  const scale = useSharedValue(1);
  const glowScale = useSharedValue(1);
  const glowAlpha = useSharedValue(0);

  useEffect(() => {
    // Breathing animation
    const breathe = () => {
        glowScale.value = withRepeat(
            withSequence(
                withTiming(1.05, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );
        glowAlpha.value = withRepeat(
            withSequence(
                withTiming(0.22, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
                withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );
    };

    const isReducedMotion = false; // logic to check reduced motion if needed
    if (!isReducedMotion) {
        breathe();
    }

    return () => {
        cancelAnimation(glowScale);
        cancelAnimation(glowAlpha);
    };
  }, [glowAlpha, glowScale]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const glowStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: glowScale.value }],
      opacity: glowAlpha.value,
    };
  });

  const tap = Gesture.Tap()
    .maxDuration(10000) // Allow long presses to be handled separately if needed
    .onBegin(() => {
      scale.value = withTiming(1.07, { duration: 140, easing: Easing.out(Easing.cubic) });
    })
    .onFinalize(() => {
      scale.value = withSpring(1, { damping: 10, stiffness: 100 });
    })
    .onEnd(() => {
      runOnJS(onPress)();
    });

  const longPress = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => {
       // Optional: Long press action
       scale.value = withTiming(0.95, { duration: 200 });
       // runOnJS(onLongPress)(); // If implemented
    });
    
  // Composed gesture
  const gesture = Gesture.Simultaneous(tap, longPress);

  return (
    <View style={styles.botButtonWrapper}>
      {/* Glow Background */}
      <Animated.View style={[styles.botGlow, glowStyle]} />
      
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.botButton, animatedStyle]}>
            <View style={styles.botButtonInner}>
              <Zap size={32} color="#000" fill="#000" />
            </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

export const NavBar: React.FC<NavBarProps> = ({
  items,
  activeKey,
  onSelect,
  onBotPress,
  floatAboveKeyboard = false,
}) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  
  // Calculate width for indicator
  // Oval width is usually width - margin
  const MARGIN_H = 16;
  const BAR_WIDTH = width - MARGIN_H * 2;
  const TAB_WIDTH = (BAR_WIDTH - BOT_BUTTON_SIZE) / 4; // Approximately
  
  // Indicator Animation
  // We need to find the position of the active tab.
  // Items: [0, 1] [BOT] [2, 3]
  // Indices: 0, 1, (skip), 2, 3
  
  const activeIndex = items.findIndex(i => i.key === activeKey);
  
  const indicatorPosition = useDerivedValue(() => {
    let pos = 0;
    if (activeIndex === -1) return 0;
    
    // First 2 items
    if (activeIndex < 2) {
        pos = activeIndex * TAB_WIDTH + (TAB_WIDTH / 2);
    } else {
        // After bot button
        pos = (activeIndex * TAB_WIDTH) + BOT_BUTTON_SIZE + (TAB_WIDTH / 2) - (TAB_WIDTH * 0.5); // Adjustment needed?
        // Let's do math:
        // Item 0: 0 to W
        // Item 1: W to 2W
        // Bot: 2W to 2W+Bot
        // Item 2: 2W+Bot to 3W+Bot
        // Item 3: 3W+Bot to 4W+Bot
        
        // Wait, TAB_WIDTH is calculated assuming remaining space.
        // Total Space = BAR_WIDTH
        // Space for Tabs = BAR_WIDTH - BOT_BUTTON_SIZE (approx, actual layout might differ with padding)
        // Let's assume Flex layout.
        
        // Simpler approach: Just center the indicator based on Flexbox via onLayout?
        // But Reanimated is better with calculated values.
        
        // Let's refine the layout.
        // Left Group: Flex 1
        // Bot Wrapper: Fixed Width
        // Right Group: Flex 1
        
        // Inside Left Group: 2 items, each 50%
        // Inside Right Group: 2 items, each 50%
        
        // So TAB_WIDTH_REAL = (BAR_WIDTH - BOT_BUTTON_SIZE_WITH_MARGIN) / 4?
        // Actually, let's use a simpler logic:
        // We will just render the indicator inside the active tab using absolute positioning or use layout measurements.
        // But "Sliding indicator" implies it moves from one to another.
        // To do this properly without complex measurements, we assume equal width tabs.
        
        const SIDE_WIDTH = (BAR_WIDTH - BOT_BUTTON_SIZE) / 2;
        const SINGLE_TAB_WIDTH = SIDE_WIDTH / 2;
        
        if (activeIndex < 2) {
            pos = activeIndex * SINGLE_TAB_WIDTH + (SINGLE_TAB_WIDTH / 2);
        } else {
            pos = SIDE_WIDTH + BOT_BUTTON_SIZE + (activeIndex - 2) * SINGLE_TAB_WIDTH + (SINGLE_TAB_WIDTH / 2);
        }
    }
    return pos;
  }, [activeIndex, width]); // Recalculate if width changes or active index

  const indicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [
          { translateX: withTiming(indicatorPosition.value - 20, { duration: 280, easing: Easing.out(Easing.cubic) }) } // -20 to center the 40px width indicator
      ],
      opacity: activeIndex === -1 ? 0 : 1,
    };
  });

  // Keyboard handling
  const translateY = useSharedValue(0);
  
  useEffect(() => {
    if (!floatAboveKeyboard) return;

    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        translateY.value = withTiming(-e.endCoordinates.height + insets.bottom, { duration: 200 });
      }
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        translateY.value = withTiming(0, { duration: 200 });
      }
    );

    return () => {
      show.remove();
      hide.remove();
    };
  }, [floatAboveKeyboard, insets.bottom, translateY]);

  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  // Split items
  const leftItems = items.slice(0, 2);
  const rightItems = items.slice(2, 4);

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle, { paddingBottom: Math.max(insets.bottom, 20) }]}>
      <View style={[styles.barBackground, { width: BAR_WIDTH }]}>
        
        {/* Sliding Indicator */}
        {/* 
            Note: Positioning absolute relative to the bar.
            We need to make sure the calculation matches the layout.
            The bar has flexDirection: 'row', alignItems: 'center'.
            Padding? No.
         */}
         <Animated.View style={[styles.indicator, indicatorStyle]} />

         <View style={styles.sideGroup}>
            {leftItems.map((item, i) => (
                <TabItem 
                    key={item.key} 
                    item={item} 
                    isActive={item.key === activeKey}
                    onPress={() => onSelect(item.key)}
                    index={i}
                />
            ))}
         </View>

         {/* Spacer for Bot Button */}
         <View style={{ width: BOT_BUTTON_SIZE }} />

         <View style={styles.sideGroup}>
            {rightItems.map((item, i) => (
                <TabItem 
                    key={item.key} 
                    item={item} 
                    isActive={item.key === activeKey}
                    onPress={() => onSelect(item.key)}
                    index={i + 2}
                />
            ))}
         </View>
      </View>

      {/* Bot Button (Absolute Overlay) */}
      <View style={[styles.botContainer, { bottom: Math.max(insets.bottom, 20) + 12 }]}> 
          <BotButton onPress={onBotPress} />
      </View>

    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    alignItems: 'center',
    pointerEvents: 'box-none', // Allow touches to pass through empty areas
  },
  barBackground: {
    height: 64, // Reduced height for the bar itself, content flows
    backgroundColor: BG_COLOR,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden', // Clip the indicator
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...Platform.select({
        ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
        },
        android: {
            elevation: 10,
        },
    }),
  },
  sideGroup: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  iconLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    color: '#FFF',
  },
  ripple: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ACTIVE_COLOR,
    top: -8,
    left: -8,
  },
  indicator: {
    position: 'absolute',
    bottom: 0, // Align to bottom edge
    left: 0,
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: ACTIVE_COLOR,
    zIndex: 10,
  },
  botContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    // Bottom is set dynamically
    pointerEvents: 'box-none',
  },
  botButtonWrapper: {
    width: BOT_BUTTON_SIZE,
    height: BOT_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ACTIVE_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    shadowColor: ACTIVE_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  botButtonInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  botGlow: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: ACTIVE_COLOR,
    opacity: 0.2,
  },
});
