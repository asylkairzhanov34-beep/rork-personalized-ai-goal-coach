import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { SoundSelector } from '@/components/SoundSelector';
import { SoundId } from '@/constants/sounds';

interface FocusSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  selectedSound: SoundId;
  onSoundChange: (sound: SoundId) => void;
}

export function FocusSettingsModal({ 
  visible, 
  onClose, 
  selectedSound, 
  onSoundChange 
}: FocusSettingsModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Настройки Фокуса</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Звуковые уведомления</Text>
            <Text style={styles.sectionDescription}>
              Выберите звук, который будет воспроизводиться при завершении таймера
            </Text>
            
            <SoundSelector
              selectedSound={selectedSound}
              onSoundChange={onSoundChange}
            />
          </View>

          {/* Future settings can be added here */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Дополнительные настройки</Text>
            <Text style={styles.sectionDescription}>
              Больше настроек будет добавлено в будущих обновлениях
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.glassBorder,
    backgroundColor: theme.colors.surface,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold as any,
    color: theme.colors.text,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.lg,
    paddingBottom: 100,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  sectionDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
});