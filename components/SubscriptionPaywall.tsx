import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Crown, Lock } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/theme';

interface SubscriptionPaywallProps {
  visible: boolean;
  onClose?: () => void;
  feature?: string;
  message?: string;
  fullscreen?: boolean;
}

export default function SubscriptionPaywall({
  visible,
  onClose,
  feature = 'эта функция',
  message = 'Получите полный доступ к GoalForge',
  fullscreen = false,
}: SubscriptionPaywallProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    if (onClose) onClose();
    router.push('/subscription');
  };

  if (!visible) return null;

  const content = (
    <LinearGradient
      colors={fullscreen ? [COLORS.primary, COLORS.secondary] : ['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.95)']}
      style={fullscreen ? styles.fullscreenContainer : styles.modalContainer}
    >
      <View style={styles.content}>
        <Lock size={60} color="#FFD700" style={styles.lockIcon} />
        
        <Text style={styles.title}>
          {fullscreen ? 'Пробный период истёк' : 'Premium функция'}
        </Text>
        
        <Text style={styles.message}>
          {fullscreen 
            ? 'Ваш пробный период истек. Оформите Premium подписку для продолжения использования приложения.'
            : `${feature} доступна только с Premium подпиской`}
        </Text>
        
        <Text style={styles.subtitle}>{message}</Text>

        <TouchableOpacity
          style={styles.upgradeButton}
          onPress={handleUpgrade}
          activeOpacity={0.8}
        >
          <Crown size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
          <Text style={styles.upgradeButtonText}>Разблокировать Premium</Text>
        </TouchableOpacity>

        {!fullscreen && onClose && (
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.closeButtonText}>Закрыть</Text>
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
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
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  fullscreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  content: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
  },
  lockIcon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  upgradeButton: {
    flexDirection: 'row',
    backgroundColor: '#FFD700',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  upgradeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  closeButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  closeButtonText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});