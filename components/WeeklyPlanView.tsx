import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Calendar, Clock, Target, CheckCircle, AlertCircle, Plus, ChevronRight, Star } from 'lucide-react-native';
import { DailyTask, SubTask } from '@/types/goal';
import { TaskDetailModal } from './TaskDetailModal';

interface WeeklyPlanViewProps {
  weeklyTasks: { [dayOfWeek: string]: DailyTask[] };
  onTaskToggle: (taskId: string) => void;
  onAddTask: (day: string) => void;
  selectedDay?: string;
  onDaySelect: (day: string) => void;
  availableDays?: string[];
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday', short: 'MON' },
  { key: 'tuesday', label: 'Tuesday', short: 'TUE' },
  { key: 'wednesday', label: 'Wednesday', short: 'WED' },
  { key: 'thursday', label: 'Thursday', short: 'THU' },
  { key: 'friday', label: 'Friday', short: 'FRI' },
  { key: 'saturday', label: 'Saturday', short: 'SAT' },
  { key: 'sunday', label: 'Sunday', short: 'SUN' },
];

const getDifficultyColor = (difficulty: 'easy' | 'medium' | 'hard') => {
  switch (difficulty) {
    case 'easy': return '#4ADE80';
    case 'medium': return '#FFD600';
    case 'hard': return '#FF6B6B';
    default: return '#FFD600';
  }
};

const getPriorityIcon = (priority: 'high' | 'medium' | 'low') => {
  switch (priority) {
    case 'high': return <AlertCircle size={16} color="#FF6B6B" />;
    case 'medium': return <Target size={16} color="#FFD600" />;
    case 'low': return <Clock size={16} color="#4ADE80" />;
    default: return <Target size={16} color="#FFD600" />;
  }
};

