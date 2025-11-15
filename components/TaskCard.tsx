import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Check, Clock, Timer } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { DailyTask } from '@/types/goal';
import { router } from 'expo-router';

interface TaskCardProps {
  task: DailyTask;
  onToggle: () => void;
  onStartTimer?: (taskId: string) => void;
}

export function TaskCard({ task, onToggle, onStartTimer }: TaskCardProps) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onToggle();
    });
  };

  const priorityColors = {
    high: theme.colors.text,
    medium: theme.colors.textSecondary,
    low: theme.colors.textLight,
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
        <View style={[styles.card, task.completed && styles.completedCard]}>
          <View style={styles.header}>
            <View style={styles.checkboxContainer}>
              <View style={[styles.checkbox, task.completed && styles.checkboxCompleted]}>
                {task.completed && <Check size={16} color="#FFFFFF" />}
              </View>
            </View>
            <View style={styles.content}>
              <Text style={[styles.title, task.completed && styles.completedText]}>
                {task.title}
              </Text>
              <Text style={[styles.description, task.completed && styles.completedText]}>
                {task.description}
              </Text>
              <View style={styles.meta}>
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Clock size={14} color={theme.colors.textSecondary} />
                    <Text style={styles.metaText}>{task.duration}</Text>
                  </View>
                  <View style={[styles.priority, { backgroundColor: priorityColors[task.priority] + '20' }]}>
                    <Text style={[styles.priorityText, { color: priorityColors[task.priority] }]}>
                      {task.priority === 'high' ? 'высокий' : task.priority === 'medium' ? 'средний' : 'низкий'}
                    </Text>
                  </View>
                </View>
                {!task.completed && (
                  <TouchableOpacity
                    style={styles.timerButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      if (onStartTimer) {
                        onStartTimer(task.id);
                      } else {
                        router.push('/timer');
                      }
                    }}
                  >
                    <Timer size={16} color={theme.colors.primary} />
                    <Text style={styles.timerButtonText}>Pomodoro</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
    ...theme.shadows.medium,
  },
  completedCard: {
    opacity: 0.6,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.primary,
    ...theme.shadows.gold,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkboxContainer: {
    marginRight: theme.spacing.md,
    paddingTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxCompleted: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.regular,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    letterSpacing: 0,
  },
  description: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
    fontWeight: theme.fontWeight.regular,
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  meta: {
    flexDirection: 'column',
    gap: theme.spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  metaText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  priority: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  priorityText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.regular,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  timerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primary + '15',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
    gap: theme.spacing.xs,
  },
  timerButtonText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.primary,
  },
});