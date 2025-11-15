import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Animated,
  Dimensions,
  Linking,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '@/hooks/use-auth-store';
import { Ionicons } from '@expo/vector-icons';
import { Lock } from 'lucide-react-native';

const GoogleIcon = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <Path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <Path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <Path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </Svg>
);

interface AuthScreenProps {
  onAuthSuccess?: () => void;
}

const { width, height } = Dimensions.get('window');

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  // Анимации
  const logoScale = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const buttonSlide = useRef(new Animated.Value(50)).current;
  const glowAnim = useRef(new Animated.Value(0.95)).current;

  const { loginWithApple, loginWithGoogle } = useAuth();



  useEffect(() => {
    // Запуск анимаций при загрузке
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 10,
        friction: 2,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(buttonSlide, {
        toValue: 0,
        duration: 600,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Пульсация логотипа
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.95,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleAppleAuth = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Error', 'Apple Sign In is only available on iOS');
      return;
    }

    setIsLoading(true);
    try {
      await loginWithApple();
      onAuthSuccess?.();
    } catch (error) {
      if ((error as any)?.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Error', (error as Error).message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    try {
      await loginWithGoogle();
      onAuthSuccess?.();
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const isAppleSignInAvailable = Platform.OS === 'ios';

  const handlePrivacyPress = () => {
    Linking.openURL('https://example.com/privacy');
  };

  return (
    <LinearGradient
      colors={['#000000', '#001F3F']}
      style={styles.container}
    >
      {/* Фоновый паттерн */}
      <View style={styles.patternOverlay}>
        {[...Array(6)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.patternCircle,
              {
                top: Math.random() * height,
                left: Math.random() * width,
                width: 100 + Math.random() * 200,
                height: 100 + Math.random() * 200,
              },
            ]}
          />
        ))}
      </View>

      {/* Центральное свечение */}
      <LinearGradient
        colors={['transparent', 'rgba(255, 215, 0, 0.05)', 'transparent']}
        style={styles.centerGlow}
      />
      
      <View style={styles.mainContent}>
        {/* Анимированный логотип */}
        <Animated.View
          style={[
            styles.logoSection,
            {
              transform: [
                { scale: Animated.multiply(logoScale, glowAnim) },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={['#FFD700', '#FFA500']}
            style={styles.logoGradient}
          >
            <Text style={styles.logoText}>R</Text>
          </LinearGradient>
          <View style={styles.logoGlow} />
        </Animated.View>

        {/* Заголовок с анимацией */}
        <Animated.View
          style={[
            styles.content,
            { opacity: fadeAnim },
          ]}
        >
          <Text style={styles.title}>Добро пожаловать!</Text>
          <Text style={styles.subtitle}>
            Ваш ИИ-коуч ждет — начните путь к целям
          </Text>

          {/* Анимированные кнопки входа */}
          <Animated.View
            style={[
              styles.form,
              {
                opacity: fadeAnim,
                transform: [{ translateY: buttonSlide }],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleAuth}
              disabled={isLoading}
              activeOpacity={0.9}
              testID="google-auth-button"
            >
              <LinearGradient
                colors={['#FFFFFF', '#F8F8F8']}
                style={styles.buttonGradient}
              >
                <GoogleIcon size={24} />
                <Text style={styles.googleButtonText}>
                  {isLoading ? 'Входим...' : 'Войти с Google'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Разделитель */}
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>или</Text>
              <View style={styles.divider} />
            </View>

            {isAppleSignInAvailable && (
              <TouchableOpacity
                style={styles.appleButton}
                onPress={handleAppleAuth}
                disabled={isLoading}
                activeOpacity={0.9}
                testID="apple-auth-button"
              >
                <LinearGradient
                  colors={['#000000', '#1A1A1A']}
                  style={styles.buttonGradient}
                >
                  <Ionicons name="logo-apple" size={24} color="#FFFFFF" />
                  <Text style={styles.appleButtonText}>
                    {isLoading ? 'Входим...' : 'Войти с Apple ID'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </Animated.View>
        </Animated.View>

        {/* Privacy Policy с анимацией */}
        <Animated.View
          style={[
            styles.footer,
            {
              opacity: Animated.multiply(fadeAnim, 0.7),
            },
          ]}
        >
          <Lock size={12} color="#FFD700" style={styles.lockIcon} />
          <Text style={styles.footerText}>
            Продолжая, вы соглашаетесь с{' '}
            <Text style={styles.linkText} onPress={handlePrivacyPress}>
              Политикой конфиденциальности
            </Text>
          </Text>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  patternOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  patternCircle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'rgba(255, 215, 0, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.05)',
  },
  centerGlow: {
    position: 'absolute',
    top: '30%',
    left: '-50%',
    right: '-50%',
    height: '40%',
    opacity: 0.3,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  logoText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
  },
  logoGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    zIndex: -1,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
  },
  subtitle: {
    fontSize: 16,
    color: '#A9A9A9',
    marginBottom: 48,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  form: {
    width: '100%',
    maxWidth: 340,
  },
  googleButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  appleButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    minHeight: 56,
    gap: 12,
  },
  googleButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  appleButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(169, 169, 169, 0.3)',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#A9A9A9',
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  lockIcon: {
    marginRight: 6,
  },
  footerText: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 18,
  },
  linkText: {
    color: '#FFD700',
    fontWeight: '500',
  },
});