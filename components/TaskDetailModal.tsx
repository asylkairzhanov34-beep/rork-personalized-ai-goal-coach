import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { X, Clock, Target, AlertCircle, Star } from 'lucide-react-native';
import { DailyTask } from '@/types/goal';

interface TaskDetailModalProps {
  visible: boolean;
  task: DailyTask | null;
  onClose: () => void;
}

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
    case 'high': return <AlertCircle size={20} color="#FF6B6B" />;
    case 'medium': return <Target size={20} color="#FFD600" />;
    case 'low': return <Clock size={20} color="#4ADE80" />;
    default: return <Target size={20} color="#FFD600" />;
  }
};

const getDifficultyLabel = (difficulty: 'easy' | 'medium' | 'hard') => {
  switch (difficulty) {
    case 'easy': return 'Легко';
    case 'medium': return 'Средне';
    case 'hard': return 'Сложно';
    default: return 'Средне';
  }
};

const getPriorityLabel = (priority: 'high' | 'medium' | 'low') => {
  switch (priority) {
    case 'high': return 'Высокий';
    case 'medium': return 'Средний';
    case 'low': return 'Низкий';
    default: return 'Средний';
  }
};

export function TaskDetailModal({ visible, task, onClose }: TaskDetailModalProps) {
  if (!task) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Детали задачи</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.taskCard}>
            <View style={styles.titleSection}>
              <View style={styles.titleRow}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                {task.adaptedFromPrevious && (
                  <View style={styles.adaptedBadge}>
                    <Star size={16} color="#FFD600" />
                    <Text style={styles.adaptedText}>Адаптировано</Text>
                  </View>
                )}
              </View>
              
              {task.completed && (
                <View style={styles.completedBadge}>
                  <Text style={styles.completedText}>✓ Выполнено</Text>
                </View>
              )}
            </View>

            <View style={styles.metaSection}>
              <View style={styles.metaItem}>
                <View style={styles.metaIcon}>
                  {getPriorityIcon(task.priority)}
                </View>
                <View>
                  <Text style={styles.metaLabel}>Приоритет</Text>
                  <Text style={styles.metaValue}>{getPriorityLabel(task.priority)}</Text>
                </View>
              </View>

              <View style={styles.metaItem}>
                <View style={styles.metaIcon}>
                  <Clock size={20} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.metaLabel}>Время</Text>
                  <Text style={styles.metaValue}>{task.estimatedTime} мин</Text>
                </View>
              </View>

              <View style={styles.metaItem}>
                <View style={[
                  styles.difficultyIcon,
                  { backgroundColor: getDifficultyColor(task.difficulty) + '20' }
                ]}>
                  <Text style={[
                    styles.difficultyText,
                    { color: getDifficultyColor(task.difficulty) }
                  ]}>
                    {getDifficultyLabel(task.difficulty)[0]}
                  </Text>
                </View>
                <View>
                  <Text style={styles.metaLabel}>Сложность</Text>
                  <Text style={styles.metaValue}>{getDifficultyLabel(task.difficulty)}</Text>
                </View>
              </View>
            </View>

            {task.description && (
              <View style={styles.descriptionSection}>
                <Text style={styles.sectionTitle}>Описание</Text>
                <Text style={styles.description}>{task.description}</Text>
              </View>
            )}

            {task.subtasks && task.subtasks.length > 0 && (
              <View style={styles.subtasksSection}>
                <Text style={styles.sectionTitle}>Подзадачи ({task.subtasks.length})</Text>
                {task.subtasks.map((subtask) => (
                  <View key={subtask.id} style={styles.subtaskItem}>
                    <View style={[
                      styles.subtaskCheckbox,
                      subtask.completed && styles.subtaskCheckboxCompleted
                    ]}>
                      {subtask.completed && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <View style={styles.subtaskContent}>
                      <Text style={[
                        styles.subtaskTitle,
                        subtask.completed && styles.subtaskTitleCompleted
                      ]}>
                        {subtask.title}
                      </Text>
                      <Text style={styles.subtaskTime}>{subtask.estimatedTime} мин</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {task.tips && task.tips.length > 0 && (
              <View style={styles.tipsSection}>
                <Text style={styles.sectionTitle}>💡 Советы</Text>
                {task.tips.map((tip, index) => (
                  <View key={index} style={styles.tipItem}>
                    <Text style={styles.tipBullet}>•</Text>
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            )}

            {task.completedAt && (
              <View style={styles.completionSection}>
                <Text style={styles.sectionTitle}>Выполнено</Text>
                <Text style={styles.completionDate}>
                  {new Date(task.completedAt).toLocaleString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  taskCard: {
    backgroundColor: '#121212',
    borderRadius: 20,
    padding: 24,
    marginTop: 20,
    marginBottom: 40,
  },
  titleSection: {
    marginBottom: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  taskTitle: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
    flex: 1,
    marginRight: 12,
    lineHeight: 32,
  },
  adaptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 214, 0, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  adaptedText: {
    fontSize: 12,
    color: '#FFD600',
    fontWeight: '600' as const,
  },
  completedBadge: {
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  completedText: {
    fontSize: 14,
    color: '#4ADE80',
    fontWeight: '600' as const,
  },
  metaSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  metaItem: {
    alignItems: 'center',
    flex: 1,
  },
  metaIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  difficultyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  difficultyText: {
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  metaLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  descriptionSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 24,
  },
  subtasksSection: {
    marginBottom: 24,
  },
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    marginBottom: 8,
  },
  subtaskCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  subtaskCheckboxCompleted: {
    backgroundColor: '#4ADE80',
    borderColor: '#4ADE80',
  },
  checkmark: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 'bold' as const,
  },
  subtaskContent: {
    flex: 1,
  },
  subtaskTitle: {
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtaskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: 'rgba(255,255,255,0.5)',
  },
  subtaskTime: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  tipsSection: {
    marginBottom: 24,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tipBullet: {
    fontSize: 16,
    color: '#FFD600',
    marginRight: 12,
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 22,
  },
  completionSection: {
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  completionDate: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
  },
});