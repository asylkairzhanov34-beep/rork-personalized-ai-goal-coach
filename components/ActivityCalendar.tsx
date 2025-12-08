import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';

interface ActivityCalendarProps {
  completedDates: string[];
  currentStreak: number;
}

export function ActivityCalendar({ completedDates, currentStreak }: ActivityCalendarProps) {
  const calendarData = useMemo(() => {
    const today = new Date();
    const weeks: { date: Date; level: number; isToday: boolean }[][] = [];
    
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 83);
    
    const dayOfWeek = startDate.getDay();
    const adjustedStart = new Date(startDate);
    adjustedStart.setDate(startDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    
    let currentDate = new Date(adjustedStart);
    let currentWeek: { date: Date; level: number; isToday: boolean }[] = [];
    
    while (currentDate <= today || currentWeek.length > 0) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const completedCount = completedDates.filter(d => d === dateStr).length;
      
      let level = 0;
      if (completedCount >= 3) level = 4;
      else if (completedCount === 2) level = 3;
      else if (completedCount === 1) level = 2;
      else if (completedCount > 0) level = 1;
      
      const isToday = currentDate.toDateString() === today.toDateString();
      const isFuture = currentDate > today;
      
      currentWeek.push({
        date: new Date(currentDate),
        level: isFuture ? -1 : level,
        isToday,
      });
      
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
      
      if (currentDate > today && currentWeek.length === 0) break;
    }
    
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({
          date: new Date(currentDate),
          level: -1,
          isToday: false,
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      weeks.push(currentWeek);
    }
    
    return weeks.slice(-12);
  }, [completedDates]);

  const monthLabels = useMemo(() => {
    const labels: { label: string; position: number }[] = [];
    const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    
    let lastMonth = -1;
    calendarData.forEach((week, weekIndex) => {
      const firstDayOfWeek = week[0];
      if (firstDayOfWeek && firstDayOfWeek.level !== -1) {
        const month = firstDayOfWeek.date.getMonth();
        if (month !== lastMonth) {
          labels.push({ label: months[month], position: weekIndex });
          lastMonth = month;
        }
      }
    });
    
    return labels;
  }, [calendarData]);

  const getLevelColor = (level: number) => {
    switch (level) {
      case -1: return 'transparent';
      case 0: return theme.colors.surface;
      case 1: return `${theme.colors.primary}30`;
      case 2: return `${theme.colors.primary}60`;
      case 3: return `${theme.colors.primary}90`;
      case 4: return theme.colors.primary;
      default: return theme.colors.surface;
    }
  };

  const totalCompleted = completedDates.length;
  
  const activeDays = useMemo(() => {
    const uniqueDates = new Set(completedDates);
    return uniqueDates.size;
  }, [completedDates]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Активность</Text>
        <View style={styles.streakBadge}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <Text style={styles.streakText}>{currentStreak} дней</Text>
        </View>
      </View>
      
      <View style={styles.monthLabelsContainer}>
        {monthLabels.map((item, index) => (
          <Text 
            key={index} 
            style={[
              styles.monthLabel,
              { left: item.position * 28 }
            ]}
          >
            {item.label}
          </Text>
        ))}
      </View>
      
      <View style={styles.calendarContainer}>
        <View style={styles.dayLabels}>
          <Text style={styles.dayLabel}>Пн</Text>
          <Text style={styles.dayLabel}></Text>
          <Text style={styles.dayLabel}>Ср</Text>
          <Text style={styles.dayLabel}></Text>
          <Text style={styles.dayLabel}>Пт</Text>
          <Text style={styles.dayLabel}></Text>
          <Text style={styles.dayLabel}>Вс</Text>
        </View>
        
        <View style={styles.weeksContainer}>
          {calendarData.map((week, weekIndex) => (
            <View key={weekIndex} style={styles.weekColumn}>
              {week.map((day, dayIndex) => (
                <View
                  key={dayIndex}
                  style={[
                    styles.dayCell,
                    { backgroundColor: getLevelColor(day.level) },
                    day.isToday && styles.todayCell,
                    day.level === -1 && styles.emptyCell,
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
      </View>
      
      <View style={styles.legend}>
        <Text style={styles.legendText}>Меньше</Text>
        <View style={styles.legendSquares}>
          {[0, 1, 2, 3, 4].map((level) => (
            <View
              key={level}
              style={[
                styles.legendSquare,
                { backgroundColor: getLevelColor(level) },
              ]}
            />
          ))}
        </View>
        <Text style={styles.legendText}>Больше</Text>
      </View>
      
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalCompleted}</Text>
          <Text style={styles.statLabel}>задач выполнено</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{activeDays}</Text>
          <Text style={styles.statLabel}>активных дней</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.primary}15`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: `${theme.colors.primary}30`,
  },
  streakEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  streakText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary,
  },
  monthLabelsContainer: {
    height: 20,
    position: 'relative',
    marginLeft: 28,
    marginBottom: 4,
  },
  monthLabel: {
    position: 'absolute',
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  calendarContainer: {
    flexDirection: 'row',
  },
  dayLabels: {
    width: 24,
    justifyContent: 'space-between',
    paddingRight: 4,
  },
  dayLabel: {
    fontSize: 9,
    color: theme.colors.textSecondary,
    height: 22,
    lineHeight: 22,
  },
  weeksContainer: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'flex-end',
    gap: 4,
  },
  weekColumn: {
    gap: 4,
  },
  dayCell: {
    width: 22,
    height: 22,
    borderRadius: 4,
  },
  todayCell: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  emptyCell: {
    opacity: 0,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 8,
  },
  legendText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  legendSquares: {
    flexDirection: 'row',
    gap: 3,
  },
  legendSquare: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
  },
  statValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
});