export function WeeklyPlanView({ 
  weeklyTasks, 
  onTaskToggle, 
  onAddTask, 
  selectedDay = 'monday',
  onDaySelect,
  availableDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
}: WeeklyPlanViewProps) {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [selectedTask, setSelectedTask] = useState<DailyTask | null>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);

  const toggleTaskExpansion = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const getCurrentDayTasks = () => {
    return weeklyTasks[selectedDay] || [];
  };

  const getDayProgress = (dayKey: string) => {
    const tasks = weeklyTasks[dayKey] || [];
    if (tasks.length === 0) return 0;
    const completed = tasks.filter(task => task.completed).length;
    return (completed / tasks.length) * 100;
  };

  const getTotalEstimatedTime = (tasks: DailyTask[]) => {
    return tasks.reduce((total, task) => total + task.estimatedTime, 0);
  };

  const renderSubTasks = (subtasks: SubTask[], taskId: string) => {
    if (!subtasks || subtasks.length === 0) return null;

    return (
      <View style={styles.subtasksContainer}>
        {subtasks.map((subtask) => (
          <TouchableOpacity 
            key={subtask.id} 
            style={styles.subtaskItem}
            onPress={() => {/* Handle subtask toggle */}}
          >
            <View style={[styles.subtaskCheckbox, subtask.completed && styles.subtaskCheckboxCompleted]}>
              {subtask.completed && <CheckCircle size={12} color="#4ADE80" />}
            </View>
            <Text style={[styles.subtaskText, subtask.completed && styles.subtaskTextCompleted]}>
              {subtask.title}
            </Text>
            <Text style={styles.subtaskTime}>{subtask.estimatedTime}м</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const handleTaskPress = (task: DailyTask) => {
    setSelectedTask(task);
    setShowTaskDetail(true);
  };

  const renderTaskCard = (task: DailyTask) => {
    const isExpanded = expandedTasks.has(task.id);
    const hasSubtasks = task.subtasks && task.subtasks.length > 0;
    
    return (
      <View key={task.id} style={styles.taskCard}>
        <TouchableOpacity 
          style={styles.taskHeader}
          onPress={() => handleTaskPress(task)}
        >
          <TouchableOpacity 
            style={[styles.taskCheckbox, task.completed && styles.taskCheckboxCompleted]}
            onPress={() => onTaskToggle(task.id)}
          >
            {task.completed && <CheckCircle size={18} color="#4ADE80" />}
          </TouchableOpacity>
          
          <View style={styles.taskContent}>
            <View style={styles.taskTitleRow}>
              <Text style={[styles.taskTitle, task.completed && styles.taskTitleCompleted]}>
                {task.title}
              </Text>
              {task.adaptedFromPrevious && (
                <View style={styles.adaptedBadge}>
                  <Star size={12} color="#FFD600" />
                </View>
              )}
            </View>
            
            <Text style={styles.taskDescription} numberOfLines={2}>
              {task.description}
            </Text>
            
            <TouchableOpacity 
              style={styles.viewDetailsButton}
              onPress={() => handleTaskPress(task)}
            >
              <Text style={styles.viewDetailsText}>Details</Text>
            </TouchableOpacity>
            
            <View style={styles.taskMeta}>
              <View style={styles.taskMetaItem}>
                {getPriorityIcon(task.priority)}
                <Text style={styles.taskMetaText}>{task.priority}</Text>
              </View>
              
              <View style={styles.taskMetaItem}>
                <Clock size={14} color="rgba(255,255,255,0.6)" />
                <Text style={styles.taskMetaText}>{task.estimatedTime}м</Text>
              </View>
              
              <View style={[
                styles.difficultyBadge,
                { backgroundColor: getDifficultyColor(task.difficulty) + '20' }
              ]}>
                <Text style={[
                  styles.difficultyText,
                  { color: getDifficultyColor(task.difficulty) }
                ]}>
                  {task.difficulty}
                </Text>
              </View>
            </View>
          </View>
          
          {hasSubtasks && (
            <TouchableOpacity 
              style={styles.expandButton}
              onPress={(e) => {
                e.stopPropagation();
                toggleTaskExpansion(task.id);
              }}
            >
              <ChevronRight 
                size={20} 
                color="rgba(255,255,255,0.6)" 
                style={[styles.expandIcon, isExpanded && styles.expandIconRotated]}
              />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
        
        {isExpanded && hasSubtasks && renderSubTasks(task.subtasks!, task.id)}
        
        {task.tips && task.tips.length > 0 && isExpanded && (
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>💡 Tips:</Text>
            {task.tips.map((tip, index) => (
              <Text key={index} style={styles.tipText}>• {tip}</Text>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Week Navigation */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.weekNavigation}
        contentContainerStyle={styles.weekNavigationContent}
      >
        {DAYS_OF_WEEK.map((day) => {
          const progress = getDayProgress(day.key);
          const isSelected = selectedDay === day.key;
          const tasksCount = (weeklyTasks[day.key] || []).length;
          const isAvailable = availableDays.includes(day.key);
          
          return (
            <TouchableOpacity
              key={day.key}
              style={[
                styles.dayButton, 
                isSelected && styles.dayButtonSelected,
                !isAvailable && styles.dayButtonDisabled
              ]}
              onPress={() => isAvailable && onDaySelect(day.key)}
              disabled={!isAvailable}
            >
              <Text style={[
                styles.dayShort, 
                isSelected && styles.dayShortSelected,
                !isAvailable && styles.dayShortDisabled
              ]}>
                {day.short}
              </Text>

              
              {tasksCount > 0 && isAvailable && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBackground}>
                    <View style={[styles.progressFill, { width: `${progress}%` }]} />
                  </View>
                  <Text style={styles.tasksCount}>{tasksCount}</Text>
                </View>
              )}
              
              {!isAvailable && (
                <View style={styles.lockedContainer}>
                  <Text style={styles.lockedText}>🔒</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      
      {/* Selected Day Content */}
      <ScrollView style={styles.dayContent} showsVerticalScrollIndicator={false}>
        <View style={styles.dayHeader}>
          <Text style={styles.dayTitle}>
            {DAYS_OF_WEEK.find(d => d.key === selectedDay)?.label}
          </Text>
          
          <View style={styles.dayStats}>
            <View style={styles.dayStatItem}>
              <Target size={16} color="#FFFFFF" />
              <Text style={styles.dayStatText}>
                {getCurrentDayTasks().filter(t => t.completed).length}/{getCurrentDayTasks().length} tasks
              </Text>
            </View>
            
            <View style={styles.dayStatItem}>
              <Clock size={16} color="#FFFFFF" />
              <Text style={styles.dayStatText}>
                {getTotalEstimatedTime(getCurrentDayTasks())}м
              </Text>
            </View>
          </View>
        </View>
        
        {/* Индикатор взаимосвязи задач */}
        {getCurrentDayTasks().length > 1 && (
          <View style={styles.tasksConnectionHint}>
            <Text style={styles.connectionHintText}>
              🔗 Tasks are interconnected and complement each other
            </Text>
          </View>
        )}
        
        {/* Add Task Button - только для доступных дней */}
        {availableDays.includes(selectedDay) && (
          <TouchableOpacity 
            style={styles.addTaskButton}
            onPress={() => onAddTask(selectedDay)}
          >
            <Plus size={20} color="#000000" />
            <Text style={styles.addTaskButtonText}>Add Task</Text>
          </TouchableOpacity>
        )}
        
        {/* Tasks List */}
        <View style={styles.tasksContainer}>
          {!availableDays.includes(selectedDay) ? (
            <View style={styles.emptyState}>
              <Text style={styles.lockedDayIcon}>🔒</Text>
              <Text style={styles.emptyTitle}>Day unavailable</Text>
              <Text style={styles.emptySubtitle}>Only today is available</Text>
            </View>
          ) : getCurrentDayTasks().length > 0 ? (
            getCurrentDayTasks().map(renderTaskCard)
          ) : (
            <View style={styles.emptyState}>
              <Calendar size={48} color="rgba(255,255,255,0.5)" />
              <Text style={styles.emptyTitle}>No tasks for this day</Text>
            </View>
          )}
        </View>
      </ScrollView>
      
      <TaskDetailModal
        visible={showTaskDetail}
        task={selectedTask}
        onClose={() => {
          setShowTaskDetail(false);
          setSelectedTask(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  weekNavigation: {
    maxHeight: 120,
    marginBottom: 20,
  },
  weekNavigationContent: {
    paddingHorizontal: 0,
    gap: 12,
  },
  dayButton: {
    minWidth: 80,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#121212',
    alignItems: 'center',
  },
  dayButtonSelected: {
    backgroundColor: '#FFD600',
    ...Platform.select({
      ios: {
        shadowColor: '#FFD600',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
      default: {},
    }),
  },
  dayShort: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  dayShortSelected: {
    color: '#000000',
  },

  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBackground: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4ADE80',
    borderRadius: 2,
  },
  tasksCount: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
  },
  dayContent: {
    flex: 1,
  },
  dayHeader: {
    marginBottom: 24,
  },
  dayTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
    marginBottom: 12,
  },
  dayStats: {
    flexDirection: 'row',
    gap: 20,
  },
  dayStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dayStatText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  addTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD600',
    height: 56,
    borderRadius: 36,
    marginTop: 24,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#FFD600',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
      default: {},
    }),
  },
  addTaskButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#000000',
    marginLeft: 8,
  },
  tasksContainer: {
    gap: 16,
    paddingBottom: 40,
  },
  taskCard: {
    backgroundColor: '#121212',
    borderRadius: 20,
    overflow: 'hidden',
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  taskCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    marginTop: 2,
  },
  taskCheckboxCompleted: {
    backgroundColor: '#4ADE80',
    borderColor: '#4ADE80',
  },
  taskContent: {
    flex: 1,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    flex: 1,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: 'rgba(255,255,255,0.5)',
  },
  adaptedBadge: {
    marginLeft: 8,
  },
  taskDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 10,
    lineHeight: 20,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  taskMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskMetaText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'capitalize',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '600' as const,
    textTransform: 'uppercase',
  },
  expandButton: {
    padding: 4,
    marginLeft: 8,
  },
  expandIcon: {
    transform: [{ rotate: '0deg' }],
  },
  expandIconRotated: {
    transform: [{ rotate: '90deg' }],
  },
  subtasksContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingLeft: 40,
  },
  subtaskCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  subtaskCheckboxCompleted: {
    backgroundColor: '#4ADE80',
    borderColor: '#4ADE80',
  },
  subtaskText: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  subtaskTextCompleted: {
    textDecorationLine: 'line-through',
    color: 'rgba(255,255,255,0.4)',
  },
  subtaskTime: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  tipsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFD600',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 18,
    marginBottom: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#121212',
    borderRadius: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 8,
    textAlign: 'center',
  },
  tasksConnectionHint: {
    backgroundColor: 'rgba(255,214,0,0.1)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,214,0,0.2)',
  },
  connectionHintText: {
    fontSize: 13,
    color: '#FFD600',
    textAlign: 'center',
  },
  dayButtonDisabled: {
    opacity: 0.4,
  },
  dayShortDisabled: {
    color: 'rgba(255,255,255,0.3)',
  },

  lockedContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 4,
  },
  lockedText: {
    fontSize: 12,
  },
  lockedDayIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  viewDetailsButton: {
    marginTop: 8,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  viewDetailsText: {
    fontSize: 12,
    color: '#FFD600',
    fontWeight: '600' as const,
  },
});