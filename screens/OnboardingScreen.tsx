import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Target, Sparkles, TrendingUp } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { Button } from '@/components/Button';
import { GradientBackground } from '@/components/GradientBackground';
import { useGoalStore } from '@/hooks/use-goal-store';

const onboardingSteps = [
  {
    icon: Target,
    title: 'Поставьте свою цель',
    description: 'Расскажите нам, чего вы хотите достичь, и мы создадим персональный план',
  },
  {
    icon: Sparkles,
    title: 'Планирование с ИИ',
    description: 'Наш ИИ анализирует вашу цель и создаёт 14-дневный план действий',
  },
  {
    icon: TrendingUp,
    title: 'Отслеживайте прогресс',
    description: 'Выполняйте ежедневные задачи и наблюдайте за своим ростом',
  },
];

export function OnboardingScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const [name, setName] = useState('');
  const { updateProfile } = useGoalStore();

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    updateProfile({ 
      name: name || 'Достижитель целей',
      onboardingCompleted: true 
    });
    router.replace('/(tabs)/home');
  };

  const handleSkip = () => {
    updateProfile({ 
      name: 'Достижитель целей',
      onboardingCompleted: true 
    });
    router.replace('/(tabs)/home');
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <LinearGradient
                colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
                style={styles.logoContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Target size={32} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.appName}>GoalCoach AI</Text>
            </View>

            <View style={styles.content}>
              {currentStep < onboardingSteps.length ? (
                <>
                  <View style={styles.stepIndicator}>
                    {onboardingSteps.map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.dot,
                          index === currentStep && styles.activeDot,
                          index < currentStep && styles.completedDot,
                        ]}
                      />
                    ))}
                  </View>

                  <View style={styles.iconContainer}>
                    {React.createElement(onboardingSteps[currentStep].icon, {
                      size: 64,
                      color: theme.colors.primary,
                    })}
                  </View>

                  <Text style={styles.title}>{onboardingSteps[currentStep].title}</Text>
                  <Text style={styles.description}>
                    {onboardingSteps[currentStep].description}
                  </Text>
                </>
              ) : (
                <>
                  <View style={styles.iconContainer}>
                    <Sparkles size={64} color={theme.colors.primary} />
                  </View>
                  <Text style={styles.title}>Как вас зовут?</Text>
                  <Text style={styles.description}>
                    Давайте персонализируем ваш опыт
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Введите ваше имя"
                    placeholderTextColor={theme.colors.textLight}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    returnKeyType="done"
                  />
                </>
              )}
            </View>

            <View style={styles.footer}>
              <Button
                title={currentStep === onboardingSteps.length ? "Начать" : "Далее"}
                onPress={handleNext}
                variant="premium"
                size="large"
                style={styles.button}
              />
              {currentStep < onboardingSteps.length && (
                <Button
                  title="Пропустить"
                  onPress={handleSkip}
                  variant="outline"
                  size="medium"
                  style={styles.skipButton}
                />
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xxl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  appName: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xxl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.border,
  },
  activeDot: {
    width: 24,
    backgroundColor: theme.colors.primary,
  },
  completedDot: {
    backgroundColor: theme.colors.success,
  },
  iconContainer: {
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  description: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: theme.spacing.lg,
  },
  input: {
    width: '100%',
    height: 56,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    marginTop: theme.spacing.xl,
  },
  footer: {
    paddingVertical: theme.spacing.xl,
  },
  button: {
    width: '100%',
  },
  skipButton: {
    marginTop: theme.spacing.md,
  },
});