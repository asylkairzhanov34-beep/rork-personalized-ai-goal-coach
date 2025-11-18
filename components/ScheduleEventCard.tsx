import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Clock, MoreVertical, CheckCircle2, Circle } from 'lucide-react-native';
import { ScheduleEvent, EVENT_CATEGORIES } from '@/types/schedule';
import { theme } from '@/constants/theme';

interface ScheduleEventCardProps {
  event: ScheduleEvent;
  onPress?: () => void;
  onToggleComplete?: () => void;
  onMorePress?: () => void;
}

export function ScheduleEventCard({ 
  event, 
  onPress, 
  onToggleComplete,
  onMorePress 
}: ScheduleEventCardProps) {
  const category = EVENT_CATEGORIES[event.category];
  const categoryColor = event.color || category.color;

  return (
    <TouchableOpacity 
      style={[
        styles.card,
        event.completed && styles.completedCard
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.categoryIndicator, { backgroundColor: categoryColor }]} />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.categoryBadge}>
            <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
            <Text style={styles.categoryText}>{category.label}</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.moreButton}
            onPress={onMorePress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MoreVertical size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.title, event.completed && styles.completedTitle]}>
          {event.title}
        </Text>

        {event.description && (
          <Text style={styles.description} numberOfLines={2}>
            {event.description}
          </Text>
        )}

        <View style={styles.footer}>
          <View style={styles.timeContainer}>
            <Clock size={14} color={theme.colors.textSecondary} />
            <Text style={styles.timeText}>
              {event.startTime}
              {event.endTime && ` - ${event.endTime}`}
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.checkButton}
            onPress={onToggleComplete}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {event.completed ? (
              <CheckCircle2 size={24} color={categoryColor} />
            ) : (
              <Circle size={24} color={theme.colors.textSecondary} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111111',
    borderRadius: 20,
    marginBottom: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
      },
    }) as any,
  },
  completedCard: {
    opacity: 0.6,
  },
  categoryIndicator: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 214, 0, 0.1)',
    borderRadius: 12,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  moreButton: {
    padding: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: 4,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: theme.colors.textSecondary,
  },
  description: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500' as const,
  },
  checkButton: {
    padding: 4,
  },
});
