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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Check, Sparkles, Info, Settings } from 'lucide-react-native';
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

  const freeFeatures = [
    { title: 'Добавление задач', icon: '✏️' },
    { title: '1-дневный план от ИИ', icon: '📅' },
    { title: 'Помодоро-таймер', icon: '⏱️' },
    { title: 'Базовая геймификация', icon: '🎮' },
    { title: 'История 1 день', icon: '📊' },
    { title: '3 персональных совета от ИИ', icon: '💡' },
    { title: '1 умная задача в день', icon: '🎯' },
    { title: 'Базовые темы', icon: '🎨' },
  ];

  const premiumFeatures = [
    { title: 'Ежедневный ИИ-коуч', icon: '🤖', highlight: true },
    { title: 'Полный недельный/месячный план', icon: '📆', highlight: true },
    { title: 'Weekly AI Report', icon: '📈', highlight: true },
    { title: 'Все персональные советы', icon: '💎' },
    { title: 'Умные задачи без ограничений', icon: '🚀' },
    { title: 'История 7-90 дней', icon: '📊' },
    { title: 'Уровни и награды', icon: '🏆' },
    { title: 'ИИ-чат помощник GoalForge', icon: '💬' },
    { title: 'Приоритетная скорость', icon: '⚡' },
    { title: 'Умный Pomodoro с аналитикой', icon: '⏰', highlight: true },
    { title: 'Все будущие функции', icon: '✨' },
  ];

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
            <Sparkles size={48} color="#FFD700" />
            <Text style={styles.title}>GoalForge Premium</Text>
            <Text style={styles.subtitle}>
              Разблокируйте все возможности для достижения целей
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

          {/* Feature Comparison */}
          <View style={styles.comparisonContainer}>
            {/* Free Features */}
            <View style={styles.featureSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🆓 Free</Text>
                <Text style={styles.sectionSubtitle}>Базовые возможности</Text>
              </View>
              {freeFeatures.map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <Text style={styles.featureIcon}>{feature.icon}</Text>
                  <Text style={[styles.featureText, styles.freeFeatureText]}>{feature.title}</Text>
                </View>
              ))}
            </View>

            {/* Premium Features */}
            <View style={[styles.featureSection, styles.premiumSection]}>
              <View style={styles.sectionHeader}>
                <View style={styles.premiumBadge}>
                  <Text style={styles.sectionTitle}>🟦 Premium</Text>
                </View>
                <Text style={styles.sectionSubtitle}>Всё из Free +</Text>
              </View>
              {premiumFeatures.map((feature, index) => (
                <View key={index} style={[
                  styles.featureRow,
                  feature.highlight && styles.highlightedFeature
                ]}>
                  <Text style={styles.featureIcon}>{feature.icon}</Text>
                  <Text style={[
                    styles.featureText, 
                    styles.premiumFeatureText,
                    feature.highlight && styles.highlightedText
                  ]}>
                    {feature.title}
                  </Text>
                  {feature.highlight && (
                    <View style={styles.newBadge}>
                      <Text style={styles.newBadgeText}>HOT</Text>
                    </View>
                  )}
                </View>
              ))}
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
            {isPurchasing ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <>
                <Text style={styles.purchaseButtonText}>Начать бесплатно</Text>
                <Text style={styles.purchaseButtonSubtext}>Затем {selectedPackage?.includes('monthly') ? '$9.99/мес' : '$79/год'}</Text>
              </>
            )}
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
  comparisonContainer: {
    marginBottom: 24,
    gap: 16,
  },
  featureSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 8,
  },
  premiumSection: {
    backgroundColor: 'rgba(100, 150, 255, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(100, 150, 255, 0.3)',
  },
  sectionHeader: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  highlightedFeature: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  featureIcon: {
    fontSize: 18,
    marginRight: 12,
    width: 24,
  },
  freeFeatureText: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  premiumFeatureText: {
    color: '#fff',
    fontWeight: '500' as const,
  },
  highlightedText: {
    color: '#FFD700',
    fontWeight: 'bold' as const,
  },
  newBadge: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  newBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold' as const,
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
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  purchaseButtonDisabled: {
    opacity: 0.5,
  },
  purchaseButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  purchaseButtonSubtext: {
    fontSize: 12,
    color: COLORS.secondary,
    marginTop: 2,
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
