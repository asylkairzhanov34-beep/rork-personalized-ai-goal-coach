import React, { useEffect, useRef } from 'react';
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
import { Target, Sparkles, ChevronRight } from 'lucide-react-native';
import { theme } from '@/constants/theme';

interface AuthScreenProps {
  onAuthSuccess?: () => void;
}

const { width, height } = Dimensions.get('window');

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(30)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const buttonSlide = useRef(new Animated.Value(50)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const featuresOpacity = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0.8)).current;

  const { loginWithApple } = useAuth();

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(titleSlide, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(featuresOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(buttonSlide, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0.8,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [logoScale, logoOpacity, titleSlide, titleOpacity, subtitleOpacity, buttonSlide, buttonOpacity, featuresOpacity, glowPulse]);

  const handleAppleAuth = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Ошибка', 'Apple Sign In доступен только на iOS');
      return;
    }

    setIsLoading(true);

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

  const features = [
    { icon: Target, text: 'Персональные цели' },
    { icon: Sparkles, text: 'ИИ-коучинг' },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#000000', '#0A0A0A', '#000000']}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View 
        style={[
          styles.glowOrb,
          {
            opacity: glowPulse,
            transform: [{ scale: glowPulse }],
          }
        ]} 
      />

      <View style={styles.patternOverlay}>
        {[...Array(8)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.patternCircle,
              {
                top: (height * 0.1) + (i * height * 0.12),
                left: i % 2 === 0 ? -50 : width - 100,
                width: 150 + (i * 20),
                height: 150 + (i * 20),
                opacity: 0.03 - (i * 0.003),
              },
            ]}
          />
        ))}
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topSection}>
            <Animated.View
              style={[
                styles.logoContainer,
                {
                  opacity: logoOpacity,
                  transform: [{ scale: logoScale }],
                },
              ]}
            >
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primaryDark]}
                style={styles.logoGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Target size={48} color="#000000" strokeWidth={2} />
              </LinearGradient>
              <View style={styles.logoGlow} />
            </Animated.View>

            <Animated.Text
              style={[
                styles.appName,
                {
                  opacity: titleOpacity,
                  transform: [{ translateY: titleSlide }],
                },
              ]}
            >
              GoalCoach AI
            </Animated.Text>

            <Animated.Text
              style={[
                styles.tagline,
                { opacity: subtitleOpacity },
              ]}
            >
              Достигайте целей с умным помощником
            </Animated.Text>
          </View>

          <Animated.View
            style={[
              styles.featuresContainer,
              { opacity: featuresOpacity },
            ]}
          >
            {features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.featureIconContainer}>
                  <feature.icon size={20} color={theme.colors.primary} />
                </View>
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </Animated.View>

          <Animated.View
            style={[
              styles.buttonContainer,
              {
                opacity: buttonOpacity,
                transform: [{ translateY: buttonSlide }],
              },
            ]}
          >
            {isAppleSignInAvailable ? (
              <TouchableOpacity
                style={[styles.appleButton, isLoading && styles.buttonDisabled]}
                onPress={handleAppleAuth}
                disabled={isLoading}
                activeOpacity={0.9}
                testID="apple-auth-button"
              >
                <LinearGradient
                  colors={['#FFFFFF', '#F5F5F5']}
                  style={styles.appleButtonGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#000000" />
                  ) : (
                    <>
                      <Text style={styles.appleIcon}></Text>
                      <Text style={styles.appleButtonText}>Войти с Apple</Text>
                      <ChevronRight size={20} color="#000000" style={styles.chevron} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View style={styles.webNotice}>
                <View style={styles.webNoticeIcon}>
                  <Target size={24} color={theme.colors.primary} />
                </View>
                <Text style={styles.webNoticeText}>
                  Вход через Apple доступен только на iOS устройствах.{'\n'}
                  Скачайте приложение в App Store.
                </Text>
              </View>
            )}

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>или</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.guestButton}
              onPress={onAuthSuccess}
              activeOpacity={0.8}
            >
              <Text style={styles.guestButtonText}>Продолжить без входа</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View
            style={[
              styles.footer,
              { opacity: buttonOpacity },
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  keyboardView: {
    flex: 1,
  },
  glowOrb: {
    position: 'absolute',
    top: '15%',
    left: '50%',
    marginLeft: -150,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: theme.colors.primary,
    opacity: 0.08,
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
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  topSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  logoGradient: {
    width: 100,
    height: 100,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 42,
    backgroundColor: theme.colors.primary,
    opacity: 0.15,
    zIndex: -1,
  },
  appName: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: 12,
  },
  tagline: {
    fontSize: 17,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    marginBottom: 48,
  },
  featureItem: {
    alignItems: 'center',
    gap: 8,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: theme.colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
  },
  featureText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500' as const,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    gap: 16,
  },
  appleButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  appleButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    minHeight: 60,
  },
  appleIcon: {
    fontSize: 24,
    color: '#000000',
    marginRight: 12,
  },
  appleButtonText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#000000',
    flex: 1,
  },
  chevron: {
    marginLeft: 8,
  },
  webNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  webNoticeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webNoticeText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    color: theme.colors.textLight,
    fontSize: 13,
    marginHorizontal: 16,
    fontWeight: '500' as const,
  },
  guestButton: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  guestButtonText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: theme.colors.textSecondary,
  },
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 32,
  },
  footerText: {
    fontSize: 12,
    color: theme.colors.textLight,
    textAlign: 'center',
    lineHeight: 18,
  },
  linkText: {
    color: theme.colors.primary,
    fontWeight: '500' as const,
  },
});
