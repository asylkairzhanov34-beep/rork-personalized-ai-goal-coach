import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock, X, Sparkles, Check } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface SubscriptionPaywallProps {
  visible: boolean;
  onClose?: () => void;
  feature?: string;
  message?: string;
  fullscreen?: boolean;
  isFirstLaunch?: boolean;
}

const BENEFITS = [
  { text: 'Ежедневный ИИ-коуч' },
  { text: 'Полный недельный/месячный план' },
  { text: 'ИИ-чат помощник' },
];

export default function SubscriptionPaywall({
  visible,
  onClose,
  feature = 'эта функция',
  message = 'Получите полный доступ к GoalForge',
  fullscreen = false,
  isFirstLaunch = false,
}: SubscriptionPaywallProps) {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [visible, fadeAnim, scaleAnim]);

  const handleUpgrade = () => {
    if (onClose) onClose();
    router.push('/subscription');
  };

  const handleClose = () => {
    if (onClose && !fullscreen) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(() => onClose());
    }
  };

  if (!visible) return null;

  const content = (
    <View style={fullscreen ? styles.fullscreenContainer : styles.modalOverlay}>
      <View style={styles.background}>
        <LinearGradient
          colors={['rgba(255, 215, 0, 0.15)', 'rgba(0,0,0,0)']}
          style={styles.glowEffect}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.6 }}
        />
      </View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {!fullscreen && onClose && (
          <TouchableOpacity
            style={styles.closeIcon}
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={24} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        )}

        <View style={styles.iconContainer}>
          {fullscreen ? (
            <Lock size={48} color="#FFD700" />
          ) : (
            <Sparkles size={48} color="#FFD700" />
          )}
        </View>

        <Text style={styles.title}>
          {fullscreen
            ? 'Пробный период истёк'
            : isFirstLaunch
            ? 'Попробуй GoalForge Premium — 1 день бесплатно'
            : 'Premium функция'}
        </Text>

        {isFirstLaunch ? (
          <>
            <Text style={styles.subtitle}>Полный доступ ко всем возможностям</Text>
            <View style={styles.benefitsList}>
              {BENEFITS.map((benefit, index) => (
                <View key={index} style={styles.benefitItem}>
                  <View style={styles.checkCircle}>
                    <Check size={12} color="#000" />
                  </View>
                  <Text style={styles.benefitText}>{benefit.text}</Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <Text style={styles.message}>
            {fullscreen
              ? 'Ваш пробный период истек. Оформите Premium подписку для продолжения использования приложения.'
              : `${feature} доступна только с Premium подпиской`}
          </Text>
        )}

        <TouchableOpacity
          style={styles.upgradeButton}
          onPress={handleUpgrade}
          activeOpacity={0.96}
        >
          <Text style={styles.upgradeButtonText}>
            {isFirstLaunch ? 'Начать бесплатный период' : 'Разблокировать Premium'}
          </Text>
        </TouchableOpacity>

        {!fullscreen && onClose && isFirstLaunch && (
          <TouchableOpacity style={styles.secondaryButton} onPress={handleClose} activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>Продолжить без Premium</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );

  if (fullscreen) {
    return content;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {content}
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 24,
  },
  fullscreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    paddingHorizontal: 24,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  glowEffect: {
    width: '100%',
    height: '60%',
    opacity: 0.6,
  },
  content: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 22,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.12)',
  },
  closeIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 4,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 34,
    paddingHorizontal: 8,
  },
  message: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.62)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  benefitsList: {
    width: '100%',
    marginBottom: 32,
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  benefitText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  upgradeButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#FFD700',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 10,
  },
  upgradeButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  secondaryButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  secondaryButtonText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '500',
  },
});