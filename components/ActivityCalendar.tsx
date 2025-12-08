import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronLeft, ChevronRight, Flame, Calendar, CheckCircle2 } from 'lucide-react-native';
import { theme } from '@/constants/theme';

interface ActivityCalendarProps {
  completedDates: string[];
  currentStreak: number;
}

export function ActivityCalendar({ completedDates, currentStreak }: ActivityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  
  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let startDayOfWeek = firstDay.getDay();
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    
    const days: { date: Date | null; level: number; isToday: boolean; dayNum: number; isPast: boolean }[] = [];
    
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ date: null, level: -1, isToday: false, dayNum: 0, isPast: false });
    }
    
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split('T')[0];
      const completedCount = completedDates.filter(d => d === dateStr).length;
      
      let level = 0;
      if (completedCount >= 3) level = 4;
      else if (completedCount === 2) level = 3;
      else if (completedCount === 1) level = 2;
      else if (completedCount > 0) level = 1;
      
      const isToday = date.getTime() === today.getTime();
      const isFuture = date > today;
      const isPast = date < today;
      
      days.push({
        date,
        level: isFuture ? -2 : level,
        isToday,
        dayNum: day,
        isPast,
      });
    }
    
    const remainingDays = 7 - (days.length % 7);
    if (remainingDays < 7) {
      for (let i = 0; i < remainingDays; i++) {
        days.push({ date: null, level: -1, isToday: false, dayNum: 0, isPast: false });
      }
    }
    
    const weeks: typeof days[] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    
    return weeks;
  }, [currentMonth, completedDates]);
  
  const monthStats = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const monthStart = new Date(year, month, 1).toISOString().split('T')[0];
    const monthEnd = new Date(year, month + 1, 0).toISOString().split('T')[0];
    
    const monthCompletedDates = completedDates.filter(d => d >= monthStart && d <= monthEnd);
    const uniqueDays = new Set(monthCompletedDates);
    
    return {
      totalTasks: monthCompletedDates.length,
      activeDays: uniqueDays.size,
    };
  }, [currentMonth, completedDates]);
  
  const goToPrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  
  const goToNextMonth = () => {
    const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    const today = new Date();
    if (next <= new Date(today.getFullYear(), today.getMonth() + 1, 1)) {
      setCurrentMonth(next);
    }
  };
  
  const isCurrentMonth = () => {
    const today = new Date();
    return currentMonth.getMonth() === today.getMonth() && 
           currentMonth.getFullYear() === today.getFullYear();
  };
  
  const getLevelStyle = (level: number, isToday: boolean) => {
    const baseStyle: any = {};
    
    if (level === -1) {
      return { backgroundColor: 'transparent' };
    }
    
    if (level === -2) {
      return { backgroundColor: theme.colors.surfaceElevated, opacity: 0.3 };
    }
    
    switch (level) {
      case 0:
        baseStyle.backgroundColor = theme.colors.surfaceElevated;
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = theme.colors.border;
        break;
      case 1:
        baseStyle.backgroundColor = '#3D3200';
        break;
      case 2:
        baseStyle.backgroundColor = '#6B5700';
        break;
      case 3:
        baseStyle.backgroundColor = '#9A7D00';
        break;
      case 4:
        baseStyle.backgroundColor = theme.colors.primary;
        break;
    }
    
    if (isToday) {
      baseStyle.borderWidth = 2;
      baseStyle.borderColor = theme.colors.primary;
    }
    
    return baseStyle;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Calendar size={20} color={theme.colors.primary} />
          <Text style={styles.title}>Активность</Text>
        </View>
        <View style={styles.streakBadge}>
          <Flame size={16} color={theme.colors.warning} />
          <Text style={styles.streakText}>{currentStreak}</Text>
        </View>
      </View>
      
      <View style={styles.monthNavigation}>
        <TouchableOpacity onPress={goToPrevMonth} style={styles.navButton}>
          <ChevronLeft size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </Text>
        <TouchableOpacity 
          onPress={goToNextMonth} 
          style={[styles.navButton, isCurrentMonth() && styles.navButtonDisabled]}
          disabled={isCurrentMonth()}
        >
          <ChevronRight size={20} color={isCurrentMonth() ? theme.colors.textLight : theme.colors.text} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.calendarGrid}>
        <View style={styles.dayNamesRow}>
          {dayNames.map((name, index) => (
            <View key={index} style={styles.dayNameCell}>
              <Text style={[
                styles.dayName,
                (index === 5 || index === 6) && styles.weekendDayName
              ]}>{name}</Text>
            </View>
          ))}
        </View>
        
        {calendarData.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.weekRow}>
            {week.map((day, dayIndex) => (
              <View key={dayIndex} style={styles.dayCellWrapper}>
                {day.date ? (
                  <View style={[
                    styles.dayCell,
                    getLevelStyle(day.level, day.isToday),
                  ]}>
                    <Text style={[
                      styles.dayNumber,
                      day.isToday && styles.todayNumber,
                      day.level >= 3 && styles.highLevelNumber,
                      day.level === -2 && styles.futureNumber,
                    ]}>
                      {day.dayNum}
                    </Text>
                    {day.level > 0 && day.level !== -2 && (
                      <View style={styles.completedIndicator}>
                        <CheckCircle2 size={10} color={day.level >= 3 ? '#000' : theme.colors.primary} />
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.emptyCell} />
                )}
              </View>
            ))}
          </View>
        ))}
      </View>
      
      <View style={styles.legend}>
        <Text style={styles.legendLabel}>Интенсивность:</Text>
        <View style={styles.legendItems}>
          <View style={[styles.legendSquare, { backgroundColor: theme.colors.surfaceElevated, borderWidth: 1, borderColor: theme.colors.border }]} />
          <View style={[styles.legendSquare, { backgroundColor: '#3D3200' }]} />
          <View style={[styles.legendSquare, { backgroundColor: '#6B5700' }]} />
          <View style={[styles.legendSquare, { backgroundColor: '#9A7D00' }]} />
          <View style={[styles.legendSquare, { backgroundColor: theme.colors.primary }]} />
        </View>
      </View>
      
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={styles.statIconWrapper}>
            <CheckCircle2 size={18} color={theme.colors.success} />
          </View>
          <Text style={styles.statValue}>{monthStats.totalTasks}</Text>
          <Text style={styles.statLabel}>задач за месяц</Text>
        </View>
        
        <View style={styles.statDivider} />
        
        <View style={styles.statCard}>
          <View style={styles.statIconWrapper}>
            <Calendar size={18} color={theme.colors.primary} />
          </View>
          <Text style={styles.statValue}>{monthStats.activeDays}</Text>
          <Text style={styles.statLabel}>активных дней</Text>
        </View>
        
        <View style={styles.statDivider} />
        
        <View style={styles.statCard}>
          <View style={styles.statIconWrapper}>
            <Flame size={18} color={theme.colors.warning} />
          </View>
          <Text style={styles.statValue}>{currentStreak}</Text>
          <Text style={styles.statLabel}>дней подряд</Text>
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
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 165, 0, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 165, 0, 0.3)',
  },
  streakText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.warning,
  },
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  monthTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  calendarGrid: {
    marginBottom: 16,
  },
  dayNamesRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayNameCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  dayName: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  weekendDayName: {
    color: theme.colors.textLight,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  dayCellWrapper: {
    flex: 1,
    aspectRatio: 1,
    padding: 2,
  },
  dayCell: {
    flex: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  emptyCell: {
    flex: 1,
  },
  dayNumber: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
  },
  todayNumber: {
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },
  highLevelNumber: {
    color: '#000',
    fontWeight: theme.fontWeight.bold,
  },
  futureNumber: {
    color: theme.colors.textLight,
  },
  completedIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginBottom: 16,
  },
  legendLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  legendItems: {
    flexDirection: 'row',
    gap: 4,
  },
  legendSquare: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: 8,
  },
});
