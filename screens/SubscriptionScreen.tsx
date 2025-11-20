import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Check, Sparkles, Info, Settings, Crown, Star, Zap, TrendingUp } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSubscription } from '@/hooks/use-subscription-store';
import { COLORS } from '@/constants/theme';

interface SubscriptionScreenProps {
  skipButton?: boolean;
}

export default function SubscriptionScreen({ skipButton = false }: SubscriptionScreenProps) {
  const router = useRouter();
  const {
    packages,
    isPurchasing,
    isRestoring,
    purchasePackage,
    restorePurchases,
    isPremium,
  } = useSubscription();

  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  React.useEffect(() => {
    if (packages.length > 0 && !selectedPackage) {
      setSelectedPackage(packages[0].identifier);
    }
  }, [packages, selectedPackage]);

  const handlePurchase = async () => {
    if (!selectedPackage) {
      Alert.alert('Ошибка', 'Выберите план подписки');
      return;
    }

    const success = await purchasePackage(selectedPackage);
    
    if (success) {
      Alert.alert(
        'Успешно!',
        'Подписка активирована',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } else {
      Alert.alert('Ошибка', 'Не удалось оформить подписку');
    }
  };

  const handleRestore = async () => {
    const success = await restorePurchases();
    
    if (success) {
      Alert.alert(
        'Успешно!',
        'Подписка восстановлена',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } else {
      Alert.alert('Информация', 'Активные подписки не найдены');
    }
  };

  const handleManageSubscription = () => {
    if (Platform.OS === 'ios') {
      Alert.alert(
        'Управление подпиской',
        'Для управления подпиской перейдите в настройки iPhone',
        [
          { text: 'Отмена', style: 'cancel' },
          { 
            text: 'Открыть настройки', 
            onPress: () => Linking.openURL('https://apps.apple.com/account/subscriptions')
          }
        ]
      );
    } else if (Platform.OS === 'android') {
      Alert.alert(
        'Управление подпиской',
        'Для управления подпиской перейдите в Google Play',
        [
          { text: 'Отмена', style: 'cancel' },
          { 
            text: 'Открыть Google Play', 
            onPress: () => Linking.openURL('https://play.google.com/store/account/subscriptions')
          }
        ]
      );
    } else {
      Alert.alert(
        'Управление подпиской',
        'В веб-версии это демо-режим. Используйте мобильное приложение для реальных подписок.'
      );
    }
  };

  const [scaleAnim] = useState(new Animated.Value(1));

  const premiumFeatures = [
    { title: 'Ежедневный ИИ-коуч', icon: '🤖', highlight: true },
    { title: 'Полный недельный/месячный план', icon: '📆', highlight: true },
    { title: 'Weekly AI Report', icon: '📈', highlight: true },
    { title: 'Безлимитный ИИ-чат GoalForge', icon: '💬', highlight: true },
    { title: 'Умные задачи без ограничений', icon: '🚀' },
    { title: 'История прогресса 90 дней', icon: '📊' },
    { title: 'Система уровней и наград', icon: '🏆' },
    { title: 'Приоритетная скорость ИИ', icon: '⚡' },
    { title: 'Умный Pomodoro с аналитикой', icon: '⏰' },
    { title: 'Персонализированные советы', icon: '💎' },
    { title: 'Все будущие функции', icon: '✨' },
  ];

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [scaleAnim]);

  if (isPremium) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.secondary]}
          style={styles.gradient}
        >
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => router.back()}
          >
            <X size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.premiumContainer}>
            <Sparkles size={64} color="#FFD700" />
            <Text style={styles.premiumTitle}>У вас Premium!</Text>
            <Text style={styles.premiumSubtitle}>
              Спасибо за поддержку приложения
            </Text>
            
            <TouchableOpacity
              style={styles.manageButton}
              onPress={handleManageSubscription}
              activeOpacity={0.7}
            >
              <Settings size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.manageButtonText}>Управление подпиской</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.secondary]}
        style={styles.gradient}
      >
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <X size={24} color="#fff" />
        </TouchableOpacity>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={['#FFD700', '#FFA500']}
                  style={styles.iconGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Crown size={48} color="#fff" />
                </LinearGradient>
              </View>
            </Animated.View>
            <Text style={styles.title}>Разблокируйте Premium</Text>
            <Text style={styles.subtitle}>
              Достигайте целей в 3x быстрее с ИИ-коучем
            </Text>
          </View>

          {Platform.OS === 'web' && (
            <View style={styles.testingBanner}>
              <Info size={20} color="#3B82F6" />
              <View style={styles.testingBannerContent}>
                <Text style={styles.testingBannerTitle}>Режим предпросмотра</Text>
                <Text style={styles.testingBannerText}>
                  Это демо-режим. Для реальных покупок соберите приложение и установите на устройство.
                </Text>
              </View>
            </View>
          )}

          {/* Premium Features Grid */}
          <View style={styles.featuresGrid}>
            {premiumFeatures.map((feature, index) => (
              <View 
                key={index} 
                style={[
                  styles.featureCard,
                  feature.highlight && styles.featureCardHighlight
                ]}
              >
                <View style={styles.featureCardIcon}>
                  <Text style={styles.featureIcon}>{feature.icon}</Text>
                  {feature.highlight && (
                    <View style={styles.hotBadge}>
                      <Zap size={12} color="#fff" />
                    </View>
                  )}
                </View>
                <Text style={[
                  styles.featureCardText,
                  feature.highlight && styles.featureCardTextHighlight
                ]}>
                  {feature.title}
                </Text>
              </View>
            ))}
          </View>

          {/* Value Props */}
          <View style={styles.valueProps}>
            <View style={styles.valueProp}>
              <TrendingUp size={24} color="#FFD700" />
              <Text style={styles.valuePropText}>90% пользователей достигают целей</Text>
            </View>
            <View style={styles.valueProp}>
              <Star size={24} color="#FFD700" />
              <Text style={styles.valuePropText}>4.9★ рейтинг в App Store</Text>
            </View>
          </View>

          {packages.length > 0 ? (
            <View style={styles.packagesContainer}>
              {packages.map((pkg) => (
                <TouchableOpacity
                  key={pkg.identifier}
                  style={[
                    styles.packageCard,
                    selectedPackage === pkg.identifier && styles.selectedPackage,
                  ]}
                  onPress={() => setSelectedPackage(pkg.identifier)}
                >
                  <View style={styles.packageInfo}>
                    <Text style={styles.packageTitle}>{pkg.product.title}</Text>
                    <Text style={styles.packageDescription}>
                      {pkg.product.description}
                    </Text>
                  </View>
                  <Text style={styles.packagePrice}>
                    {pkg.product.priceString}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.loadingText}>Загрузка планов...</Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.purchaseButton,
              (isPurchasing || packages.length === 0) && styles.purchaseButtonDisabled,
            ]}
            onPress={handlePurchase}
            disabled={isPurchasing || packages.length === 0}
          >
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              style={styles.purchaseButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {isPurchasing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <View style={styles.purchaseButtonContent}>
                    <Text style={styles.purchaseButtonText}>Попробовать Premium</Text>
                    <Crown size={20} color="#fff" style={{ marginLeft: 8 }} />
                  </View>
                  <Text style={styles.purchaseButtonSubtext}>
                    3 дня бесплатно • Затем {selectedPackage?.includes('monthly') ? '999₽/мес' : '7990₽/год'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {skipButton && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => router.replace('/(tabs)/home')}
            >
              <Text style={styles.skipButtonText}>Начать с пробного периода →</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={isRestoring}
          >
            {isRestoring ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.restoreButtonText}>Восстановить покупки</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.manageSubscriptionButton}
            onPress={handleManageSubscription}
          >
            <Text style={styles.manageSubscriptionText}>Управление подпиской</Text>
          </TouchableOpacity>

          <Text style={styles.termsText}>
            Подписка автоматически продлевается, если не отменена за 24 часа до окончания периода. Для отмены используйте "Управление подпиской".
          </Text>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  gradient: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  featuresContainer: {
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  featuresGrid: {
    marginBottom: 24,
  },
  featureCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  featureCardHighlight: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  featureCardIcon: {
    position: 'relative',
    marginRight: 16,
  },
  featureIcon: {
    fontSize: 24,
  },
  featureCardText: {
    flex: 1,
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500' as const,
  },
  featureCardTextHighlight: {
    color: '#fff',
    fontWeight: '600' as const,
  },
  hotBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueProps: {
    marginBottom: 32,
    gap: 12,
  },
  valueProp: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  valuePropText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500' as const,
  },
  packagesContainer: {
    marginBottom: 24,
  },
  packageCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPackage: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  packageInfo: {
    marginBottom: 8,
  },
  packageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  packageDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  packagePrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  purchaseButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  purchaseButtonGradient: {
    padding: 18,
    alignItems: 'center',
  },
  purchaseButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  purchaseButtonDisabled: {
    opacity: 0.5,
  },
  purchaseButtonText: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#fff',
  },
  purchaseButtonSubtext: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  skipButton: {
    marginTop: 8,
    paddingVertical: 12,
  },
  skipButtonText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textDecorationLine: 'underline',
  },
  restoreButton: {
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  restoreButtonText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textDecorationLine: 'underline',
  },
  termsText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 18,
  },
  testingBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  testingBannerContent: {
    flex: 1,
    marginLeft: 12,
  },
  testingBannerTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#60A5FA',
    marginBottom: 4,
  },
  testingBannerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 16,
  },
  premiumContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  premiumTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 24,
    marginBottom: 8,
  },
  premiumSubtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 32,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  manageButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  manageSubscriptionButton: {
    padding: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  manageSubscriptionText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textDecorationLine: 'underline',
  },
});
