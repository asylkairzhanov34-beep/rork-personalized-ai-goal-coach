import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { X, Clock } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { EVENT_CATEGORIES } from '@/types/schedule';
import { Button } from '@/components/Button';

interface EventCreationModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (eventData: any) => void;
  initialDate?: string;
}

export function EventCreationModal({
  visible,
  onClose,
  onSubmit,
  initialDate,
}: EventCreationModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<keyof typeof EVENT_CATEGORIES>('focus');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');

  const handleSubmit = () => {
    if (!title.trim()) return;

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      category,
      startTime,
      endTime,
      priority,
      date: initialDate || new Date().toISOString(),
    });

    setTitle('');
    setDescription('');
    setCategory('focus');
    setStartTime('09:00');
    setEndTime('10:00');
    setPriority('medium');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Новая задача</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Text style={styles.label}>Название *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Что нужно сделать?"
                placeholderTextColor={theme.colors.textSecondary}
                autoFocus
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Описание</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Добавьте детали..."
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Категория</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {(Object.keys(EVENT_CATEGORIES) as (keyof typeof EVENT_CATEGORIES)[]).map((cat) => {
                  const catData = EVENT_CATEGORIES[cat];
                  const isSelected = category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryChip,
                        isSelected && styles.categoryChipSelected,
                        { borderColor: catData.color },
                      ]}
                      onPress={() => setCategory(cat)}
                    >
                      <View style={[styles.categoryDot, { backgroundColor: catData.color }]} />
                      <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextSelected]}>
                        {catData.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.row}>
              <View style={[styles.section, styles.halfWidth]}>
                <Text style={styles.label}>Начало</Text>
                <View style={styles.timeInput}>
                  <Clock size={16} color={theme.colors.textSecondary} />
                  <TextInput
                    style={styles.timeText}
                    value={startTime}
                    onChangeText={setStartTime}
                    placeholder="09:00"
                    placeholderTextColor={theme.colors.textSecondary}
                  />
                </View>
              </View>

              <View style={[styles.section, styles.halfWidth]}>
                <Text style={styles.label}>Конец</Text>
                <View style={styles.timeInput}>
                  <Clock size={16} color={theme.colors.textSecondary} />
                  <TextInput
                    style={styles.timeText}
                    value={endTime}
                    onChangeText={setEndTime}
                    placeholder="10:00"
                    placeholderTextColor={theme.colors.textSecondary}
                  />
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Приоритет</Text>
              <View style={styles.priorityRow}>
                {(['high', 'medium', 'low'] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.priorityChip,
                      priority === p && styles.priorityChipSelected,
                    ]}
                    onPress={() => setPriority(p)}
                  >
                    <Text style={[
                      styles.priorityText,
                      priority === p && styles.priorityTextSelected,
                    ]}>
                      {p === 'high' ? 'Высокий' : p === 'medium' ? 'Средний' : 'Низкий'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Button
              title="Создать задачу"
              onPress={handleSubmit}
              disabled={!title.trim()}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.3)',
      },
    }) as any,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
    borderWidth: 2,
    marginRight: 8,
  },
  categoryChipSelected: {
    backgroundColor: 'rgba(255, 214, 0, 0.1)',
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: theme.colors.textSecondary,
  },
  categoryChipTextSelected: {
    color: theme.colors.text,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  timeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  timeText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    padding: 0,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  priorityChipSelected: {
    backgroundColor: 'rgba(255, 214, 0, 0.1)',
    borderColor: theme.colors.primary,
  },
  priorityText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: theme.colors.textSecondary,
  },
  priorityTextSelected: {
    color: theme.colors.primary,
  },
  footer: {
    padding: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
