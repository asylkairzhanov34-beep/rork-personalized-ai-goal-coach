import React, { useEffect, useRef } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Lock, Crown } from 'lucide-react-native';

type TrialExpiredModalProps = {
  visible: boolean;
  onGetPremium: () => void | Promise<void>;
  testID?: string;
};

const CTA_PRESS_SCALE = 0.96;

function TrialExpiredModal({
  visible,
  onGetPremium,
  testID,
}: TrialExpiredModalProps) {
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.94)).current;
  const ctaScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, damping: 15, stiffness: 180, useNativeDriver: true }),
      ]).start();
    } else {
      fade.setValue(0);
      scale.setValue(0.94);
    }
  }, [fade, scale, visible]);

  const vibrate = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    }
  };

  const handleGetPremium = async () => {
    await vibrate();
    await onGetPremium();
  };

  const pressIn = () => {
    Animated.spring(ctaScale, {
      toValue: CTA_PRESS_SCALE,
      speed: 20,
      bounciness: 0,
      useNativeDriver: true,
    }).start();
  };

  const pressOut = () => {
    Animated.spring(ctaScale, {
      toValue: 1,
      damping: 12,
      stiffness: 220,
      useNativeDriver: true,
    }).start();
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent>
      <View style={styles.overlay} testID={testID}>
        <LinearGradient
          colors={['rgba(0,0,0,0.95)', 'rgba(0,0,0,0.98)']}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View style={[styles.card, { opacity: fade, transform: [{ scale }] }]}>
          <View style={styles.iconWrapper}>
            <View style={styles.lockIcon}>
              <Lock size={40} color="#FFD700" />
            </View>
            <View style={styles.badgeOverlay}>
              <Crown size={20} color="#000" />
            </View>
          </View>

          <Text style={styles.title}>Your free period ended</Text>
          <Text style={styles.subtitle}>
            You need Premium to continue using all GoalForge features
          </Text>

          <View style={styles.featuresBlocked}>
            <Text style={styles.blockedTitle}>Features now blocked:</Text>
            <Text style={styles.blockedItem}>• AI Coach and Smart Tasks</Text>
            <Text style={styles.blockedItem}>• Weekly/Monthly Planning</Text>
            <Text style={styles.blockedItem}>• Pomodoro Analytics</Text>
            <Text style={styles.blockedItem}>• All Premium Features</Text>
          </View>

          <Animated.View style={{ transform: [{ scale: ctaScale }], width: '100%' }}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleGetPremium}
              onPressIn={pressIn}
              onPressOut={pressOut}
              activeOpacity={0.9}
              accessibilityLabel="Get Premium"
            >
              <Text style={styles.primaryLabel}>Get Premium</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 32,
    padding: 32,
    backgroundColor: 'rgba(12,12,12,0.98)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.15)',
    gap: 20,
    alignItems: 'center',
  },
  iconWrapper: {
    alignItems: 'center',
    marginBottom: 8,
  },
  lockIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  badgeOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#000',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  featuresBlocked: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,107,107,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.2)',
    gap: 8,
  },
  blockedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
    marginBottom: 4,
  },
  blockedItem: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 20,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 40,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOpacity: 0.35,
    shadowRadius: 22,
    marginTop: 8,
  },
  primaryLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
  },
});

export default TrialExpiredModal;