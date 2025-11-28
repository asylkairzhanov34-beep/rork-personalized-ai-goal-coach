import React, { useState, useRef, useEffect } from 'react';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { 
  X, 
  Check, 
  Sparkles, 
  Bot, 
  Calendar, 
  FileText, 
  CheckSquare, 
  History, 
  Trophy, 
  MessageCircle, 
  Zap, 
  Timer, 
  Infinity,
  CreditCard,
  AlertTriangle
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSubscription } from '@/hooks/use-subscription-store';

interface SubscriptionScreenProps {
  skipButton?: boolean;
}

const isProductionBuild = () => {
  // Returns false for: dev builds, TestFlight, Expo Go
  // Returns true only for: production release from App Store
  if (__DEV__) return false;
  
  // TestFlight detection
  const isTestFlight = Constants.appOwnership === 'expo' || 
                       Constants.manifest?.releaseChannel === undefined ||
                       Constants.isDevice === false;
  
  return !isTestFlight;
};

const FEATURE_LIST = [
  { title: 'Ежедневный ИИ-коуч', subtitle: 'ИИ анализирует ваш день и подбирает оптимальные шаги', icon: Bot },
  { title: 'Полный недельный/месячный план', subtitle: 'Видна картина прогресса и расписание', icon: Calendar },
  { title: 'Weekly AI Report', subtitle: 'Точные инсайты и рекомендации', icon: FileText },
  { title: 'Все персональные советы', subtitle: 'Под задания подстроены под ваш профиль', icon: Sparkles },
  { title: 'Умные задачи', subtitle: 'ИИ генерирует задачи под цель', icon: CheckSquare },
  { title: 'История 7–90 дней', subtitle: 'Аналитика и тренды', icon: History },
  { title: 'Уровни и награды', subtitle: 'Рост мотивации и достижения', icon: Trophy },
  { title: 'ИИ-чат помощник', subtitle: 'Быстрые ответы и поддержка', icon: MessageCircle },
  { title: 'Приоритетная скорость', subtitle: 'Функции работают быстрее', icon: Zap },
  { title: 'Умный Pomodoro таймер с аналитикой', subtitle: 'Детальная статистика фокуса', icon: Timer },
  { title: 'Все будущие функции', subtitle: 'Доступ ко всем обновлениям', icon: Infinity },
];

