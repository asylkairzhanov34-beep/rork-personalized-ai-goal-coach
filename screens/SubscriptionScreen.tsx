import React, { useState, useEffect } from 'react';
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
import { 
  X, 
  Check, 
  Sparkles, 
  Crown, 
  Star, 
  Zap, 
  TrendingUp, 
  Clock, 
  Calendar, 
  MessageCircle, 
  Award,
  Smartphone
} from 'lucide-react-native';
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

  useEffect(() => {
    if (packages.length > 0 && !selectedPackage) {
      // Prefer yearly package if available as default
      const yearly = packages.find(p => p.identifier.toLowerCase().includes('year') || p.identifier.toLowerCase().includes('annual'));
      if (yearly) {
        setSelectedPackage(yearly.identifier);
      } else {
        setSelectedPackage(packages[0].identifier);
      }
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
      Linking.openURL('https://apps.apple.com/account/subscriptions');
    } else if (Platform.OS === 'android') {
      Linking.openURL('https://play.google.com/store/account/subscriptions');
    } else {
      Alert.alert('Info', 'Web subscription management');
    }
  };

  const premiumFeatures = [
    { title: 'Ежедневный ИИ-коуч', icon: <Smartphone size={20} color="#FFD700" /> },
    { title: 'Полный недельный/месячный план', icon: <Calendar size={20} color="#FFD700" /> },
    { title: 'Weekly AI Report', icon: <TrendingUp size={20} color="#FFD700" /> },
    { title: 'Все персональные советы', icon: <Sparkles size={20} color="#FFD700" /> },
    { title: 'Умные задачи', icon: <Check size={20} color="#FFD700" /> },
    { title: 'История 7–90 дней', icon: <Clock size={20} color="#FFD700" /> },
    { title: 'Уровни и награды', icon: <Award size={20} color="#FFD700" /> },
    { title: 'ИИ-чат помощник', icon: <MessageCircle size={20} color="#FFD700" /> },
    { title: 'Приоритетная скорость', icon: <Zap size={20} color="#FFD700" /> },
    { title: 'Умный Pomodoro с аналитикой', icon: <Clock size={20} color="#FFD700" /> }, // Using Clock as placeholder for Pomodoro if specific icon not available
    { title: 'Все будущие функции', icon: <Star size={20} color="#FFD700" /> },
  ];

  if (isPremium) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[COLORS.primary, '#1a1a2e']}
          style={styles.gradient}
        >
          <SafeAreaView style={styles.safeArea}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => router.back()}
            >
              <X size={24} color="#fff" />
            </TouchableOpacity>

            <View style={styles.successContent}>
              <View style={styles.crownContainer}>
                <LinearGradient
                  colors={['#FFD700', '#FFA500']}
                  style={styles.crownCircle}
                >
                  <Crown size={48} color="#fff" />
                </LinearGradient>
              </View>
              <Text style={styles.premiumTitle}>Вы Premium!</Text>
              <Text style={styles.premiumSubtitle}>
                Все возможности GoalForge разблокированы.
              </Text>
              
              <TouchableOpacity
                style={styles.manageButton}
                onPress={handleManageSubscription}
              >
                <Text style={styles.manageButtonText}>Управление подпиской</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f0c29', '#302b63', '#24243e']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.closeIcon}
                onPress={() => router.back()}
              >
                <X size={24} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>

            <View style={styles.heroSection}>
              <View style={styles.iconWrapper}>
                 <LinearGradient
                    colors={['#FFD700', '#FFA500']}
                    style={styles.iconGradient}
                  >
                    <Crown size={40} color="#FFF" />
                  </LinearGradient>
              </View>
              <Text style={styles.title}>GoalForge <Text style={styles.goldText}>Premium</Text></Text>
              <Text style={styles.subtitle}>Раскрой свой потенциал на 100%</Text>
            </View>

            <View style={styles.featuresContainer}>
              {premiumFeatures.map((item, index) => (
                <View key={index} style={styles.featureRow}>
                  <View style={styles.featureIconContainer}>
                    {item.icon}
                  </View>
                  <Text style={styles.featureText}>{item.title}</Text>
                </View>
              ))}
            </View>
            
            <View style={styles.plansSection}>
               <Text style={styles.sectionTitle}>Выберите план</Text>
               {packages.length === 0 ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#FFD700" />
                    <Text style={styles.loadingText}>Загрузка тарифов...</Text>
                  </View>
               ) : (
                 packages.map((pkg) => {
                   const isSelected = selectedPackage === pkg.identifier;
                   const isYearly = pkg.identifier.toLowerCase().includes('year') || pkg.identifier.toLowerCase().includes('annual');
                   
                   return (
                    <TouchableOpacity
                      key={pkg.identifier}
                      style={[
                        styles.planCard,
                        isSelected && styles.planCardSelected
                      ]}
                      onPress={() => setSelectedPackage(pkg.identifier)}
                      activeOpacity={0.9}
                    >
                      {isSelected && (
                        <View style={styles.selectedBadge}>
                          <Check size={12} color="#000" strokeWidth={4} />
                        </View>
                      )}
                      
                      {isYearly && (
                        <View style={styles.bestValueBadge}>
                          <Text style={styles.bestValueText}>ВЫГОДНО</Text>
                        </View>
                      )}

                      <View style={styles.planInfo}>
                        <Text style={styles.planTitle}>{pkg.product.title}</Text>
                        <Text style={styles.planPrice}>{pkg.product.priceString}</Text>
                        {isYearly && (
                          <Text style={styles.planSubtext}>~{(pkg.product.price / 12).toFixed(2)} {pkg.product.currencyCode}/мес</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                   );
                 })
               )}
            </View>

            <View style={styles.footer}>
              <Text style={styles.trialText}>
                3 дня бесплатно, затем автоматическое продление.
              </Text>
              
              <TouchableOpacity
                style={[
                  styles.ctaButton,
                  (isPurchasing || packages.length === 0) && styles.ctaButtonDisabled
                ]}
                onPress={handlePurchase}
                disabled={isPurchasing || packages.length === 0}
              >
                <LinearGradient
                  colors={['#FFD700', '#FFA500']}
                  style={styles.ctaGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                   {isPurchasing ? (
                      <ActivityIndicator color="#FFF" />
                   ) : (
                      <Text style={styles.ctaText}>
                        {selectedPackage?.toLowerCase().includes('year') || selectedPackage?.toLowerCase().includes('annual') 
                          ? 'Попробовать бесплатно и подписаться' 
                          : 'Подписаться сейчас'}
                      </Text>
                   )}
                </LinearGradient>
              </TouchableOpacity>

              {skipButton && (
                <TouchableOpacity 
                  style={styles.skipBtn}
                  onPress={() => router.replace('/(tabs)/home')}
                >
                  <Text style={styles.skipBtnText}>Пропустить</Text>
                </TouchableOpacity>
              )}

              <View style={styles.linksRow}>
                <TouchableOpacity onPress={handleRestore} disabled={isRestoring}>
                   <Text style={styles.linkText}>{isRestoring ? 'Восстановление...' : 'Восстановить'}</Text>
                </TouchableOpacity>
                <Text style={styles.linkDivider}>•</Text>
                <TouchableOpacity onPress={() => Linking.openURL('https://goalforge.app/terms')}>
                   <Text style={styles.linkText}>Условия</Text>
                </TouchableOpacity>
                <Text style={styles.linkDivider}>•</Text>
                 <TouchableOpacity onPress={() => Linking.openURL('https://goalforge.app/privacy')}>
                   <Text style={styles.linkText}>Конфиденциальность</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Bottom spacer */}
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0c29',
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  closeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  iconWrapper: {
    marginBottom: 16,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  goldText: {
    color: '#FFD700',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  featuresContainer: {
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureText: {
    fontSize: 15,
    color: '#E0E0E0',
    fontWeight: '500',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 16,
    marginLeft: 4,
  },
  plansSection: {
    paddingHorizontal: 24,
    marginBottom: 30,
  },
  planCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planCardSelected: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
  },
  planInfo: {
    flex: 1,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFD700',
  },
  planSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  selectedBadge: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#FFD700',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  bestValueBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF4444',
    borderBottomLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  bestValueText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFF',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.5)',
    marginTop: 10,
  },
  footer: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  trialText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 16,
    textAlign: 'center',
  },
  ctaButton: {
    width: '100%',
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    marginBottom: 16,
  },
  ctaButtonDisabled: {
    opacity: 0.7,
  },
  ctaGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#302b63',
  },
  skipBtn: {
    padding: 10,
    marginBottom: 20,
  },
  skipBtnText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  linksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  linkText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  linkDivider: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.2)',
    marginHorizontal: 4,
  },
  
  // Success View Styles
  successContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crownContainer: {
    marginBottom: 30,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
  },
  crownCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 12,
  },
  premiumSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 40,
  },
  manageButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  manageButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});