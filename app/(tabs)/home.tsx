import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Target, Zap, Star, Wind, MessageCircle, CheckCircle2, Timer, Sparkles, Calendar, Plus } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { GradientBackground } from '@/components/GradientBackground';

import { ProgressRing } from '@/components/ProgressRing';
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

  // Use real data from store
  const profile = store?.profile || { name: 'User', currentStreak: 0 };
  const displayName = setupProfile?.nickname || user?.name || profile?.name || 'User';
  const currentGoal = store?.currentGoal;
  const todayTasks = store?.getTodayTasks() || [];
  // Use today's progress
  const todayProgress = store?.getProgressForPeriod ? store.getProgressForPeriod('day') : { completed: 0, total: 0, percentage: 0 };
  const progress = todayProgress.percentage;
  const todayFocusMinutes = 0; // TODO: implement timer integration
  const manifestationStats = { currentStreak: 0 }; // TODO: implement manifestation integration
  const todayManifestationSessions: any[] = [];

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Change quote on refresh
    setCurrentQuoteIndex(Math.floor(Math.random() * getQuotes().length));
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

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
            <Text style={styles.loadingText}>Loading...</Text>
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
            <Text style={styles.emptyTitle}>No Active Goal</Text>
            <Text style={styles.emptyDescription}>
              Start your journey by setting a goal and let AI create a personalized plan
            </Text>
            <TouchableOpacity
              style={styles.createGoalButton}
              onPress={() => router.push('/goal-creation')}
              activeOpacity={0.9}
            >
              <View style={styles.createGoalButtonInner}>
                <Sparkles size={24} color="#000" style={{ marginRight: 8 }} />
                <Text style={styles.createGoalButtonText}>Create First Goal</Text>
              </View>
            </TouchableOpacity>
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
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.greeting}>{greeting},</Text>
              <Text style={styles.name}>{displayName}!</Text>
            </View>
            <ProgressRing progress={progress} size={60} strokeWidth={2} showPercentage={false} />
          </View>

          <View style={styles.motivationCard}>
            <Text style={styles.motivationQuote}>&ldquo;{motivationalQuote}&rdquo;</Text>
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsScrollContainer}
            style={styles.statsContainer}
          >
            <View style={styles.statCard}>
              <Zap size={20} color={theme.colors.primary} />
              <Text style={styles.statValue}>{profile?.currentStreak || 0}</Text>
              <Text style={styles.statLabel}>Days Streak</Text>
            </View>
            <View style={styles.statCard}>
              <CheckCircle2 size={20} color={theme.colors.primary} />
              <Text style={styles.statValue}>{completedToday}/{todayTasks.length}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statCard}>
              <Timer size={20} color={theme.colors.primary} />
              <Text style={styles.statValue}>{todayFocusMinutes}</Text>
              <Text style={styles.statLabel}>Focus Minutes</Text>
            </View>
            <View style={styles.statCard}>
              <Star size={20} color={theme.colors.primary} />
              <Text style={styles.statValue}>{Math.round(progress)}%</Text>
              <Text style={styles.statLabel}>Today Progress</Text>
            </View>
            <View style={styles.statCard}>
              <Sparkles size={20} color={theme.colors.primary} />
              <Text style={styles.statValue}>{manifestationStats?.currentStreak || 0}</Text>
              <Text style={styles.statLabel}>Manifestation Days</Text>
            </View>
          </ScrollView>



          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.planButton}
              onPress={() => router.push('/plan')}
              activeOpacity={0.8}
            >
              <Calendar size={20} color={theme.colors.background} style={styles.planButtonIcon} />
              <Text style={styles.planButtonText}>Go to Plan</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.manifestationSection}>
            <Text style={styles.sectionTitle}>Guided Manifestation</Text>
            <TouchableOpacity 
              style={styles.manifestationCard}
              onPress={() => router.push('/manifestation')}
            >
              <View style={styles.manifestationHeader}>
                <View style={styles.manifestationIcon}>
                  <Sparkles size={32} color={theme.colors.primary} />
                </View>
                <View style={styles.manifestationContent}>
                  <Text style={styles.manifestationTitle}>Success Visualization</Text>
                  <Text style={styles.manifestationSubtitle}>
                    3-minute session of affirmations and gratitude
                  </Text>
                </View>
              </View>
              
              {todayManifestationSessions.length > 0 ? (
                <View style={styles.manifestationCompleted}>
                  <Text style={styles.manifestationCompletedText}>
                    ✨ Today: {todayManifestationSessions.length} sessions
                  </Text>
                </View>
              ) : (
                <View style={styles.manifestationCta}>
                  <Text style={styles.manifestationCtaText}>Start Session</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.quickActionsSection}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => router.push('/breathing')}
                testID="quick-action-breathing"
              >
                <Wind size={24} color={theme.colors.primary} />
                <Text style={styles.quickActionLabel}>Breathing</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => router.push('/chat')}
                testID="quick-action-chat"
              >
                <MessageCircle size={24} color={theme.colors.primary} />
                <Text style={styles.quickActionLabel}>AI Assistant</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => router.push('/manifestation')}
                testID="quick-action-manifestation"
              >
                <Sparkles size={24} color={theme.colors.primary} />
                <Text style={styles.quickActionLabel}>Manifest</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickActionCard, !!currentGoal && styles.quickActionCardDisabled]}
                disabled={!!currentGoal}
                onPress={() => {
                  if (currentGoal) {
                    Alert.alert(
                      'Goal already active',
                      'To create a new goal, reset the current goal first.',
                      [{ text: 'OK' }]
                    );
                    return;
                  }
                  router.push('/goal-creation');
                }}
                testID="quick-action-add-goal"
              >
                <View style={styles.addGoalIconWrap}>
                  <Target size={24} color={theme.colors.primary} />
                  <View style={styles.addGoalPlusBadge}>
                    <Plus size={12} color={theme.colors.background} />
                  </View>
                </View>
                <Text style={styles.quickActionLabel}>Add Goal</Text>
                {!!currentGoal && (
                  <Text style={styles.quickActionHint}>Current goal active</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {completedToday === todayTasks.length && todayTasks.length > 0 && (
            <View style={styles.completionCard}>
              <Text style={styles.completionEmoji}>🎉</Text>
              <Text style={styles.completionTitle}>Day Completed!</Text>
              <Text style={styles.completionText}>
                Great work! You have completed all tasks for today.
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
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

function getQuotes() {
  return [
    'Today you are closer to your dream than yesterday',
    'Every step brings you closer to your goal',
    'Great things start with small steps',
    'Your dream is worth every effort',
    'Progress is more important than perfection',
    'Today is the perfect day to begin',
    'Your persistence is the key to success',
    'Dreams come true for those who take action',
    'Success is the sum of small efforts',
    'Believe in yourself and everything will work out',
    'Start with what is necessary, then do what is possible',
    'Your future is created by what you do today',
    'Do not wait for the perfect moment — create it',
    'Strength lies in consistency',
    'Every day is a new opportunity to become better',
    'Action is the fundamental key to success',
    'Dream, plan, act, achieve',
    'You are stronger than you think',
    'Focus on the process, not the result',
    'Small steps lead to big changes',
    'Your only limit is you',
    'Discipline is the bridge between goals and achievements',
    'Every effort brings you closer to your dream',
    'Be patient — everything comes at the right time',
    'Your energy flows where your attention goes'
  ];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 100, // Optimized spacing for tab bar
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.md,
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
  statCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: theme.spacing.md,
    minWidth: 100,
    ...theme.shadows.medium,
  },
  statValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.regular,
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
    letterSpacing: 0,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    fontWeight: theme.fontWeight.regular,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
    textAlign: 'center',
  },

  quickActionsSection: {
    marginBottom: theme.spacing.xl,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: theme.spacing.md,
  },
  quickActionCard: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.medium,
  },
  quickActionCardDisabled: {
    opacity: 0.55,
  },
  quickActionLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  quickActionHint: {
    marginTop: 4,
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  addGoalIconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addGoalPlusBadge: {
    position: 'absolute',
    right: -6,
    top: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.surface,
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
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    letterSpacing: 0,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xxxl,
    lineHeight: 26,
    fontWeight: theme.fontWeight.regular,
    letterSpacing: 0,
    paddingHorizontal: theme.spacing.lg,
  },
  createGoalButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 999,
    paddingHorizontal: theme.spacing.xxxl,
    paddingVertical: theme.spacing.xl,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  createGoalButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  createGoalButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: '#000',
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
    borderRadius: 999,
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