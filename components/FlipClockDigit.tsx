import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, useWindowDimensions } from 'react-native';
import { theme } from '@/constants/theme';

interface FlipClockDigitProps {
  value: string;
  size?: 'large' | 'small';
}

export default function FlipClockDigit({ value, size = 'large' }: FlipClockDigitProps) {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  
  const flipAnim = useRef(new Animated.Value(0)).current;
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      flipAnim.setValue(0);
      Animated.timing(flipAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start(() => {
        prevValue.current = value;
      });
    }
  }, [value, flipAnim]);

  const baseCardHeight = size === 'large' ? 120 : 80;
  const cardHeight = isLandscape ? baseCardHeight * 0.8 : baseCardHeight;
  const cardWidth = isLandscape ? cardHeight * 0.75 : cardHeight * 0.83;
  const fontSize = isLandscape ? cardHeight * 0.55 : cardHeight * 0.6;
  const borderRadius = size === 'large' ? 16 : 12;

  const topRotate = flipAnim.interpolate({
    inputRange: [0, 0.5],
    outputRange: ['0deg', '-90deg'],
    extrapolate: 'clamp',
  });

  const bottomRotate = flipAnim.interpolate({
    inputRange: [0.5, 1],
    outputRange: ['90deg', '0deg'],
    extrapolate: 'clamp',
  });

  const topOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const bottomOpacity = flipAnim.interpolate({
    inputRange: [0.5, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.digitContainer, { height: cardHeight, width: cardWidth }]}>
      <View style={[styles.card, { height: cardHeight, width: cardWidth, borderRadius }]}>
        <View style={[styles.halfCard, styles.topHalf, { height: cardHeight / 2, borderTopLeftRadius: borderRadius, borderTopRightRadius: borderRadius }]}>
          <Text style={[styles.digitText, { fontSize, lineHeight: cardHeight }]}>{value}</Text>
        </View>
        
        <Animated.View
          style={[
            styles.halfCard,
            styles.topHalf,
            styles.flippingCard,
            {
              height: cardHeight / 2,
              borderTopLeftRadius: borderRadius,
              borderTopRightRadius: borderRadius,
              opacity: topOpacity,
              transform: [
                { perspective: 1000 },
                { rotateX: topRotate },
              ],
            },
          ]}
        >
          <Text style={[styles.digitText, { fontSize, lineHeight: cardHeight }]}>{prevValue.current}</Text>
        </Animated.View>

        <View style={styles.divider} />

        <View style={[styles.halfCard, styles.bottomHalf, { height: cardHeight / 2, borderBottomLeftRadius: borderRadius, borderBottomRightRadius: borderRadius }]}>
          <Text style={[styles.digitText, styles.bottomText, { fontSize, lineHeight: cardHeight, marginTop: -cardHeight / 2 }]}>{prevValue.current}</Text>
        </View>

        <Animated.View
          style={[
            styles.halfCard,
            styles.bottomHalf,
            styles.flippingCard,
            {
              height: cardHeight / 2,
              borderBottomLeftRadius: borderRadius,
              borderBottomRightRadius: borderRadius,
              opacity: bottomOpacity,
              transform: [
                { perspective: 1000 },
                { rotateX: bottomRotate },
              ],
            },
          ]}
        >
          <Text style={[styles.digitText, styles.bottomText, { fontSize, lineHeight: cardHeight, marginTop: -cardHeight / 2 }]}>{value}</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  digitContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: '#1A1A1A',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  halfCard: {
    position: 'absolute',
    width: '100%',
    backgroundColor: '#1A1A1A',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topHalf: {
    top: 0,
  },
  bottomHalf: {
    bottom: 0,
  },
  flippingCard: {
    backfaceVisibility: 'hidden',
  },
  digitText: {
    fontWeight: '700',
    color: theme.colors.primary,
    textAlign: 'center',
    letterSpacing: -2,
  },
  bottomText: {
    marginTop: -60,
  },
  divider: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#000000',
  },
});
