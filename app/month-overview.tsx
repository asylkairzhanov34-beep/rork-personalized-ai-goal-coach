import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Clock, Plus, Check, X } from 'lucide-react-native';
import { useGoalStore } from '@/hooks/use-goal-store';
import { DailyTask } from '@/types/goal';
import PremiumGate from '@/components/PremiumGate';

interface MonthDay {
  date: Date;
  dayNumber: number;
  tasks: DailyTask[];
  isToday: boolean;
  isPast: boolean;
}

interface DayTasksModalProps {
  visible: boolean;
  day: MonthDay | null;
  onClose: () => void;
  onToggleTask: (taskId: string) => void;
  onAddTask: (task: Omit<DailyTask, 'id' | 'goalId' | 'completed' | 'completedAt'>) => void;
}

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];



function DayTasksModal({ visible, day, onClose, onToggleTask, onAddTask }: DayTasksModalProps) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddTask = () => {
    if (!newTaskTitle.trim() || !day) return;
    
    const newTask: Omit<DailyTask, 'id' | 'goalId' | 'completed' | 'completedAt'> = {
      day: day.dayNumber,
      date: day.date.toISOString(),
      title: newTaskTitle.trim(),
      description: newTaskDescription.trim(),
      duration: '30 мин',
      priority: 'medium',
      tips: [],
      difficulty: 'medium',
      estimatedTime: 30,
    };
    
    onAddTask(newTask);
    setNewTaskTitle('');
    setNewTaskDescription('');
    setShowAddForm(false);
  };

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { 
      day: 'numeric', 
      month: 'long' 
    };
    return `Задачи на ${date.toLocaleDateString('ru-RU', options)}`;
  };

  if (!day) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={modalStyles.container}>
        <View style={modalStyles.header}>
          <TouchableOpacity onPress={onClose} style={modalStyles.closeButton}>
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={modalStyles.headerContent}>
            <Text style={modalStyles.title}>{formatDate(day.date)}</Text>
            <Text style={modalStyles.subtitle}>
              {day.tasks.length === 0 ? 'Нет задач' : `${day.tasks.length} ${day.tasks.length === 1 ? 'задача' : day.tasks.length < 5 ? 'задачи' : 'задач'}`}
            </Text>
          </View>
        </View>

        <ScrollView style={modalStyles.content} showsVerticalScrollIndicator={false}>
          {day.tasks.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={modalStyles.taskItem}
              onPress={() => onToggleTask(task.id)}
              activeOpacity={0.7}
            >
              <View style={modalStyles.taskContent}>
                <View style={[
                  modalStyles.checkbox,
                  task.completed && modalStyles.checkboxCompleted
                ]}>
                  {task.completed && <Check size={16} color="#000000" />}
                </View>
                
                <View style={modalStyles.taskInfo}>
                  <Text style={[
                    modalStyles.taskTitle,
                    task.completed && modalStyles.taskTitleCompleted
                  ]}>
                    {task.title}
                  </Text>
                  {task.description && (
                    <Text style={modalStyles.taskDescription}>
                      {task.description}
                    </Text>
                  )}
                  <View style={modalStyles.taskMeta}>
                    <Text style={modalStyles.taskDuration}>{task.duration}</Text>
                    <View style={[
                      modalStyles.priorityBadge,
                      modalStyles[`priority${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}` as keyof typeof modalStyles]
                    ]}>
                      <Text style={modalStyles.priorityText}>
                        {task.priority === 'high' ? 'Высокий' : task.priority === 'medium' ? 'Средний' : 'Низкий'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {showAddForm && (
            <View style={modalStyles.addForm}>
              <TextInput
                style={modalStyles.input}
                placeholder="Название задачи"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={newTaskTitle}
                onChangeText={setNewTaskTitle}
                autoFocus
              />
              <TextInput
                style={[modalStyles.input, modalStyles.textArea]}
                placeholder="Описание (необязательно)"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={newTaskDescription}
                onChangeText={setNewTaskDescription}
                multiline
                numberOfLines={3}
              />
              <View style={modalStyles.formButtons}>
                <TouchableOpacity
                  style={modalStyles.cancelButton}
                  onPress={() => {
                    setShowAddForm(false);
                    setNewTaskTitle('');
                    setNewTaskDescription('');
                  }}
                >
                  <Text style={modalStyles.cancelButtonText}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    modalStyles.saveButton,
                    !newTaskTitle.trim() && modalStyles.saveButtonDisabled
                  ]}
                  onPress={handleAddTask}
                  disabled={!newTaskTitle.trim()}
                >
                  <Text style={modalStyles.saveButtonText}>Добавить</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={modalStyles.footer}>
          <TouchableOpacity
            style={modalStyles.addButton}
            onPress={() => setShowAddForm(true)}
          >
            <Plus size={20} color="#000000" />
            <Text style={modalStyles.addButtonText}>Добавить задачу</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function MonthOverviewScreen() {
  const store = useGoalStore();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [selectedDay, setSelectedDay] = useState<MonthDay | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Генерируем 30 дней вперёд от сегодняшнего дня
  const monthDays = useMemo(() => {
    const today = new Date();
    const days: MonthDay[] = [];
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toDateString();
      
      // Получаем реальные задачи для этого дня
      const tasksForDay = store?.dailyTasks?.filter(task => 
        new Date(task.date).toDateString() === dateStr
      ) || [];
      
      days.push({
        date,
        dayNumber: date.getDate(),
        tasks: tasksForDay,
        isToday: i === 0,
        isPast: false, // Все дни в будущем или сегодня
      });
    }
    
    return days;
  }, [store?.dailyTasks]);

  const getProgressColor = (tasks: DailyTask[]) => {
    if (tasks.length === 0) return '#5A5A5A'; // Тёмно-серый - нет задач
    
    const completedTasks = tasks.filter(task => task.completed).length;
    const completionRate = completedTasks / tasks.length;
    
    if (completionRate === 1) return '#4CAF50'; // Зелёный - все выполнены
    if (completionRate > 0) return '#FFD600'; // Жёлтый - есть невыполненные
    return '#FF3B30'; // Красный - просроченные/ничего не выполнено
  };

  const handleDayPress = (day: MonthDay) => {
    setSelectedDay(day);
    setModalVisible(true);
  };

  const handleToggleTask = (taskId: string) => {
    store?.toggleTaskCompletion(taskId);
  };

  const handleAddTask = (taskData: Omit<DailyTask, 'id' | 'goalId' | 'completed' | 'completedAt'>) => {
    store?.addTask(taskData);
  };



  const renderDaysList = () => {
    return (
      <View style={styles.daysListContainer}>
        {monthDays.map((day, index) => {
          const progressColor = getProgressColor(day.tasks);
          const completedTasks = day.tasks.filter(task => task.completed).length;
          const totalTasks = day.tasks.length;
          
          const formatDayDate = (date: Date) => {
            const options: Intl.DateTimeFormatOptions = { 
              weekday: 'long',
              day: 'numeric', 
              month: 'long' 
            };
            return date.toLocaleDateString('ru-RU', options);
          };
          
          return (
            <TouchableOpacity 
              key={day.date.toISOString()}
              style={[
                styles.dayListItem,
                day.isToday && styles.todayListItem
              ]}
              activeOpacity={0.7}
              onPress={() => handleDayPress(day)}
            >
              <View style={styles.dayListContent}>
                <View style={styles.dayListLeft}>
                  <View style={[
                    styles.dayIndicator,
                    { backgroundColor: progressColor }
                  ]} />
                  <View style={styles.dayInfo}>
                    <Text style={[
                      styles.dayListDate,
                      day.isToday && styles.todayListDate
                    ]}>
                      {formatDayDate(day.date)}
                    </Text>
                    <Text style={styles.dayListTasks}>
                      {totalTasks === 0 ? 'Нет задач' : `${completedTasks}/${totalTasks} выполнено`}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.dayListRight}>
                  {totalTasks > 0 && (
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill,
                          { 
                            width: `${(completedTasks / totalTasks) * 100}%`,
                            backgroundColor: progressColor
                          }
                        ]} 
                      />
                    </View>
                  )}
                  <Text style={styles.dayListNumber}>{day.dayNumber}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const currentMonth = MONTHS[new Date().getMonth()];
  const currentYear = new Date().getFullYear();
  const premiumDescription = 'Получите полный обзор ваших задач на месяц вперёд';
  const safeAreaSpacing = useMemo(
    () => ({
      paddingTop: insets.top,
      paddingBottom: Math.max(insets.bottom, 16),
    }),
    [insets.bottom, insets.top]
  );

  if (!store || !store.isReady) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Загрузка...</Text>
        </View>
      </View>
    );
  }

  return (
    <PremiumGate 
      feature="Месячный обзор"
      fallback={
        <View style={styles.gatedPlaceholder}>
          <Text style={styles.gatedTitle}>Только для GoalForge Premium</Text>
          <Text style={styles.gatedMessage}>{premiumDescription}</Text>
        </View>
      }
    >
      <View style={[styles.container, safeAreaSpacing]}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/plan');
              }
            }}
          >
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <Text style={styles.title}>Обзор месяца</Text>
            <Text style={styles.subtitle}>{currentMonth} {currentYear}</Text>
          </View>
        </View>
        
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.legendText}>Все выполнено</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#FFD600' }]} />
              <Text style={styles.legendText}>Есть невыполненные</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#5A5A5A' }]} />
              <Text style={styles.legendText}>Нет задач</Text>
            </View>
          </View>
          
          {renderDaysList()}
          
          <TouchableOpacity 
            style={styles.backToWeekButton}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/plan');
              }
            }}
          >
            <Clock size={20} color="#000000" />
            <Text style={styles.backToWeekText}>Назад к неделе</Text>
          </TouchableOpacity>
        </ScrollView>

        <DayTasksModal
          visible={modalVisible}
          day={selectedDay}
          onClose={() => {
            setModalVisible(false);
            setSelectedDay(null);
          }}
          onToggleTask={handleToggleTask}
          onAddTask={handleAddTask}
        />
      </View>
    </PremiumGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#A0A0A0',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  daysListContainer: {
    marginBottom: 24,
  },
  dayListItem: {
    backgroundColor: '#121212',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  todayListItem: {
    borderColor: '#FFD600',
    backgroundColor: 'rgba(255, 214, 0, 0.05)',
  },
  dayListContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  dayListLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dayIndicator: {
    width: 4,
    height: 48,
    borderRadius: 2,
    marginRight: 16,
  },
  dayInfo: {
    flex: 1,
  },
  dayListDate: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  todayListDate: {
    color: '#FFD600',
  },
  dayListTasks: {
    fontSize: 14,
    color: '#A0A0A0',
  },
  dayListRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  progressBar: {
    width: 60,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  dayListNumber: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
    minWidth: 24,
    textAlign: 'center',
  },
  backToWeekButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD600',
    height: 56,
    borderRadius: 12,
    gap: 8,
    marginTop: 24,
  },
  backToWeekText: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#000000',
  },
  gatedPlaceholder: {
    flex: 1,
    backgroundColor: '#050505',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  gatedTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  gatedMessage: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 22,
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

const modalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  closeButton: {
    padding: 8,
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  taskItem: {
    backgroundColor: '#121212',
    borderRadius: 16,
    padding: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  taskContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxCompleted: {
    backgroundColor: '#FFD600',
    borderColor: '#FFD600',
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: 'rgba(255,255,255,0.6)',
  },
  taskDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
    lineHeight: 20,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  taskDuration: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityHigh: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  priorityMedium: {
    backgroundColor: 'rgba(255, 214, 0, 0.2)',
  },
  priorityLow: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '500' as const,
    color: '#FFFFFF',
  },
  addForm: {
    backgroundColor: '#121212',
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#FFD600',
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#FFD600',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(255, 214, 0, 0.3)',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#000000',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD600',
    height: 48,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#000000',
  },
});