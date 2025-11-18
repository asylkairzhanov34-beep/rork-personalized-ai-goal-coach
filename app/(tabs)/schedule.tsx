import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Plus, ChevronDown } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { useSchedule } from '@/hooks/use-schedule-store';
import { ScheduleEventCard } from '@/components/ScheduleEventCard';
import { EventCreationModal } from '@/components/EventCreationModal';
import { useGoalStore } from '@/hooks/use-goal-store';
import { TIME_SLOTS } from '@/types/schedule';

const DAYS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

function getWeekDates(baseDate: Date): Date[] {
  const dates: Date[] = [];
  const dayOfWeek = baseDate.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() + diff);

  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    dates.push(date);
  }
  return dates;
}

export default function ScheduleScreen() {
  const insets = useSafeAreaInsets();
  const { currentGoal } = useGoalStore();
  const { getEventsForDate, addEvent, toggleEventCompletion } = useSchedule();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const todayEvents = useMemo(
    () => getEventsForDate(selectedDate.toISOString()),
    [selectedDate, getEventsForDate]
  );

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const handleDayPress = (date: Date) => {
    setSelectedDate(date);
  };

  const handleAddEvent = (eventData: any) => {
    addEvent({
      ...eventData,
      date: selectedDate.toISOString(),
    });
  };

  const getEventAtTime = (time: string) => {
    return todayEvents.find(event => event.startTime === time);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>
            {currentGoal?.planType === 'free' ? 'Свободный план' : 'Расписание'}
          </Text>
          
          <TouchableOpacity 
            style={styles.monthButton}
            onPress={() => setShowMonthPicker(!showMonthPicker)}
          >
            <Text style={styles.monthButtonText}>
              {MONTHS[selectedDate.getMonth()]}
            </Text>
            <ChevronDown 
              size={20} 
              color={theme.colors.background} 
              style={{ transform: [{ rotate: showMonthPicker ? '180deg' : '0deg' }] }}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.daysScroll}
        >
          {weekDates.map((date, index) => {
            const isTodayDate = isToday(date);
            const isSelected =
              date.getDate() === selectedDate.getDate() &&
              date.getMonth() === selectedDate.getMonth();

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayChip,
                  isSelected && styles.dayChipSelected,
                ]}
                onPress={() => handleDayPress(date)}
              >
                <Text
                  style={[
                    styles.dayText,
                    isSelected && styles.dayTextSelected,
                  ]}
                >
                  {DAYS[index]}
                </Text>
                <Text
                  style={[
                    styles.dateText,
                    isSelected && styles.dateTextSelected,
                  ]}
                >
                  {date.getDate()}
                </Text>
                {isTodayDate && !isSelected && (
                  <View style={styles.todayDot} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.timeline}>
          {TIME_SLOTS.map((time, index) => {
            const event = getEventAtTime(time);
            
            return (
              <View key={time} style={styles.timeSlot}>
                <View style={styles.timeColumn}>
                  <Text style={styles.timeText}>{time}</Text>
                </View>
                
                <View style={styles.eventColumn}>
                  <View style={styles.timelineLine} />
                  <View style={styles.timelineDot} />
                  
                  {event && (
                    <View style={styles.eventContainer}>
                      <ScheduleEventCard
                        event={event}
                        onToggleComplete={() => toggleEventCompletion(event.id)}
                      />
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {todayEvents.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Нет задач на этот день</Text>
            <Text style={styles.emptySubtext}>
              Нажмите кнопку ниже, чтобы добавить
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.addButtonContainer}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowEventModal(true)}
          activeOpacity={0.8}
        >
          <Plus size={24} color={theme.colors.background} strokeWidth={3} />
          <Text style={styles.addButtonText}>Добавить задачу</Text>
        </TouchableOpacity>
      </View>

      <EventCreationModal
        visible={showEventModal}
        onClose={() => setShowEventModal(false)}
        onSubmit={handleAddEvent}
        initialDate={selectedDate.toISOString()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  monthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
  },
  monthButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: theme.colors.background,
  },
  daysScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  dayChip: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    minWidth: 64,
    position: 'relative',
  },
  dayChipSelected: {
    backgroundColor: theme.colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 0 16px rgba(255, 214, 0, 0.4)',
      },
    }) as any,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  dayTextSelected: {
    color: theme.colors.background,
  },
  dateText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  dateTextSelected: {
    color: theme.colors.background,
  },
  todayDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 120,
  },
  timeline: {
    flex: 1,
  },
  timeSlot: {
    flexDirection: 'row',
    minHeight: 60,
    marginBottom: 8,
  },
  timeColumn: {
    width: 60,
    paddingRight: 12,
    paddingTop: 2,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: theme.colors.textSecondary,
  },
  eventColumn: {
    flex: 1,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 0,
    width: 1,
    backgroundColor: theme.colors.border,
  },
  timelineDot: {
    position: 'absolute',
    left: -3,
    top: 5,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.border,
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  eventContainer: {
    marginLeft: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  addButtonContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 0 16px rgba(255, 214, 0, 0.4)',
      },
    }) as any,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: theme.colors.background,
  },
});
