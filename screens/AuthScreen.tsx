import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/use-auth-store';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AuthScreenProps {
  onAuthSuccess?: () => void;
}

const { width, height } = Dimensions.get('window');

interface BubbleConfig {
  id: number;
  top: number;
  left: number;
  size: number;
  opacity: number;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [isTestingBackend, setIsTestingBackend] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const insets = useSafeAreaInsets();

  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslate = useRef(new Animated.Value(15)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslate = useRef(new Animated.Value(15)).current;
  const buttonScale = useRef(new Animated.Value(1.05)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0.3)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  const { loginWithApple, firebaseInitialized, initError } = useAuth();

  const bubbles = useMemo<BubbleConfig[]>(() => [
    { id: 1, top: height * 0.08, left: -width * 0.15, size: width * 0.5, opacity: 0.08 },
    { id: 2, top: height * 0.25, left: width * 0.65, size: width * 0.45, opacity: 0.06 },
    { id: 3, top: height * 0.55, left: -width * 0.2, size: width * 0.6, opacity: 0.05 },
    { id: 4, top: height * 0.7, left: width * 0.5, size: width * 0.55, opacity: 0.07 },
    { id: 5, top: height * 0.12, left: width * 0.35, size: width * 0.3, opacity: 0.04 },
  ], []);

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslate, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(subtitleTranslate, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(buttonScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(footerOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.5,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.3,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [titleOpacity, titleTranslate, subtitleOpacity, subtitleTranslate, buttonScale, buttonOpacity, footerOpacity, glowOpacity]);

  const testFirebaseConnection = async () => {
    console.log('[AuthScreen] Testing Firebase...');
    setIsTestingBackend(true);
    setDebugInfo('⏳ Проверка Firebase...');

    if (firebaseInitialized) {
      setDebugInfo(
        `✅ Firebase готов\n` +
        `Project: goalforge-ai-data\n` +
        `Domain: goalforge-ai-data.firebaseapp.com`
      );
    } else if (initError) {
      setDebugInfo(`❌ Ошибка Firebase:\n${initError}`);
    } else {
      setDebugInfo('⏳ Firebase инициализируется...');
    }

    setIsTestingBackend(false);
  };

  const handlePressIn = () => {
    setIsPressed(true);
    Animated.spring(pressScale, {
      toValue: 0.97,
      tension: 100,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    setIsPressed(false);
    Animated.spring(pressScale, {
      toValue: 1,
      tension: 100,
      friction: 10,
      useNativeDriver: true,
    }).start();
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
    <View style={styles.container}>
      <LinearGradient
        colors={['#020306', '#0A1628', '#0D1A2D']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.bubblesContainer}>
        {bubbles.map((bubble) => (
          <View
            key={bubble.id}
            style={[
              styles.bubble,
              {
                top: bubble.top,
                left: bubble.left,
                width: bubble.size,
                height: bubble.size,
                borderRadius: bubble.size / 2,
                opacity: bubble.opacity,
              },
            ]}
          />
        ))}
      </View>

      <View style={[styles.content, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.mainContent}>
          <Animated.View
            style={[
              styles.headerSection,
              {
                opacity: titleOpacity,
                transform: [{ translateY: titleTranslate }],
              },
            ]}
          >
            <Text style={styles.title}>Добро пожаловать!</Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.subtitleContainer,
              {
                opacity: subtitleOpacity,
                transform: [{ translateY: subtitleTranslate }],
              },
            ]}
          >
            <Text style={styles.subtitle}>
              Ваш ИИ-коуч ждёт —{'\n'}начните путь к целям
            </Text>
          </Animated.View>

          {__DEV__ && (
            <View style={styles.debugSection}>
              <TouchableOpacity
                style={styles.debugButton}
                onPress={testFirebaseConnection}
                disabled={isTestingBackend}
              >
                {isTestingBackend ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.debugButtonText}>
                    🔧 Тест Firebase
                  </Text>
                )}
              </TouchableOpacity>
              {debugInfo && (
                <Text style={styles.debugStatus}>{debugInfo}</Text>
              )}
            </View>
          )}

          <Animated.View
            style={[
              styles.buttonContainer,
              {
                opacity: buttonOpacity,
                transform: [
                  { scale: Animated.multiply(buttonScale, pressScale) },
                ],
              },
            ]}
          >
            {isAppleSignInAvailable ? (
              <TouchableOpacity
                style={[styles.appleButton, isLoading && styles.buttonDisabled]}
                onPress={handleAppleAuth}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={isLoading}
                activeOpacity={1}
                testID="apple-auth-button"
                accessibilityLabel="Войти с Apple"
                accessibilityRole="button"
              >
                <LinearGradient
                  colors={['#1E2430', '#151A24']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.buttonGradient}
                >
                  <Animated.View
                    style={[
                      styles.buttonGlow,
                      {
                        opacity: isPressed ? 0.6 : glowOpacity,
                      },
                    ]}
                  />
                  <View style={styles.buttonContent}>
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="logo-apple" size={22} color="#FFFFFF" />
                    )}
                    <Text style={styles.appleButtonText}>
                      {isLoading ? 'Входим...' : 'Войти с Apple'}
                    </Text>
                  </View>
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
        </View>

        <Animated.View
          style={[
            styles.footer,
            { opacity: footerOpacity },
          ]}
        >
          <Text style={styles.footerText}>
            Продолжая, вы соглашаетесь с{' '}
            <Text style={styles.linkText} onPress={handlePrivacyPress}>
              Политикой конфиденциальности
            </Text>
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020306',
  },
  bubblesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  bubble: {
    position: 'absolute',
    backgroundColor: '#1A2A40',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingTop: 60,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -40,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 34,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitleContainer: {
    alignItems: 'center',
    marginBottom: 48,
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 17,
    color: 'rgba(255, 255, 255, 0.75)',
    textAlign: 'center',
    lineHeight: 26,
    letterSpacing: 0.2,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 320,
  },
  appleButton: {
    width: '100%',
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.25)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 32,
    minHeight: 64,
  },
  buttonGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  appleButtonText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  webNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderRadius: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.15)',
  },
  webNoticeText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textAlign: 'center',
    flex: 1,
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  footerText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    lineHeight: 20,
  },
  linkText: {
    color: '#FFD700',
    fontWeight: '500' as const,
  },
  debugSection: {
    marginBottom: 24,
    width: '100%',
    maxWidth: 320,
  },
  debugButton: {
    backgroundColor: 'rgba(100, 100, 255, 0.2)',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(100, 100, 255, 0.3)',
  },
  debugButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  debugStatus: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
