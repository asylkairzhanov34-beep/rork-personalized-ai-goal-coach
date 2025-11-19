import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Plus, Target, Zap, Star, Wind, MessageCircle, CheckCircle2, Timer, Sparkles, Calendar } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { GradientBackground } from '@/components/GradientBackground';
import { Button } from '@/components/Button';
import { ProgressRing } from '@/components/ProgressRing';
import { AnimatedStatCard } from '@/components/AnimatedStatCard';
import { useGoalStore } from '@/hooks/use-goal-store';
import { useAuth } from '@/hooks/use-auth-store';
import { useFirstTimeSetup } from '@/hooks/use-first-time-setup';


export default function TodayScreen() {
  const store = useGoalStore();
  const { user } = useAuth();
  const { profile: setupProfile } = useFirstTimeSetup();
  const [refreshing, setRefreshing] = useState(false);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(() => 
    Math.floor(Math.random() * getQuotes().length)
  );
  const insets = useSafeAreaInsets();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const motivationAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const actionsAnim = useRef(new Animated.Value(0)).current;

  // Use real data from store
  const profile = store?.profile || { name: 'User', currentStreak: 0 };
  const displayName = setupProfile?.nickname || user?.name || profile?.name || 'User';
  const currentGoal = store?.currentGoal;
  const todayTasks = store?.getTodayTasks() || [];
  // Используем прогресс за сегодня
  const todayProgress = store?.getProgressForPeriod ? store.getProgressForPeriod('day') : { completed: 0, total: 0, percentage: 0 };
  const progress = todayProgress.percentage;
  const todayFocusMinutes = 0; // TODO: implement timer integration
  const manifestationStats = { currentStreak: 0 }; // TODO: implement manifestation integration
  const todayManifestationSessions: any[] = [];

  useEffect(() => {
    // Staggered animation on mount
    Animated.stagger(80, [
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(motivationAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(statsAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(actionsAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Меняем цитату при обновлении
    setCurrentQuoteIndex(Math.floor(Math.random() * getQuotes().length));
    
    // Reset and replay animations
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    headerAnim.setValue(0);
    motivationAnim.setValue(0);
    statsAnim.setValue(0);
    actionsAnim.setValue(0);
    
    setTimeout(() => {
      setRefreshing(false);
      Animated.stagger(80, [
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.spring(slideAnim, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(motivationAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(statsAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(actionsAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]).start();
    }, 300);
  }, [fadeAnim, slideAnim, headerAnim, motivationAnim, statsAnim, actionsAnim]);

  // Calculate values that are used in multiple places
  const completedToday = todayTasks.filter(t => t.completed).length;
  const greeting = getGreeting();
  const motivationalQuote = getQuotes()[currentQuoteIndex];

  // Show loading state only if store is not available at all
  if (!store) {
    return (
      <GradientBackground>
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Загрузка...</Text>
          </View>
        </View>
      </GradientBackground>
    );
  }

  if (!currentGoal) {
    return (
      <GradientBackground>
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <View style={styles.emptyContainer}>
            <Target size={64} color={theme.colors.textLight} />
            <Text style={styles.emptyTitle}>Нет активной цели</Text>
            <Text style={styles.emptyDescription}>
              Начните свой путь, поставив цель, и позвольте ИИ создать персональный план
            </Text>
            <Button
              title="Создать первую цель"
              onPress={() => router.push('/goal-creation')}
              variant="premium"
              size="large"
              style={styles.createButton}
            />
          </View>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}

          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <Animated.View style={[
            styles.header,
            {
              opacity: headerAnim,
              transform: [{ translateY: headerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0]
              })}]
            }
          ]}>
            <View style={styles.headerText}>
              <Text style={styles.greeting}>{greeting},</Text>
              <Text style={styles.name}>{displayName}!</Text>
            </View>
            <ProgressRing progress={progress} size={60} strokeWidth={2} showPercentage={false} />
          </Animated.View>

          <Animated.View style={[
            styles.motivationCard,
            {
              opacity: motivationAnim,
              transform: [{ 
                translateY: motivationAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0]
                }),
                scale: motivationAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.95, 1]
                })
              }]
            }
          ]}>
            <Text style={styles.motivationQuote}>&ldquo;{motivationalQuote}&rdquo;</Text>
          </Animated.View>

          <Animated.View style={{
            opacity: statsAnim,
            transform: [{ translateY: statsAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0]
            })}]
          }}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsScrollContainer}
            style={styles.statsContainer}
          >
            <AnimatedStatCard
              icon={<Zap size={20} color={theme.colors.primary} />}
              value={profile?.currentStreak || 0}
              label="Дней подряд"
              delay={0}
            />
            <AnimatedStatCard
              icon={<CheckCircle2 size={20} color={theme.colors.primary} />}
              value={`${completedToday}/${todayTasks.length}`}
              label="Выполнено"
              delay={80}
            />
            <AnimatedStatCard
              icon={<Timer size={20} color={theme.colors.primary} />}
              value={todayFocusMinutes}
              label="Минут фокуса"
              delay={160}
            />
            <AnimatedStatCard
              icon={<Star size={20} color={theme.colors.primary} />}
              value={`${Math.round(progress)}%`}
              label="Прогресс сегодня"
              delay={240}
            />
            <AnimatedStatCard
              icon={<Sparkles size={20} color={theme.colors.primary} />}
              value={manifestationStats?.currentStreak || 0}
              label="Дней манифестации"
              delay={320}
            />
          </ScrollView>
          </Animated.View>



          <Animated.View style={[
            styles.section,
            {
              opacity: actionsAnim,
              transform: [{ translateY: actionsAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0]
              })}]
            }
          ]}>
            <TouchableOpacity 
              style={styles.planButton}
              onPress={() => router.push('/plan')}
              activeOpacity={0.8}
            >
              <Calendar size={20} color={theme.colors.background} style={styles.planButtonIcon} />
              <Text style={styles.planButtonText}>Перейти в план</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={[
            styles.manifestationSection,
            {
              opacity: actionsAnim,
              transform: [{ translateY: actionsAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0]
              })}]
            }
          ]}>
            <Text style={styles.sectionTitle}>Guided Манифестация</Text>
            <TouchableOpacity 
              style={styles.manifestationCard}
              onPress={() => router.push('/manifestation')}
            >
              <View style={styles.manifestationHeader}>
                <View style={styles.manifestationIcon}>
                  <Sparkles size={32} color={theme.colors.primary} />
                </View>
                <View style={styles.manifestationContent}>
                  <Text style={styles.manifestationTitle}>Визуализация успеха</Text>
                  <Text style={styles.manifestationSubtitle}>
                    3-минутная сессия аффирмаций и благодарности
                  </Text>
                </View>
              </View>
              
              {todayManifestationSessions.length > 0 ? (
                <View style={styles.manifestationCompleted}>
                  <Text style={styles.manifestationCompletedText}>
                    ✨ Сегодня: {todayManifestationSessions.length} сессий
                  </Text>
                </View>
              ) : (
                <View style={styles.manifestationCta}>
                  <Text style={styles.manifestationCtaText}>Начать сессию</Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={[
            styles.quickActionsSection,
            {
              opacity: actionsAnim,
              transform: [{ translateY: actionsAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0]
              })}]
            }
          ]}>
            <Text style={styles.sectionTitle}>Быстрые действия</Text>
            <View style={styles.quickActionsContainer}>
              <TouchableOpacity 
                style={styles.quickActionCard}
                onPress={() => router.push('/goal-creation')}
              >
                <Plus size={24} color={theme.colors.primary} />
                <Text style={styles.quickActionLabel}>Добавить задачу</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickActionCard}
                onPress={() => router.push('/breathing')}
              >
                <Wind size={24} color={theme.colors.primary} />
                <Text style={styles.quickActionLabel}>Дыхание</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickActionCard}
                onPress={() => router.push('/chat')}
              >
                <MessageCircle size={24} color={theme.colors.primary} />
                <Text style={styles.quickActionLabel}>Поддержка</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {completedToday === todayTasks.length && todayTasks.length > 0 && (
            <View style={styles.completionCard}>
              <Text style={styles.completionEmoji}>🎉</Text>
              <Text style={styles.completionTitle}>День завершён!</Text>
              <Text style={styles.completionText}>
                Отличная работа! Вы выполнили все задачи на сегодня.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </GradientBackground>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Доброе утро';
  if (hour < 18) return 'Добрый день';
  return 'Добрый вечер';
}

function getQuotes() {
  return [
    'Сегодня ты ближе к мечте, чем вчера',
    'Каждый шаг приближает к цели',
    'Великие дела начинаются с малых шагов',
    'Твоя мечта стоит каждого усилия',
    'Прогресс важнее совершенства',
    'Сегодня — идеальный день для начала',
    'Твоя настойчивость — ключ к успеху',
    'Мечты сбываются у тех, кто действует',
    'Успех — это сумма маленьких усилий',
    'Верь в себя и всё получится',
    'Начни с того, что необходимо, затем делай то, что возможно',
    'Твоё будущее создаётся тем, что ты делаешь сегодня',
    'Не жди идеального момента — создай его',
    'Сила в постоянстве усилий',
    'Каждый день — новая возможность стать лучше',
    'Действие — основной ключ к успеху',
    'Мечтай, планируй, действуй, достигай',
    'Ты сильнее, чем думаешь',
    'Фокус на процессе, а не на результате',
    'Маленькие шаги ведут к большим переменам',
    'Твоя единственная граница — это ты',
    'Дисциплина — мост между целями и достижениями',
    'Каждое усилие приближает тебя к мечте',
    'Будь терпелив — всё приходит вовремя',
    'Твоя энергия течёт туда, куда направлено внимание'
  ];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 140, // Увеличенный отступ для навигационной панели
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.regular,
    letterSpacing: 0,
  },
  name: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.regular,
    color: theme.colors.text,
    letterSpacing: 0,
  },
  motivationCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.primary + '20',
    ...theme.shadows.gold,
  },
  motivationQuote: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.text,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 24,
  },
  statsContainer: {
    marginBottom: theme.spacing.xl,
  },
  statsScrollContainer: {
    paddingRight: theme.spacing.lg,
  },

  quickActionsSection: {
    marginBottom: theme.spacing.xl,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginHorizontal: theme.spacing.xs,
    ...theme.shadows.medium,
  },
  quickActionLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.regular,
    color: theme.colors.text,
    marginBottom: theme.spacing.xl,
    letterSpacing: 0,
  },
  noTasksContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xxxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.medium,
  },
  noTasksText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  noTasksSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    opacity: 0.7,
  },
  completionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xxxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    ...theme.shadows.gold,
  },
  completionEmoji: {
    fontSize: 48,
    marginBottom: theme.spacing.md,
  },
  completionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.regular,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    letterSpacing: 0,
  },
  completionText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.regular,
    color: theme.colors.text,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    letterSpacing: 0,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xxxl,
    lineHeight: 24,
    fontWeight: theme.fontWeight.regular,
    letterSpacing: 0,
  },
  createButton: {
    paddingHorizontal: theme.spacing.xxxl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.text,
  },
  manifestationSection: {
    marginBottom: theme.spacing.xl,
  },
  manifestationCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.primary + '20',
    ...theme.shadows.gold,
  },
  manifestationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  manifestationIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.lg,
  },
  manifestationContent: {
    flex: 1,
  },
  manifestationTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  manifestationSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  manifestationCompleted: {
    backgroundColor: theme.colors.primary + '10',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  manifestationCompletedText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.medium,
  },
  manifestationCta: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  manifestationCtaText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.background,
    fontWeight: theme.fontWeight.medium,
  },
  planButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  planButtonIcon: {
    marginRight: theme.spacing.sm,
  },
  planButtonText: {
    fontSize: 16,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.background,
  },
});