export default function SubscriptionScreen({ skipButton = false }: SubscriptionScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    packages,
    isPurchasing,
    purchasePackage,
    restorePurchases,
    isPremium,
    customerInfo,
    cancelSubscriptionForDev,
  } = useSubscription();

  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const fadeAnims = useRef(FEATURE_LIST.map(() => new Animated.Value(0))).current;
  const translateYAnims = useRef(FEATURE_LIST.map(() => new Animated.Value(-10))).current;

  useEffect(() => {
    if (packages.length > 0 && !selectedPackage) {
      // Prefer yearly package if available, otherwise first
      const yearly = packages.find(p => p.product.identifier.includes('year') || p.product.identifier.includes('annual'));
      setSelectedPackage(yearly ? yearly.identifier : packages[0].identifier);
    }
  }, [packages, selectedPackage]);

  useEffect(() => {
    const animations = FEATURE_LIST.map((_, index) => {
      return Animated.parallel([
        Animated.timing(fadeAnims[index], {
          toValue: 1,
          duration: 220,
          delay: index * 80,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnims[index], {
          toValue: 0,
          duration: 220,
          delay: index * 80,
          useNativeDriver: true,
        }),
      ]);
    });

    Animated.stagger(50, animations).start();
  }, [fadeAnims, translateYAnims]);

  const handlePurchase = async () => {
    if (!selectedPackage) {
      Alert.alert('Ошибка', 'Выберите план подписки');
      return;
    }
    const success = await purchasePackage(selectedPackage);
    if (success) {
      Alert.alert('Успешно!', 'Подписка активирована', [{ text: 'OK', onPress: () => router.back() }]);
    }
  };

  const handleRestore = async () => {
    const success = await restorePurchases();
    if (success) {
      Alert.alert('Успешно!', 'Подписка восстановлена', [{ text: 'OK', onPress: () => router.back() }]);
    } else {
      Alert.alert('Информация', 'Активные подписки не найдены');
    }
  };

  if (isPremium) {
    return (
      <View style={styles.container}>
        <View style={styles.background}>
          <LinearGradient
            colors={['rgba(255, 215, 0, 0.1)', 'rgba(0,0,0,0)']}
            style={styles.glowEffect}
          />
        </View>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <View style={styles.headerLeft} />
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => router.back()}
            >
              <X size={24} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>

          <View style={styles.successContainer}>
            <View style={styles.successIconWrapper}>
              <LinearGradient
                colors={['#FFD700', '#FFB300']}
                style={styles.successIconBadge}
              >
                <Check size={48} color="#000" />
              </LinearGradient>
            </View>
            
            <Text style={styles.heroTitle}>Вы уже с нами!</Text>
            <Text style={styles.heroSubtitle}>
              Ваша Premium подписка активна. Наслаждайтесь полным доступом ко всем функциям GoalForge.
            </Text>

            <View style={styles.activePlanCard}>
              <View style={styles.planRow}>
                <CreditCard size={20} color="#FFD700" />
                <Text style={styles.planLabel}>Статус подписки</Text>
              </View>
              <Text style={styles.planValue}>Активна</Text>
              
              {customerInfo?.entitlements.active.premium?.productIdentifier && (
                 <Text style={styles.planId}>
                   {customerInfo.entitlements.active.premium.productIdentifier}
                 </Text>
              )}
            </View>

            <TouchableOpacity style={styles.manageButton} onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')}>
              <Text style={styles.manageButtonText}>Управление подпиской</Text>
            </TouchableOpacity>

            {/* Test Cancel Button - Available in dev/testflight builds */}
            {!isProductionBuild() && (
              <View style={styles.devZone}>
                <TouchableOpacity 
                  style={styles.devCancelButton} 
                  onPress={() => {
                    Alert.alert(
                      'Отмена подписки (Тест)',
                      Platform.select({
                        ios: 'TestFlight/Sandbox: Эта кнопка сбрасывает локальный статус подписки в приложении.\n\nДля полной отмены:\n1. Settings → [Your Name] → Subscriptions\n2. Найдите GoalForge → Cancel Subscription\n\nИли очистите историю в App Store Connect → Sandbox.',
                        default: 'Это действие сбросит локальный статус подписки.'
                      }),
                      [
                        { text: 'Отмена', style: 'cancel' },
                        { 
                          text: 'Сбросить', 
                          style: 'destructive', 
                          onPress: async () => {
                            await cancelSubscriptionForDev();
                            Alert.alert(
                              'Сброшено',
                              'Локальный статус подписки сброшен.\n\nДля полной отмены подписки в Sandbox используйте настройки iOS.'
                            );
                            router.back();
                          }
                        }
                      ]
                    );
                  }}
                >
                   <AlertTriangle size={16} color="#FF4500" />
                   <Text style={styles.devCancelText}>
                     {Platform.OS === 'ios' ? 'Reset Subscription (TestFlight)' : 'Cancel Subscription (Test)'}
                   </Text>
                </TouchableOpacity>
                
                {Platform.OS === 'ios' && (
                  <TouchableOpacity 
                    style={styles.sandboxButton}
                    onPress={() => {
                      Alert.alert(
                        'Sandbox Testing',
                        '📱 Как тестировать:\n\n1. Settings → App Store → Sign Out\n2. Купите подписку в приложении\n3. Войдите Sandbox аккаунтом\n4. Проверьте "[Sandbox Environment]"\n\nПодробнее: TESTFLIGHT_SANDBOX_GUIDE.md',
                        [{ text: 'OK' }]
                      );
                    }}
                  >
                    <Text style={styles.sandboxButtonText}>📖 Sandbox Guide</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Background */}
      <View style={styles.background}>
        <LinearGradient
          colors={['rgba(255, 215, 0, 0.15)', 'rgba(0,0,0,0)']}
          style={styles.glowEffect}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.6 }}
        />
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
           {/* Placeholder for Logo if needed, or just empty space as requested "small logo left" - we use text or icon */}
           <View style={styles.headerLeft}>
             <Sparkles size={24} color="#FFD700" />
           </View>
           <TouchableOpacity 
            style={styles.closeButton} 
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
           >
             <X size={24} color="rgba(255,255,255,0.8)" />
           </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 180 }]} // Extra padding for sticky CTA
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Block */}
          <View style={styles.heroBlock}>
            <Text style={styles.heroTitle}>Открой полный потенциал GoalForge</Text>
            <Text style={styles.heroSubtitle}>
              Инвестируйте в свою продуктивность и будущее
            </Text>
          </View>

          {/* Feature List */}
          <View style={styles.featureList}>
            {FEATURE_LIST.map((feature, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.featureCard,
                  {
                    opacity: fadeAnims[index],
                    transform: [{ translateY: translateYAnims[index] }],
                  },
                ]}
              >
                <View style={styles.featureIconContainer}>
                  <feature.icon size={24} color="#FFD700" />
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureSubtitle}>{feature.subtitle}</Text>
                </View>
              </Animated.View>
            ))}
          </View>

          {/* Plan Selector (Simplified) */}
           {packages.length > 0 && (
            <View style={styles.packagesContainer}>
              {packages.map((pkg) => {
                const isSelected = selectedPackage === pkg.identifier;
                return (
                  <TouchableOpacity
                    key={pkg.identifier}
                    style={[
                      styles.packageCard,
                      isSelected && styles.packageCardSelected
                    ]}
                    onPress={() => setSelectedPackage(pkg.identifier)}
                    activeOpacity={0.9}
                  >
                    <View style={styles.packageHeader}>
                       <Text style={[styles.packageTitle, isSelected && styles.packageTitleSelected]}>
                        {pkg.product.title}
                       </Text>
                       {isSelected && <View style={styles.checkCircle}><Check size={12} color="#000" /></View>}
                    </View>
                    <Text style={[styles.packagePrice, isSelected && styles.packagePriceSelected]}>
                      {pkg.product.priceString}
                    </Text>
                    <Text style={styles.packageDescription}>
                      {pkg.product.description}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* Sticky CTA Zone */}
        <View style={[styles.ctaZone, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <TouchableOpacity
            style={[
              styles.ctaButton,
              (isPurchasing || packages.length === 0) && styles.ctaButtonDisabled
            ]}
            onPress={handlePurchase}
            disabled={isPurchasing || packages.length === 0}
            activeOpacity={0.98}
          >
             {isPurchasing ? (
               <ActivityIndicator color="#000" />
             ) : (
               <Text style={styles.ctaText}>Попробовать Premium</Text>
             )}
          </TouchableOpacity>
          
          <View style={styles.policyLinks}>
            <TouchableOpacity onPress={handleRestore}>
              <Text style={styles.policyText}>Восстановить</Text>
            </TouchableOpacity>
            <Text style={styles.policyDivider}>•</Text>
             <TouchableOpacity onPress={() => Linking.openURL('https://goalforge.app/terms')}>
              <Text style={styles.policyText}>Условия</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
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
  safeArea: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  headerLeft: {
    width: 32,
    height: 32,
    justifyContent: 'center',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  heroBlock: {
    marginTop: 16,
    marginBottom: 32,
    alignItems: 'center',
  },
  heroTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 32, // 28-32px
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 34, // 1.06 * 32
    maxWidth: 320,
    marginBottom: 12,
  },
  heroSubtitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.62)',
    textAlign: 'center',
  },
  featureList: {
    gap: 12,
    marginBottom: 32,
  },
  featureCard: {
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 22,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.12)',
  },
  featureIconContainer: {
    width: 24,
    marginRight: 18, // Padding 18px
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  featureSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.62)',
  },
  packagesContainer: {
    gap: 12,
    marginBottom: 24,
  },
  packageCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  packageCardSelected: {
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderColor: '#FFD700',
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  packageTitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  packageTitleSelected: {
    color: '#FFD700',
    fontWeight: '600',
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
  },
  packagePrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  packagePriceSelected: {
    color: '#FFD700',
  },
  packageDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  ctaZone: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000000', // Opaque background for sticky area
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 24,
    paddingTop: 18,
  },
  ctaButton: {
    height: 64,
    borderRadius: 40,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 12,
  },
  ctaButtonDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  policyLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  policyText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 80,
  },
  successIconWrapper: {
    marginBottom: 32,
    shadowColor: '#FFD700',
    shadowOpacity: 0.4,
    shadowRadius: 30,
  },
  successIconBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePlanCard: {
    marginTop: 40,
    width: '100%',
    padding: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  planLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  planValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  planId: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  manageButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  manageButtonText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
  },
  devZone: {
    marginTop: 48,
    alignItems: 'center',
  },
  devCancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(255, 69, 0, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 0, 0.3)',
  },
  devCancelText: {
    color: '#FF4500',
    fontSize: 14,
    fontWeight: '600',
  },
  sandboxButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginTop: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  sandboxButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  policyDivider: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 4,
  },
});
