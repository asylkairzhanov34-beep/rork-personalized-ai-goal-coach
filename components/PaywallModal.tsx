import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Lock, Crown, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSubscription } from '@/hooks/use-subscription-store';
import { Alert } from 'react-native';

const FEATURES = [
  'Ежедневный ИИ-коуч — ИИ анализирует ваш день и подбирает оптимальные шаги.',
  'Полный недельный/месячный план — Видна картина прогресса и расписание.',
  'Weekly AI Report — Точные инсайты и рекомендации.',
  'Все персональные советы — Под задания подстроены под ваш профиль.',
  'Умные задачи — ИИ генерирует задачи под цель.',
  'История 7–90 дней — Аналитика и тренды.',
  'Уровни и награды — Рост мотивации и достижения.',
  'ИИ-чат помощник — Быстрые ответы и поддержка.',
  'Приоритетная скорость — Функции работают быстрее.',
  'Умный Pomodoro таймер с аналитикой — Детальная статистика фокуса.',
  'Все будущие функции — Доступ ко всем обновлениям.',
];

export type PaywallVariant = 'trial' | 'blocking' | 'feature';

interface PaywallModalProps {
  visible: boolean;
  variant?: PaywallVariant;
  featureName?: string;
  onPrimaryAction: () => void;
  onSecondaryAction?: () => void;
  onRequestClose?: () => void;
  primaryLabel?: string;
  secondaryLabel?: string;
  loading?: boolean;
  testID?: string;
}

const CTA_SCALE = 0.96;

export default function PaywallModal({
  visible,
  variant = 'trial',
  featureName,
  onPrimaryAction,
  onSecondaryAction,
  onRequestClose,
  primaryLabel,
  secondaryLabel,
  loading = false,
  testID,
}: PaywallModalProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const ctaScale = useRef(new Animated.Value(1)).current;
  const { restorePurchases } = useSubscription();

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 14,
          stiffness: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.92);
    }
  }, [fadeAnim, scaleAnim, visible]);

  const title = useMemo(() => {
    if (variant === 'blocking') {
      return 'Пробный период завершён';
    }
    if (variant === 'feature') {
      return 'Premium функция';
    }
    return 'Попробуй GoalForge Premium — 1 день бесплатно';
  }, [variant]);

  const subtitle = useMemo(() => {
    if (variant === 'blocking') {
      return 'Оформи подписку, чтобы сохранить доступ к GoalForge и аналитике.';
    }
    if (variant === 'feature') {
      return featureName
        ? `${featureName} доступна только в GoalForge Premium.`
        : 'Эта функция доступна только в GoalForge Premium.';
    }
    return 'Разблокируй весь функционал, персональные отчёты и приоритетную скорость.';
  }, [featureName, variant]);

  const handlePrimary = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    }
    onPrimaryAction();
  };

  const handleSecondary = () => {
    onSecondaryAction?.();
    onRequestClose?.();
  };

  const handleCTAIn = () => {
    Animated.spring(ctaScale, {
      toValue: CTA_SCALE,
      speed: 20,
      bounciness: 0,
      useNativeDriver: true,
    }).start();
  };

  const handleCTAOut = () => {
    Animated.spring(ctaScale, {
      toValue: 1,
      damping: 10,
      stiffness: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleRestore = async () => {
    const success = await restorePurchases();
    if (success) {
      Alert.alert('Успешно', 'Подписка восстановлена');
      onRequestClose?.();
    } else {
      Alert.alert('Ошибка', 'Активная подписка не найдена');
    }
  };

  const cards = useMemo(() => FEATURES.slice(0, 5), []);

  if (!visible) {
    return null;
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onRequestClose}>
      <View style={styles.overlay}>
        <LinearGradient
          colors={['rgba(255, 215, 0, 0.2)', 'rgba(0,0,0,0)']}
          style={styles.glow}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
        />
        <Animated.View
          style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
          testID={testID}
        >
          {variant !== 'blocking' && onRequestClose && (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onRequestClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Закрыть"
            >
              <X size={20} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          )}

          <View style={styles.iconWrapper}>
            <LinearGradient
              colors={['#FFD700', '#FFB300']}
              style={styles.iconGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {variant === 'blocking' ? (
                <Lock size={32} color="#000" />
              ) : (
                <Crown size={32} color="#000" />
              )}
            </LinearGradient>
            <View style={styles.sparklesBadge}>
              <Sparkles size={14} color="#000" />
            </View>
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <View style={styles.featureList}>
            {cards.map((text, index) => (
              <View key={text} style={styles.featureCard}>
                <View style={styles.featureIcon}>
                  <Sparkles size={18} color="#FFD700" />
                </View>
                <Text style={styles.featureText}>{text}</Text>
              </View>
            ))}
          </View>

          <View style={styles.ctaZone}>
            <Animated.View style={{ transform: [{ scale: ctaScale }] }}>
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={handlePrimary}
                onPressIn={handleCTAIn}
                onPressOut={handleCTAOut}
                disabled={loading}
                accessibilityLabel={primaryLabel ?? 'Разблокировать Premium'}
                testID="paywall-primary-cta"
              >
                {loading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.ctaText}>
                    {primaryLabel || (variant === 'trial' ? 'Начать бесплатный период' : 'Разблокировать Premium')}
                  </Text>
                )}
              </TouchableOpacity>
            </Animated.View>

            {onSecondaryAction && (
              <TouchableOpacity
                onPress={handleSecondary}
                style={styles.secondaryButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel={secondaryLabel ?? 'Не сейчас'}
                testID="paywall-secondary-cta"
              >
                <Text style={styles.secondaryText}>{secondaryLabel || 'Не сейчас'}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleRestore}
              style={styles.restoreButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.restoreText}>Восстановить покупки</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 28,
    padding: 28,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.12)',
  },
  closeButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    padding: 6,
  },
  iconWrapper: {
    alignSelf: 'center',
    marginBottom: 24,
  },
  iconGradient: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFD700',
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  sparklesBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  featureList: {
    gap: 12,
    marginBottom: 28,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,215,0,0.12)',
    marginRight: 12,
  },
  featureText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  ctaZone: {
    marginTop: 8,
    alignItems: 'center',
  },
  ctaButton: {
    height: 64,
    borderRadius: 40,
    paddingHorizontal: 24,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#FFD700',
    shadowOpacity: 0.35,
    shadowRadius: 24,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
  },
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 8,
  },
  secondaryText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
  },
  restoreButton: {
    marginTop: 16,
    padding: 4,
  },
  restoreText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textDecorationLine: 'underline',
  },
});
