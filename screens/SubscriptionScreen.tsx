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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Check, Sparkles, Info } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSubscription } from '@/hooks/use-subscription-store';
import { COLORS } from '@/constants/theme';

export default function SubscriptionScreen() {
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

  const features = [
    'Безграничный доступ к ИИ-помощнику',
    'Детальные планы задач с упражнениями',
    'Персонализированные рекомендации',
    'Расширенная статистика и аналитика',
    'Неограниченное количество целей',
    'Приоритетная поддержка',
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
            <Text style={styles.title}>Разблокировать Premium</Text>
            <Text style={styles.subtitle}>
              Получите максимум от GoalForge
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

          <View style={styles.featuresContainer}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.checkIcon}>
                  <Check size={18} color="#FFD700" />
                </View>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
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
              <Text style={styles.purchaseButtonText}>Продолжить</Text>
            )}
          </TouchableOpacity>

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

          <Text style={styles.termsText}>
            Подписка автоматически продлевается, если не отменена за 24 часа до окончания периода.
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
    fontSize: 16,
    color: '#fff',
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
  },
});
