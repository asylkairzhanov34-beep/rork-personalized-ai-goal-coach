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
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/use-auth-store';
import { Ionicons } from '@expo/vector-icons';

interface AuthScreenProps {
  onAuthSuccess?: () => void;
}

const { width, height } = Dimensions.get('window');

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [isTestingBackend, setIsTestingBackend] = useState(false);

  const logoScale = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const buttonSlide = useRef(new Animated.Value(50)).current;
  const glowAnim = useRef(new Animated.Value(0.95)).current;

  const { loginWithApple } = useAuth();

  useEffect(() => {
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
  }, [logoScale, fadeAnim, buttonSlide, glowAnim]);

  const testBackendConnection = async () => {
    const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
    console.log('[AuthScreen] Testing backend...');
    console.log('[AuthScreen] Base URL:', baseUrl);

    if (!baseUrl) {
      setDebugInfo('❌ Backend URL не настроен');
      Alert.alert('Ошибка', 'EXPO_PUBLIC_RORK_API_BASE_URL не установлен');
      return;
    }

    setIsTestingBackend(true);
    setDebugInfo('⏳ Тестирование...');

    try {
      const healthUrl = `${baseUrl}/health`;
      console.log('[AuthScreen] Fetching:', healthUrl);

      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const text = await response.text();
      console.log('[AuthScreen] Response:', response.status, text);

      if (response.ok) {
        try {
          const data = JSON.parse(text);
          const dbStatus = data.database?.ready ? '✅' : '❌';
          const dbConnection = data.database?.connectionOk ? '✅' : '⚠️';
          setDebugInfo(
            `✅ Backend OK\n` +
            `DB Ready: ${dbStatus}\n` +
            `DB Connected: ${dbConnection}\n` +
            `Time: ${data.timestamp}`
          );
        } catch {
          setDebugInfo(`✅ Backend доступен\nОтвет: ${text.substring(0, 50)}`);
        }
      } else {
        setDebugInfo(`❌ HTTP ${response.status}\n${text.substring(0, 100)}`);
      }
    } catch (error) {
      console.error('[AuthScreen] Test error:', error);
      setDebugInfo(`❌ Ошибка: ${error instanceof Error ? error.message : 'Unknown'}`);
    } finally {
      setIsTestingBackend(false);
    }
  };

  const handleAppleAuth = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Ошибка', 'Apple Sign In доступен только на iOS');
      return;
    }

    setIsLoading(true);
    setDebugInfo(null);

    try {
      console.log('[AuthScreen] Starting Apple auth...');
      const result = await loginWithApple();

      if (result === 'success') {
        console.log('[AuthScreen] Auth success!');
        onAuthSuccess?.();
      } else if (result === 'canceled') {
        console.log('[AuthScreen] Auth canceled');
      }
    } catch (error) {
      console.error('[AuthScreen] Auth error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      
      if (!errorMessage.includes('cancel')) {
        Alert.alert(
          'Ошибка авторизации',
          errorMessage,
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrivacyPress = () => {
    Linking.openURL('https://www.notion.so/PRIVACY-POLICY-AND-COOKIES-2b44e106d5d0807aaff8e5765d4b8539');
  };

  const isAppleSignInAvailable = Platform.OS === 'ios';

  return (
    <LinearGradient
      colors={['#000000', '#001F3F']}
      style={styles.container}
    >
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

      <LinearGradient
        colors={['transparent', 'rgba(255, 215, 0, 0.05)', 'transparent']}
        style={styles.centerGlow}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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

          <Animated.View
            style={[
              styles.form,
              {
                opacity: fadeAnim,
                transform: [{ translateY: buttonSlide }],
              },
            ]}
          >
            {__DEV__ && (
              <View style={styles.debugSection}>
                <TouchableOpacity
                  style={styles.debugButton}
                  onPress={testBackendConnection}
                  disabled={isTestingBackend}
                >
                  {isTestingBackend ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.debugButtonText}>
                      🔧 Тест подключения к серверу
                    </Text>
                  )}
                </TouchableOpacity>
                {debugInfo && (
                  <Text style={styles.debugStatus}>{debugInfo}</Text>
                )}
              </View>
            )}

            {isAppleSignInAvailable ? (
              <TouchableOpacity
                style={[styles.appleButton, isLoading && styles.buttonDisabled]}
                onPress={handleAppleAuth}
                disabled={isLoading}
                activeOpacity={0.9}
                testID="apple-auth-button"
              >
                <LinearGradient
                  colors={['#000000', '#1A1A1A']}
                  style={styles.buttonGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="logo-apple" size={24} color="#FFFFFF" />
                  )}
                  <Text style={styles.appleButtonText}>
                    {isLoading ? 'Входим...' : 'Войти с Apple'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View style={styles.webNotice}>
                <Ionicons name="information-circle-outline" size={24} color="#FFD700" />
                <Text style={styles.webNoticeText}>
                  Вход через Apple доступен только на iOS устройствах
                </Text>
              </View>
            )}
          </Animated.View>

          <Animated.View
            style={[
              styles.footer,
              { opacity: Animated.multiply(fadeAnim, 0.7) },
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
  keyboardView: {
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
    fontWeight: '800' as const,
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
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
  buttonDisabled: {
    opacity: 0.7,
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
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  webNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 16,
    gap: 12,
  },
  webNoticeText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    flex: 1,
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
    fontWeight: '500' as const,
  },
  debugSection: {
    marginBottom: 20,
    width: '100%',
  },
  debugButton: {
    backgroundColor: 'rgba(100, 100, 255, 0.3)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  debugButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  debugStatus: {
    color: '#AAAAAA',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
