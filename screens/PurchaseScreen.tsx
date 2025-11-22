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
  Infinity as InfinityIcon,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSubscription } from '@/hooks/use-subscription-store';

interface PurchaseScreenProps {
  onClose?: () => void;
}

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
  { title: 'Все будущие функции', subtitle: 'Доступ ко всем обновлениям', icon: InfinityIcon },
];

export default function PurchaseScreen({ onClose }: PurchaseScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    packages,
    isPurchasing,
    purchasePackage,
    restorePurchases,
  } = useSubscription();

  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const fadeAnims = useRef(FEATURE_LIST.map(() => new Animated.Value(0))).current;
  const translateYAnims = useRef(FEATURE_LIST.map(() => new Animated.Value(10))).current;

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
      // Close screen on success
      if (onClose) onClose();
      else router.back();
    }
  };

  const handleRestore = async () => {
    const success = await restorePurchases();
    if (success) {
      Alert.alert('Успешно!', 'Подписка восстановлена', [{ 
        text: 'OK', 
        onPress: () => {
          if (onClose) onClose();
          else router.back();
        }
      }]);
    } else {
      Alert.alert('Информация', 'Активные подписки не найдены');
    }
  };

  const handleClose = () => {
    if (onClose) onClose();
    else router.back();
  };

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
           <View style={styles.headerLeft}>
             <Sparkles size={24} color="#FFD700" />
           </View>
           <TouchableOpacity 
            style={styles.closeButton} 
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
           >
             <X size={24} color="rgba(255,255,255,0.8)" />
           </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 180 }]} 
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

          {/* Plan Selector */}
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
    fontSize: 32,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 34,
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
    marginRight: 18,
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
    backgroundColor: '#000000',
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
    fontWeight: '400',
  },
  policyDivider: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.2)',
  },
});
