import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Calendar } from 'lucide-react-native';
import { useGoalStore } from '@/hooks/use-goal-store';
import { WeeklyPlanView } from '@/components/WeeklyPlanView';
import { TaskCreationModal } from '@/components/TaskCreationModal';
import { DailyTask } from '@/types/goal';

// Функция для получения текущего дня недели
const getCurrentDayKey = () => {
  const today = new Date();
  const dayIndex = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return dayKeys[dayIndex];
};

// Функция для получения доступных дней (только сегодняшний день)
const getAvailableDays = () => {
  // Доступен только сегодняшний день
  return [getCurrentDayKey()];
};

export default function PlanScreen() {
  const store = useGoalStore();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState(getCurrentDayKey());
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [availableDays] = useState<string[]>(getAvailableDays());
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  // Organize tasks by day of week based on task date
  const weeklyTasks = useMemo(() => {
    if (!store?.dailyTasks) {
      return {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: [],
      };
    }

    const tasksByDay: { [key: string]: DailyTask[] } = {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: [],
    };

    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Group tasks by their actual date's day of week
    store.dailyTasks.forEach((task) => {
      const taskDate = new Date(task.date);
      taskDate.setHours(0, 0, 0, 0);
      
      // Only include tasks for today (since only today is available)
      if (taskDate.getTime() === today.getTime()) {
        const dayOfWeek = taskDate.getDay();
        const dayKey = dayKeys[dayOfWeek];
        tasksByDay[dayKey].push({
          ...task,
          difficulty: task.difficulty || 'medium',
          estimatedTime: task.estimatedTime || 30,
        });
      }
    });

    return tasksByDay;
  }, [store?.dailyTasks]);

  if (!store || !store.isReady) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }



  const getPreviousDayTasks = (currentDay: string) => {
    if (!currentDay?.trim()) return [];
    const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const currentIndex = dayKeys.indexOf(currentDay);
    const previousIndex = currentIndex === 0 ? 6 : currentIndex - 1;
    const previousDay = dayKeys[previousIndex];
    return weeklyTasks[previousDay] || [];
  };

  const handleAddTask = (day: string) => {
    if (!day?.trim()) return;
    setSelectedDay(day);
    setShowTaskModal(true);
  };

  const handleSaveTask = (taskData: Omit<DailyTask, 'id' | 'goalId'>) => {
    if (!taskData?.title?.trim()) return;
    console.log('Saving task for', selectedDay, ':', taskData);
    
    store.addTask(taskData);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <View>
              <Text style={styles.title}>Plan</Text>
            </View>
            <TouchableOpacity 
              style={styles.monthButton}
              onPress={() => router.push('/month-overview')}
            >
              <Calendar size={18} color="#000000" />
              <Text style={styles.monthButtonText}>Month</Text>
            </TouchableOpacity>
          </View>
        </View>

        <WeeklyPlanView
          weeklyTasks={weeklyTasks}
          onTaskToggle={store.toggleTaskCompletion}
          onAddTask={handleAddTask}
          selectedDay={selectedDay}
          onDaySelect={setSelectedDay}
          availableDays={availableDays}
        />
      </ScrollView>
      
      <TaskCreationModal
        visible={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        onSave={handleSaveTask}
        selectedDay={selectedDay}
        previousDayTasks={getPreviousDayTasks(selectedDay)}
      />
    </View>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  header: {
    marginTop: 20,
    marginBottom: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  monthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD600',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    flexShrink: 0,
    minWidth: 80,
    justifyContent: 'center',
  },
  monthButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#000000',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#FFFFFF',
  },
});