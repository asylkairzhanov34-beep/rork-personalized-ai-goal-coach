import React, { useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, Animated, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'premium';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  style,
  textStyle,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const sizeStyles = {
    small: { paddingVertical: 16, paddingHorizontal: 24 },
    medium: { paddingVertical: 20, paddingHorizontal: 32 },
    large: { paddingVertical: 24, paddingHorizontal: 40 },
  };

  const textSizeStyles = {
    small: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.regular },
    medium: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.regular },
    large: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.regular },
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      activeOpacity={1}
      style={[
        styles.button,
        sizeStyles[size],
        variant === 'primary' && styles.primaryButton,
        variant === 'secondary' && styles.secondaryButton,
        variant === 'outline' && styles.outlineButton,
        variant === 'premium' && styles.premiumButton,
        isDisabled && styles.disabledButton,
        style,
      ]}
    >
      <Text style={[
        styles.text,
        textSizeStyles[size],
        variant === 'primary' && styles.primaryText,
        variant === 'secondary' && styles.secondaryText,
        variant === 'outline' && styles.outlineText,
        variant === 'premium' && styles.premiumText,
        isDisabled && styles.disabledText,
        textStyle,
      ]}>
        {loading ? (
          <ActivityIndicator color={variant === 'outline' || variant === 'secondary' ? theme.colors.text : theme.colors.textOnDark} />
        ) : (
          title
        )}
      </Text>
    </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: theme.borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    ...theme.shadows.gold,
  },
  secondaryButton: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    ...theme.shadows.medium,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.border,
  },
  premiumButton: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    ...theme.shadows.premium,
  },
  disabledButton: {
    opacity: 0.3,
  },
  text: {
    fontWeight: theme.fontWeight.regular,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  primaryText: {
    color: theme.colors.textOnDark,
  },
  secondaryText: {
    color: theme.colors.text,
  },
  outlineText: {
    color: theme.colors.text,
  },
  premiumText: {
    color: theme.colors.textOnDark,
  },
  disabledText: {
    opacity: 0.5,
  },
});