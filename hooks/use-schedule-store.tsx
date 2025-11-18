import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScheduleEvent, DaySchedule } from '@/types/schedule';
import { safeStorageGet, safeStorageSet } from '@/utils/storage-helper';
import { useAuth } from '@/hooks/use-auth-store';

const getStorageKey = (userId: string) => `schedule_events_${userId}`;

export const [ScheduleProvider, useSchedule] = createContextHook(() => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [events, setEvents] = useState<ScheduleEvent[]>([]);

  const STORAGE_KEY = getStorageKey(user?.id || 'default');

  const eventsQuery = useQuery({
    queryKey: ['schedule', user?.id, STORAGE_KEY],
    queryFn: async () => {
      if (!user?.id) return [];
      return await safeStorageGet(STORAGE_KEY, []);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (eventsQuery.data) {
      setEvents(eventsQuery.data);
    }
  }, [eventsQuery.data]);

  const saveEventsMutation = useMutation({
    mutationFn: async (newEvents: ScheduleEvent[]) => {
      if (!user?.id) throw new Error('User not authenticated');
      await safeStorageSet(STORAGE_KEY, newEvents);
      return newEvents;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule', user?.id] });
    },
  });

  const { mutate: saveEvents } = saveEventsMutation;

  const addEvent = useCallback((eventData: Omit<ScheduleEvent, 'id' | 'completed' | 'completedAt'>) => {
    const newEvent: ScheduleEvent = {
      ...eventData,
      id: `event_${Date.now()}`,
      completed: false,
    };
    const updatedEvents = [...events, newEvent];
    setEvents(updatedEvents);
    saveEvents(updatedEvents);
  }, [events, saveEvents]);

  const updateEvent = useCallback((eventId: string, updates: Partial<ScheduleEvent>) => {
    const updatedEvents = events.map(event =>
      event.id === eventId ? { ...event, ...updates } : event
    );
    setEvents(updatedEvents);
    saveEvents(updatedEvents);
  }, [events, saveEvents]);

  const deleteEvent = useCallback((eventId: string) => {
    const updatedEvents = events.filter(event => event.id !== eventId);
    setEvents(updatedEvents);
    saveEvents(updatedEvents);
  }, [events, saveEvents]);

  const toggleEventCompletion = useCallback((eventId: string) => {
    const updatedEvents = events.map(event => {
      if (event.id === eventId) {
        const completed = !event.completed;
        return {
          ...event,
          completed,
          completedAt: completed ? new Date().toISOString() : undefined,
        };
      }
      return event;
    });
    setEvents(updatedEvents);
    saveEvents(updatedEvents);
  }, [events, saveEvents]);

  const getEventsForDate = useCallback((date: string): ScheduleEvent[] => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      const targetDate = new Date(date);
      return (
        eventDate.getFullYear() === targetDate.getFullYear() &&
        eventDate.getMonth() === targetDate.getMonth() &&
        eventDate.getDate() === targetDate.getDate()
      );
    }).sort((a, b) => {
      const timeA = a.startTime.split(':').map(Number);
      const timeB = b.startTime.split(':').map(Number);
      return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1]);
    });
  }, [events]);

  const getWeekSchedule = useCallback((startDate: Date): DaySchedule[] => {
    const schedule: DaySchedule[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      schedule.push({
        date: date.toISOString(),
        events: getEventsForDate(date.toISOString()),
      });
    }
    return schedule;
  }, [getEventsForDate]);

  return useMemo(() => ({
    events,
    isLoading: eventsQuery.isLoading,
    addEvent,
    updateEvent,
    deleteEvent,
    toggleEventCompletion,
    getEventsForDate,
    getWeekSchedule,
  }), [events, eventsQuery.isLoading, addEvent, updateEvent, deleteEvent, toggleEventCompletion, getEventsForDate, getWeekSchedule]);
});
