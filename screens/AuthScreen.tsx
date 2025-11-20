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
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/use-auth-store';
import { Ionicons } from '@expo/vector-icons';



interface AuthScreenProps {
  onAuthSuccess?: () => void;
}

const { width, height } = Dimensions.get('window');

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Анимации
  const logoScale = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const buttonSlide = useRef(new Animated.Value(50)).current;
  const glowAnim = useRef(new Animated.Value(0.95)).current;

  const { loginWithApple, loginWithEmail } = useAuth();



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

  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }
    
    setIsLoading(true);
    try {
      await loginWithEmail({ email, password });
      onAuthSuccess?.();
    } catch (error) {
      Alert.alert('Ошибка', (error as Error).message);
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
      
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Заголовок */}
          <Animated.View
            style={[
              styles.headerSection,
              { opacity: fadeAnim },
            ]}
          >
            <Text style={styles.title}>Добро пожаловать!</Text>
            <Text style={styles.subtitle}>
              Ваш ИИ-коуч ждёт — начните путь к целям
            </Text>
          </Animated.View>

          {/* Кнопки входа */}
          <Animated.View
            style={[
              styles.form,
              {
                opacity: fadeAnim,
                transform: [{ translateY: buttonSlide }],
              },
            ]}
          >
            {/* Apple Sign In Button */}
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
                    {isLoading ? 'Входим...' : 'Войти с Apple'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Разделитель */}
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>или</Text>
              <View style={styles.divider} />
            </View>

            {/* Email Button */}
            <TouchableOpacity
              style={styles.emailToggleButton}
              onPress={() => setShowEmailForm(!showEmailForm)}
              activeOpacity={0.9}
              testID="email-toggle-button"
            >
              <Text style={styles.emailToggleButtonText}>Войти по Email</Text>
            </TouchableOpacity>

            {/* Email Form - Collapsible */}
            {showEmailForm && (
              <Animated.View style={styles.emailFormContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#666666"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  testID="email-input"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Пароль"
                  placeholderTextColor="#666666"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password"
                  testID="password-input"
                />
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleEmailAuth}
                  disabled={isLoading}
                  activeOpacity={0.9}
                  testID="email-login-button"
                >
                  <LinearGradient
                    colors={['#FFD700', '#FFA500']}
                    style={styles.buttonGradient}
                  >
                    <Text style={styles.primaryButtonText}>
                      {isLoading ? 'Входим...' : 'Войти'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Links Row */}
                <View style={styles.linksRow}>
                  <TouchableOpacity
                    onPress={() => Alert.alert('Создать аккаунт', 'Функция в разработке')}
                    testID="create-account-link"
                  >
                    <Text style={styles.linkTextSmall}>Создать аккаунт</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => Alert.alert('Забыли пароль?', 'Функция в разработке')}
                    testID="forgot-password-link"
                  >
                    <Text style={styles.linkTextSmall}>Забыли пароль?</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}
          </Animated.View>

          {/* Privacy Policy */}
          <Animated.View
            style={[
              styles.footer,
              {
                opacity: Animated.multiply(fadeAnim, 0.7),
              },
            ]}
          >
            <Text style={styles.footerText}>
              Продолжая, вы соглашаетесь с{' '}
              <Text style={styles.linkText} onPress={handlePrivacyPress}>
                Политикой конфиденциальности
              </Text>
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
    paddingBottom: 32,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 32,
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
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  form: {
    width: '100%',
    maxWidth: 340,
    marginBottom: 32,
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#A9A9A9',
    fontSize: 14,
  },
  emailToggleButton: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 18,
    paddingHorizontal: 24,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailToggleButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emailFormContainer: {
    marginTop: 20,
    width: '100%',
    gap: 12,
  },
  input: {
    width: '100%',
    height: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  primaryButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
  },
  linksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  linkTextSmall: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
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