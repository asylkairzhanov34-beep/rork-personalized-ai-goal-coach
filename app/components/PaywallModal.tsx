import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Calendar, FileText, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
}

const { width } = Dimensions.get('window');

export default function PaywallModal({ visible, onClose }: PaywallModalProps) {
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: (t) => t * (2 - t), // Ease out quad
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, scaleAnim, opacityAnim]);

  const handleContinue = () => {
    onClose();
    router.push('/subscription');
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <Animated.View 
          style={[
            styles.backdrop, 
            { opacity: opacityAnim }
          ]} 
        >
            <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
        </Animated.View>

        <Animated.View
          style={[
            styles.modal,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <LinearGradient
            colors={['#1A1A1A', '#000000']}
            style={styles.gradient}
          >
            <View style={styles.content}>
                <View style={styles.headerIcon}>
                    <Sparkles size={32} color="#FFD700" />
                </View>

              <Text style={styles.title}>
                Попробуй GoalForge Premium — 1 день бесплатно
              </Text>
              
              <Text style={styles.subtitle}>
                Раскройте полный потенциал вашей продуктивности с эксклюзивными функциями
              </Text>

              <View style={styles.features}>
                <View style={styles.featureRow}>
                  <View style={styles.iconBg}>
                    <Sparkles size={20} color="#FFD700" />
                  </View>
                  <Text style={styles.featureText}>Ежедневный ИИ-коуч</Text>
                </View>
                <View style={styles.featureRow}>
                  <View style={styles.iconBg}>
                    <Calendar size={20} color="#FFD700" />
                  </View>
                  <Text style={styles.featureText}>Полный недельный план</Text>
                </View>
                <View style={styles.featureRow}>
                  <View style={styles.iconBg}>
                    <FileText size={20} color="#FFD700" />
                  </View>
                  <Text style={styles.featureText}>Weekly AI Report</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleContinue}
                activeOpacity={0.9}
              >
                <LinearGradient
                    colors={['#FFD700', '#FFB300']}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Text style={styles.primaryButtonText}>Попробовать бесплатно</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryButtonText}>Продолжить без Premium</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modal: {
    width: width - 48,
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.15)',
    backgroundColor: '#000',
  },
  gradient: {
    padding: 24,
  },
  content: {
    alignItems: 'center',
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  features: {
    width: '100%',
    gap: 16,
    marginBottom: 32,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 12,
    borderRadius: 16,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  primaryButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  buttonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#000000',
  },
  secondaryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '500',
  },
});
