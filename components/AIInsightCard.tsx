import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Sparkles, ArrowRight, RefreshCw } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useGoalStore } from '@/hooks/use-goal-store';
import { router } from 'expo-router';
import { generateText } from '@rork-ai/toolkit-sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AIInsightCardProps {
  onActionPress?: () => void;
}

const INSIGHT_CACHE_KEY = 'daily_ai_insight';

export function AIInsightCard({ onActionPress }: AIInsightCardProps) {
  const store = useGoalStore();
  const [insight, setInsight] = useState<{ title: string; message: string; actionText: string; actionRoute: string; icon: string } | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { profile, currentGoal, dailyTasks, pomodoroSessions } = store;
  
  useEffect(() => {
    if (store.isReady) {
      loadInsight();
    }
  }, [store.isReady, store.dailyTasks.length]); // Reload if tasks change significantly? Maybe just on mount/ready.

  const loadInsight = async (forceRefresh = false) => {
    const todayStr = new Date().toDateString();
    
    if (!forceRefresh) {
      try {
        const cached = await AsyncStorage.getItem(INSIGHT_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.date === todayStr && parsed.data) {
            setInsight(parsed.data);
            return;
          }
        }
      } catch (e) {
        console.error('Error loading cached insight', e);
      }
    }

    await fetchNewInsight();
  };

  const fetchNewInsight = async () => {
    setLoading(true);
    try {
      // Calculate 90-day history stats
      const now = new Date();
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(now.getDate() - 90);
      
      const historyTasks = dailyTasks.filter(t => 
        new Date(t.date) >= ninetyDaysAgo && new Date(t.date) <= now
      );
      
      const total = historyTasks.length;
      const completed = historyTasks.filter(t => t.completed).length;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      const todayTasks = dailyTasks.filter(t => new Date(t.date).toDateString() === now.toDateString());
      const todayCompleted = todayTasks.filter(t => t.completed).length;

      const prompt = `
Analyze the user's productivity for the last 90 days and give a specific recommendation.
Context:
- Name: ${profile.name}
- Current Streak: ${profile.currentStreak} days
- Last 90 Days: ${completed}/${total} tasks completed (${completionRate}%)
- Today: ${todayCompleted}/${todayTasks.length} tasks completed
- Current Goal: ${currentGoal?.title || 'None'}

Output a JSON object ONLY with these fields:
{
  "title": "Short catchy title (max 20 chars)",
  "message": "One specific, encouraging sentence based on their history and today's status.",
  "actionText": "Action button text (max 15 chars)",
  "actionRoute": "/plan" (or "/timer", "/breathing", "/goal-creation"),
  "icon": "Emoji"
}
If they have no goal, suggest creating one. If they did well, praise them. If they struggled, suggest a small step.
Respond in Russian.
`;

      const text = await generateText({
        messages: [{ role: 'user', content: prompt }]
      });

      // Clean up potential markdown code blocks
      const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const data = JSON.parse(jsonStr);
      
      setInsight(data);
      
      await AsyncStorage.setItem(INSIGHT_CACHE_KEY, JSON.stringify({
        date: new Date().toDateString(),
        data: data
      }));
      
    } catch (error) {
      console.error('Failed to generate insight:', error);
      // Fallback
      setInsight({
        title: 'Продолжайте!',
        message: 'Каждый шаг приближает вас к цели. Не останавливайтесь!',
        actionText: 'К задачам',
        actionRoute: '/plan',
        icon: '✨'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleActionPress = () => {
    if (insight?.actionRoute) {
      router.push(insight.actionRoute as any);
    } else if (onActionPress) {
      onActionPress();
    }
  };

  if (!insight) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Sparkles size={20} color={theme.colors.primary} style={styles.sparkleIcon} />
          <Text style={styles.title}>AI Совет</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
           <TouchableOpacity onPress={() => loadInsight(true)} disabled={loading} style={{ marginRight: 10 }}>
             {loading ? <ActivityIndicator size="small" color={theme.colors.textSecondary} /> : <RefreshCw size={16} color={theme.colors.textSecondary} />}
           </TouchableOpacity>
           <Text style={styles.emoji}>{insight.icon}</Text>
        </View>
      </View>
      
      <Text style={styles.insightTitle}>{insight.title}</Text>
      <Text style={styles.message}>{insight.message}</Text>
      
      <TouchableOpacity style={styles.actionButton} onPress={handleActionPress}>
        <Text style={styles.actionText}>{insight.actionText}</Text>
        <ArrowRight size={16} color={theme.colors.background} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: 20,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: theme.colors.primary + '20',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sparkleIcon: {
    marginRight: 8,
  },
  title: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emoji: {
    fontSize: 24,
  },
  insightTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: 12,
  },
  message: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  actionText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.background,
    marginRight: 12,
  },
});
