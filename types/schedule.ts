export interface ScheduleEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  startTime: string;
  endTime?: string;
  category: 'focus' | 'workout' | 'sleep' | 'work' | 'break' | 'personal';
  completed: boolean;
  completedAt?: string;
  priority: 'high' | 'medium' | 'low';
  color?: string;
  participants?: string[];
}

export interface DaySchedule {
  date: string;
  events: ScheduleEvent[];
}

export const EVENT_CATEGORIES = {
  focus: { label: 'Фокус', color: '#FFD600' },
  workout: { label: 'Тренировка', color: '#4CAF50' },
  sleep: { label: 'Сон', color: '#9C27B0' },
  work: { label: 'Работа', color: '#FF9800' },
  break: { label: 'Перерыв', color: '#2196F3' },
  personal: { label: 'Личное', color: '#F44336' },
} as const;

export const TIME_SLOTS = [
  '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
] as const;
