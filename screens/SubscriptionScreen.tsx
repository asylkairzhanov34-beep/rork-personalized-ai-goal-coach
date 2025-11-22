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
  StatusBar,
} from 'react-native';
import { 
  X, 
  Bot, 
  CalendarRange, 
  LineChart, 
  Sparkles, 
  BrainCircuit, 
  History, 
  Trophy, 
  MessageCircle, 
  Zap, 
  Timer, 
  Star
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSubscription } from '@/hooks/use-subscription-store';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface SubscriptionScreenProps {
  skipButton?: boolean;
}

export default function SubscriptionScreen({ skipButton = false }: SubscriptionScreenProps) {
  const router = useRouter();
  const {
    packages,
    isPurchasing,
    purchasePackage,
    restorePurchases,
  } = useSubscription();

  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  // Auto-select annual package or first available
  useEffect(() => {
    if (packages.length > 0 && !selectedPackage) {
      // Try to find annual package first
      const annual = packages.find(p => p.identifier.toLowerCase().includes('year') || p.identifier.toLowerCase().includes('annual'));
      if (annual) {
        setSelectedPackage(annual.identifier);
      } else {
        setSelectedPackage(packages[0].identifier);
      }
    }
  }, [packages, selectedPackage]);

  const handlePurchase = async () => {
    if (!selectedPackage) {
      Alert.alert('Ошибка', 'План не выбран');
      return;
    }

    const success = await purchasePackage(selectedPackage);
    
    if (success) {
      Alert.alert(
        'Успешно!',
        'Premium активирован',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } else {
      // Error is usually handled by the hook/store or alert there, 
      // but if not, we can show a generic one.
      // User friendly error message is better.
    }
  };

  const handleRestore = async () => {
    const success = await restorePurchases();
    if (success) {
      Alert.alert(
        'Успешно!',
        'Покупки восстановлены',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } else {
      Alert.alert('Инфо', 'Активные подписки не найдены');
    }
  };

  const features = [
    { title: 'Ежедневный ИИ-коуч', icon: Bot },
    { title: 'Полный недельный/месячный план', icon: CalendarRange },
    { title: 'Weekly AI Report', icon: LineChart },
    { title: 'Персональные советы', icon: Sparkles },
    { title: 'Умные задачи', icon: BrainCircuit },
    { title: 'История 7–90 дней', icon: History },
    { title: 'Уровни и награды', icon: Trophy },
    { title: 'ИИ-чат помощник', icon: MessageCircle },
    { title: 'Приоритетная скорость', icon: Zap },
    { title: 'Pomodoro с аналитикой', icon: Timer },
    { title: 'Все будущие функции', icon: Star },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Close Button */}
      <TouchableOpacity 
        style={styles.closeButton} 
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        <X color="#fff" size={24} />
      </TouchableOpacity>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            Откройте весь потенциал GoalForge
          </Text>
          <Text style={styles.subtitle}>
            Premium помогает расти быстрее и точнее.
          </Text>
        </View>

        {/* 2. Features List */}
        <View style={styles.featuresContainer}>
          {features.map((feature, index) => (
            <Animated.View 
              key={index}
              entering={FadeInDown.delay(index * 50).springify()}
              style={styles.featureCard}
            >
              <View style={styles.featureIconContainer}>
                <feature.icon size={24} color="#FFD600" />
              </View>
              <Text style={styles.featureText}>{feature.title}</Text>
            </Animated.View>
          ))}
        </View>

        {/* Extra padding for the fixed bottom CTA */}
        <View style={{ height: 180 }} />
      </ScrollView>

      {/* 3. Fixed CTA */}
      <View style={styles.ctaContainer}>
        <LinearGradient
          colors={['rgba(0,0,0,0)', '#000', '#000']}
          style={styles.gradientOverlay}
          pointerEvents="none"
        />
        
        {/* Package Selector (Minimalist) if multiple packages exist */}
        {packages.length > 1 && (
          <View style={styles.packageSelector}>
             {packages.map((pkg) => {
                const isSelected = selectedPackage === pkg.identifier;
                // Try to determine label based on package type
                let label = "План";
                const id = pkg.identifier.toLowerCase();
                
                if (id.includes('year') || id.includes('annual')) label = "12 месяцев";
                else if (id.includes('month')) label = "1 месяц";
                else if (id.includes('week')) label = "1 неделя";
                else if (id.includes('life')) label = "Навсегда";
                else label = pkg.product.title;
                
                return (
                  <TouchableOpacity
                    key={pkg.identifier}
                    onPress={() => setSelectedPackage(pkg.identifier)}
                    style={[
                      styles.packageOption, 
                      isSelected && styles.packageOptionSelected
                    ]}
                  >
                    <Text style={[
                      styles.packageOptionText,
                      isSelected && styles.packageOptionTextSelected
                    ]}>{label}</Text>
                    {isSelected && (
                      <View style={styles.priceBadge}>
                        <Text style={styles.priceBadgeText}>{pkg.product.priceString}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
             })}
          </View>
        )}

        <TouchableOpacity
          style={styles.ctaButton}
          activeOpacity={0.9}
          onPress={handlePurchase}
          disabled={isPurchasing}
        >
          <LinearGradient
            colors={['#FFD600', '#FFC000']}
            style={styles.ctaGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isPurchasing ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.ctaText}>Открыть Premium</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Отмена в любой момент. Без риска.</Text>
          <TouchableOpacity onPress={handleRestore}>
             <Text style={[styles.footerText, { textDecorationLine: 'underline', marginTop: 4 }]}>
               Восстановить покупки
             </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 24,
    zIndex: 100,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    maxWidth: '80%',
    lineHeight: 22,
  },
  featuresContainer: {
    gap: 12,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 0, 0.2)',
  },
  featureIconContainer: {
    marginRight: 16,
    // Add a subtle glow to icon container if needed, but minimalistic is better
  },
  featureText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    flex: 1,
  },
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    alignItems: 'center',
  },
  gradientOverlay: {
    position: 'absolute',
    top: -60,
    left: 0,
    right: 0,
    bottom: 0,
  },
  ctaButton: {
    width: '100%',
    height: 64,
    borderRadius: 40,
    overflow: 'hidden',
    shadowColor: '#FFD600',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
  ctaGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '700',
  },
  footer: {
    marginTop: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  packageSelector: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 4,
  },
  packageOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  packageOptionSelected: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  packageOptionText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '500',
  },
  packageOptionTextSelected: {
    color: '#FFFFFF',
  },
  priceBadge: {
    backgroundColor: '#FFD600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priceBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  }
});
