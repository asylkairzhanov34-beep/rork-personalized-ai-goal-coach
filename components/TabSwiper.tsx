import React, { useRef, useCallback } from 'react';
import { 
  StyleSheet, 
  Animated, 
  PanResponder, 
  Dimensions,
  Platform 
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.2;
const SWIPE_VELOCITY_THRESHOLD = 0.3;

interface TabSwiperProps {
  children: React.ReactNode;
}

const TAB_ROUTES = [
  '/home',
  '/plan',
  '/progress',
  '/timer',
  '/profile'
] as const;

export function TabSwiper({ children }: TabSwiperProps) {
  const router = useRouter();
  const pathname = usePathname();
  const translateX = useRef(new Animated.Value(0)).current;
  const lastOffset = useRef(0);

  const currentIndex = TAB_ROUTES.findIndex(route => pathname.includes(route));

  const animateToPosition = useCallback((toValue: number, onComplete?: () => void) => {
    Animated.spring(translateX, {
      toValue,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start(onComplete);
  }, [translateX]);

  const handleSwipeComplete = useCallback((gestureState: any) => {
    const { dx, vx } = gestureState;
    const shouldSwipe = Math.abs(dx) > SWIPE_THRESHOLD || Math.abs(vx) > SWIPE_VELOCITY_THRESHOLD;
    
    if (!shouldSwipe) {
      // Snap back to center
      animateToPosition(0);
      lastOffset.current = 0;
      return;
    }

    const swipeDirection = dx > 0 ? 'right' : 'left';
    const nextIndex = swipeDirection === 'right' 
      ? Math.max(0, currentIndex - 1)
      : Math.min(TAB_ROUTES.length - 1, currentIndex + 1);

    if (nextIndex !== currentIndex) {
      // Animate out and navigate
      const exitValue = swipeDirection === 'right' ? SCREEN_WIDTH : -SCREEN_WIDTH;
      
      animateToPosition(exitValue, () => {
        router.replace(TAB_ROUTES[nextIndex]);
        // Reset animation immediately after navigation
        translateX.setValue(0);
        lastOffset.current = 0;
      });
    } else {
      // At edge, bounce back
      animateToPosition(0);
      lastOffset.current = 0;
    }
  }, [currentIndex, router, animateToPosition, translateX]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const { dx, dy } = gestureState;
        // Only capture horizontal swipes
        return Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10;
      },
      onPanResponderGrant: () => {
        lastOffset.current = 0;
      },
      onPanResponderMove: (_, gestureState) => {
        const { dx } = gestureState;
        
        // Add resistance at edges
        let resistedDx = dx;
        if ((currentIndex === 0 && dx > 0) || 
            (currentIndex === TAB_ROUTES.length - 1 && dx < 0)) {
          resistedDx = dx * 0.3;
        }
        
        translateX.setValue(lastOffset.current + resistedDx);
      },
      onPanResponderRelease: (_, gestureState) => {
        handleSwipeComplete(gestureState);
      },
      onPanResponderTerminate: () => {
        // Snap back if gesture is interrupted
        animateToPosition(0);
        lastOffset.current = 0;
      },
    })
  ).current;

  // Only enable swiper for mobile platforms
  if (Platform.OS === 'web') {
    return <>{children}</>;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            {
              translateX: translateX.interpolate({
                inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
                outputRange: [-SCREEN_WIDTH * 0.2, 0, SCREEN_WIDTH * 0.2],
                extrapolate: 'clamp',
              })
            }
          ]
        }
      ]}
      {...panResponder.panHandlers}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});