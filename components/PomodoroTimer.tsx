import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Animated, Platform, TouchableOpacity, Dimensions, ScrollView, Modal, Pressable } from 'react-native';
import { Play, Pause, Square, RotateCcw, Target, Wind, X } from 'lucide-react-native';
import { router } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { Picker } from '@react-native-picker/picker';
import { theme } from '@/constants/theme';
import { useGoalStore } from '@/hooks/use-goal-store';
import { useTimer } from '@/hooks/use-timer-store';


const { width: screenWidth } = Dimensions.get('window');

const SESSION_LABELS = {
  focus: 'Фокус',
  shortBreak: 'Перерыв',
  longBreak: 'Длинный перерыв',
};

const TIMER_SIZE = Math.min(screenWidth * 0.62, 220);
const STROKE_WIDTH = 3;
const RADIUS = (TIMER_SIZE / 2) - STROKE_WIDTH;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const QUICK_PRESETS = [10, 25, 45, 60];

export function PomodoroTimer() {
  const { currentGoal } = useGoalStore();
  const timerStore = useTimer();
  
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  const [selectedMinutes, setSelectedMinutes] = useState<number>(25);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(25);
  const [showTimeSelector, setShowTimeSelector] = useState<boolean>(false);
  const panelSlideAnim = useRef(new Animated.Value(0)).current;
  
  // Get timer values with defaults
  const isRunning = timerStore?.isRunning ?? false;
  const isPaused = timerStore?.isPaused ?? false;
  const currentTime = timerStore?.currentTime ?? 1500;
  const totalTime = timerStore?.totalTime ?? 1500;
  const mode = timerStore?.mode ?? 'focus';
  const startTimer = timerStore?.startTimer;
  const pauseTimer = timerStore?.pauseTimer;
  const resumeTimer = timerStore?.resumeTimer;
  const stopTimer = timerStore?.stopTimer;
  const skipTimer = timerStore?.skipTimer;
  const setMode = timerStore?.setMode;

  const getTodaySessions = timerStore?.getTodaySessions;
  const setCustomDuration = timerStore?.setCustomDuration;

  const minuteOptions = useMemo(() => {
    return Array.from({ length: 120 }, (_, i) => i + 1);
  }, []);

  // Update custom duration when minutes change
  useEffect(() => {
    if (!isRunning && setCustomDuration) {
      setCustomDuration(selectedMinutes * 60);
    }
  }, [selectedMinutes, isRunning, setCustomDuration]);

  const handlePresetSelect = (minutes: number) => {
    if (!isRunning) {
      setSelectedMinutes(minutes);
      setSelectedPreset(minutes);
    }
  };

  const handleWheelChange = (minutes: number) => {
    if (!isRunning) {
      setSelectedMinutes(minutes);
      setSelectedPreset(null);
    }
  };

  const openTimeSelector = () => {
    if (!isRunning) {
      setShowTimeSelector(true);
      Animated.spring(panelSlideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    }
  };

  const closeTimeSelector = () => {
    Animated.timing(panelSlideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowTimeSelector(false);
    });
  };

  // Update progress animation
  useEffect(() => {
    if (timerStore) {
      const progress = totalTime > 0 ? 1 - (currentTime / totalTime) : 0;
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [currentTime, totalTime, progressAnim, timerStore]);



  // Completion animation
  useEffect(() => {
    if (timerStore && currentTime === 0 && !isRunning) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [currentTime, isRunning, scaleAnim, timerStore]);

  // Remove breathing animation for Start button
  
  // Early return if timer store is not ready
  if (!timerStore) {
    return (
      <View style={styles.container}>
        <Text style={styles.sessionLabel}>Загрузка...</Text>
      </View>
    );
  }

  const handleStart = async () => {
    if (startTimer) {
      await startTimer(currentGoal?.id);
    }
  };

  const handleStop = async () => {
    if (stopTimer) {
      await stopTimer();
    }
  };

  const handleModeChange = (newMode: 'focus' | 'shortBreak' | 'longBreak') => {
    if (!isRunning && setMode) {
      setMode(newMode);
      progressAnim.setValue(0);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = totalTime > 0 ? 1 - (currentTime / totalTime) : 0;
  const todaySessions = getTodaySessions ? getTodaySessions() : [];
  const todayFocusSessions = todaySessions.filter(s => s.type === 'focus').length;

  return (
    <View style={styles.container}>
      {/* Ambient Background */}
      <View style={styles.ambientBackground} />
      
      {/* Session Info */}
      <View style={styles.sessionInfo}>
        <Text style={styles.sessionLabel}>{SESSION_LABELS[mode]}</Text>
        <Text style={styles.sessionCounter}>
          Сессия {todayFocusSessions + (isRunning && mode === 'focus' ? 1 : 0)} из дня
        </Text>
      </View>



      {/* Main Timer Circle */}
      <TouchableOpacity 
        onPress={openTimeSelector}
        disabled={isRunning}
        activeOpacity={1}
      >
        <Animated.View style={[
          styles.timerContainer, 
          { 
            transform: [
              { scale: scaleAnim },
              { translateY: showTimeSelector ? -12 : 0 }
            ] 
          }
        ]}>
          <View style={[styles.timerCircle, { width: TIMER_SIZE, height: TIMER_SIZE }]}>
          {/* Background Circle */}
          <View style={[styles.circleBackground, { width: TIMER_SIZE, height: TIMER_SIZE }]} />
          
          {/* Progress Ring */}
          <View style={styles.progressContainer}>
            {Platform.OS !== 'web' ? (
              <Svg width={TIMER_SIZE} height={TIMER_SIZE} style={styles.progressSvg}>
                {/* Background ring */}
                <Circle
                  cx={TIMER_SIZE / 2}
                  cy={TIMER_SIZE / 2}
                  r={RADIUS}
                  stroke={theme.colors.glassBorder}
                  strokeWidth={STROKE_WIDTH}
                  fill="none"
                  opacity={0.3}
                />
                {/* Progress ring */}
                <Circle
                  cx={TIMER_SIZE / 2}
                  cy={TIMER_SIZE / 2}
                  r={RADIUS}
                  stroke={theme.colors.primary}
                  strokeWidth={STROKE_WIDTH}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE.toString()}
                  strokeDashoffset={(CIRCUMFERENCE * (1 - progress)).toString()}
                  transform={`rotate(-90 ${TIMER_SIZE / 2} ${TIMER_SIZE / 2})`}
                />
              </Svg>
            ) : (
              <>
                <View style={[styles.progressRingWeb, {
                  width: TIMER_SIZE - STROKE_WIDTH * 2,
                  height: TIMER_SIZE - STROKE_WIDTH * 2,
                  borderRadius: (TIMER_SIZE - STROKE_WIDTH * 2) / 2,
                  borderWidth: STROKE_WIDTH,
                  borderColor: theme.colors.glassBorder + '4D',
                }]} />
                <View style={[
                  styles.progressRingWeb,
                  {
                    width: TIMER_SIZE - STROKE_WIDTH * 2,
                    height: TIMER_SIZE - STROKE_WIDTH * 2,
                    borderRadius: (TIMER_SIZE - STROKE_WIDTH * 2) / 2,
                    borderWidth: STROKE_WIDTH,
                    borderColor: 'transparent',
                    borderTopColor: theme.colors.primary,
                    transform: [
                      { rotate: '-90deg' },
                      { rotate: `${progress * 360}deg` },
                    ],
                  },
                ]} />
              </>
            )}
          </View>
          
          {/* Timer Content */}
          <View style={styles.timerContent}>
            <Text style={styles.timerText}>{formatTime(currentTime)}</Text>
            <Text style={styles.timerStatus}>
              {isRunning && !isPaused ? 'Идёт фокус' : 
               isPaused ? 'На паузе' :
               currentTime === 0 ? 'Завершено!' : 'Готов к старту'}
            </Text>
          </View>
        </View>
        </Animated.View>
      </TouchableOpacity>

      {/* Time Selection Modal Panel */}
      <Modal
        visible={showTimeSelector}
        transparent
        animationType="none"
        onRequestClose={closeTimeSelector}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeTimeSelector}
        >
          <Animated.View 
            style={[
              styles.timeSelectorPanel,
              {
                opacity: panelSlideAnim,
                transform: [
                  {
                    translateY: panelSlideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [300, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity activeOpacity={1}>
              {/* Panel Handle */}
              <View style={styles.panelHandle} />
              
              <View style={styles.panelContent}>
                <View style={styles.panelHeader}>
                  <Text style={styles.panelTitle}>Выберите время</Text>
                  <TouchableOpacity onPress={closeTimeSelector} style={styles.closeButton}>
                    <X size={20} color="#AFAFAF" />
                  </TouchableOpacity>
                </View>
                
                {/* Quick Presets */}
                <View style={styles.presetsContainer}>
                  {QUICK_PRESETS.map((minutes) => (
                    <TouchableOpacity
                      key={minutes}
                      style={[
                        styles.presetButton,
                        selectedPreset === minutes && styles.presetButtonActive,
                      ]}
                      onPress={() => handlePresetSelect(minutes)}
                    >
                      <Text style={[
                        styles.presetButtonText,
                        selectedPreset === minutes && styles.presetButtonTextActive,
                      ]}>
                        {minutes}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Manual Picker */}
                <View style={styles.pickerContainer}>
                  {Platform.OS === 'web' ? (
                    <ScrollView 
                      style={styles.webPickerScroll}
                      contentContainerStyle={styles.webPickerContent}
                      showsVerticalScrollIndicator={false}
                    >
                      {minuteOptions.map((min) => (
                        <TouchableOpacity
                          key={min}
                          style={[
                            styles.webPickerItem,
                            selectedMinutes === min && styles.webPickerItemActive,
                          ]}
                          onPress={() => handleWheelChange(min)}
                        >
                          <Text style={[
                            styles.webPickerText,
                            selectedMinutes === min && styles.webPickerTextActive,
                          ]}>
                            {min}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  ) : (
                    <Picker
                      selectedValue={selectedMinutes}
                      onValueChange={handleWheelChange}
                      style={styles.picker}
                      itemStyle={styles.pickerItem}
                    >
                      {minuteOptions.map((min) => (
                        <Picker.Item
                          key={min}
                          label={`${min}`}
                          value={min}
                        />
                      ))}
                    </Picker>
                  )}
                  <Text style={styles.pickerLabel}>минут</Text>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Quick Controls */}
      <View style={styles.quickControls}>
        {!isRunning ? (
          <Pressable 
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed
            ]} 
            onPress={handleStart}
          >
            <Play size={20} color="#111214" fill="#111214" strokeWidth={2.5} />
            <Text style={styles.primaryButtonText}>
              {mode === 'focus' ? 'Старт' : 'Начать отдых'}
            </Text>
          </Pressable>
        ) : (
          <>
            <View style={styles.controlRow}>
              {!isPaused ? (
                <Pressable 
                  style={({ pressed }) => [
                    styles.controlCircle,
                    pressed && styles.controlCirclePressed
                  ]}
                  onPress={pauseTimer}
                >
                  <Pause size={22} color="#FFD12A" fill="#FFD12A" />
                </Pressable>
              ) : (
                <Pressable 
                  style={({ pressed }) => [
                    styles.controlCircle,
                    pressed && styles.controlCirclePressed
                  ]}
                  onPress={resumeTimer}
                >
                  <Play size={22} color="#FFD12A" fill="#FFD12A" />
                </Pressable>
              )}
              
              <Pressable 
                style={({ pressed }) => [
                  styles.controlDanger,
                  pressed && styles.controlDangerPressed
                ]}
                onPress={handleStop}
              >
                <Square size={20} color="#FF4D4D" />
              </Pressable>
            </View>
          </>
        )}
      </View>

      {/* Dream Card */}
      {currentGoal && (
        <View style={styles.dreamCard}>
          <View style={styles.dreamHeader}>
            <Target size={16} color={theme.colors.primary} />
            <Text style={styles.dreamTitle}>{currentGoal.title}</Text>
          </View>
          <Text style={styles.dreamSubtitle}>Работаю над мечтой</Text>
          <View style={styles.dreamProgress}>
            <View style={[styles.dreamProgressBar, { width: `${Math.min(progress * 100, 100)}%` }]} />
          </View>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.quickActionsTitle}>Быстрые действия</Text>
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => router.push('/breathing')}
        >
          <Wind size={20} color={theme.colors.primary} />
          <Text style={styles.quickActionText}>Дыхательные техники</Text>
        </TouchableOpacity>
      </View>

      {/* Session Type Indicator */}
      <View style={styles.sessionTypes}>
        {(['focus', 'shortBreak', 'longBreak'] as const).map((type) => (
          <View
            key={type}
            style={[
              styles.sessionTypeButton,
              mode === type && styles.sessionTypeButtonActive,
            ]}
          >
            <Text style={[
              styles.sessionTypeText,
              mode === type && styles.sessionTypeTextActive,
            ]}>
              {SESSION_LABELS[type]}
            </Text>
          </View>
        ))}
      </View>


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    position: 'relative',
    paddingBottom: theme.spacing.xl,
  },
  ambientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.background,
    opacity: 0.95,
  },
  sessionInfo: {
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    zIndex: 1,
  },
  sessionLabel: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.extrabold as any,
    color: theme.colors.text,
    marginBottom: 4,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  sessionCounter: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
    zIndex: 1,
  },
  timerCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  circleBackground: {
    position: 'absolute',
    borderRadius: TIMER_SIZE / 2,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    ...theme.shadows.medium,
    shadowColor: 'rgba(255, 212, 59, 0.12)',
  },
  progressContainer: {
    position: 'absolute',
    width: TIMER_SIZE,
    height: TIMER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressSvg: {
    position: 'absolute',
  },
  progressRingWeb: {
    position: 'absolute',
  },
  timerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timerText: {
    fontSize: 34,
    fontWeight: theme.fontWeight.extrabold as any,
    color: theme.colors.text,
    marginBottom: 4,
    letterSpacing: -1.5,
    textAlign: 'center',
  },
  timerStatus: {
    fontSize: 13,
    color: '#FFD43B',
    fontWeight: theme.fontWeight.medium as any,
  },
  quickControls: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.sm,
    zIndex: 1,
    width: '100%',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD12A',
    paddingHorizontal: 24,
    height: 48,
    borderRadius: 24,
    gap: 12,
    minWidth: 200,
    shadowColor: '#FFD12A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(178, 134, 0, 0.12)',
  },
  primaryButtonPressed: {
    transform: [{ scale: 0.98 }],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '500' as any,
    color: '#111214',
    letterSpacing: 0.2,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    justifyContent: 'center',
  },
  controlCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 209, 42, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 209, 42, 0.2)',
  },
  controlCirclePressed: {
    transform: [{ scale: 0.97 }],
    backgroundColor: 'rgba(255, 209, 42, 0.18)',
    shadowColor: '#FFD12A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  controlDanger: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#111214',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 77, 0.08)',
  },
  controlDangerPressed: {
    transform: [{ scale: 0.97 }],
    backgroundColor: 'rgba(255, 77, 77, 0.1)',
  },
  dreamCard: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    ...theme.shadows.medium,
    zIndex: 1,
  },
  dreamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  dreamTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.text,
    flex: 1,
  },
  dreamSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  dreamProgress: {
    height: 3,
    backgroundColor: theme.colors.borderLight,
    borderRadius: theme.borderRadius.xs,
    overflow: 'hidden',
  },
  dreamProgressBar: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.xs,
  },
  sessionTypes: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
    zIndex: 1,
    marginBottom: theme.spacing.md,
  },
  sessionTypeButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    ...theme.shadows.subtle,
  },
  sessionTypeButtonActive: {
    backgroundColor: theme.colors.glass,
    borderColor: theme.colors.primary,
  },
  sessionTypeButtonDisabled: {
    opacity: 0.4,
  },
  sessionTypeText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium as any,
  },
  sessionTypeTextActive: {
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold as any,
  },
  quickActions: {
    width: '100%',
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.sm,
    zIndex: 1,
  },
  quickActionsTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    ...theme.shadows.subtle,
    gap: 8,
  },
  quickActionText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium as any,
    color: theme.colors.text,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  timeSelectorPanel: {
    backgroundColor: '#0E0E0E',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingBottom: 40,
    maxHeight: '65%',
    borderWidth: 1,
    borderColor: 'rgba(255, 212, 59, 0.15)',
    shadowColor: '#FFD43B',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  panelHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 212, 59, 0.4)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  panelContent: {
    paddingHorizontal: theme.spacing.lg,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: '600' as any,
    color: '#AFAFAF',
    letterSpacing: 0.3,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: theme.spacing.md,
    justifyContent: 'space-between',
  },
  presetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#1A1A1A',
    borderWidth: 1.5,
    borderColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetButtonActive: {
    backgroundColor: '#FFD43B',
    borderColor: '#FFD43B',
    shadowColor: '#FFD43B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  presetButtonText: {
    fontSize: 15,
    fontWeight: '600' as any,
    color: '#888888',
  },
  presetButtonTextActive: {
    color: '#000000',
    fontWeight: '700' as any,
  },
  pickerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  picker: {
    width: '85%',
    height: 110,
  },
  pickerItem: {
    fontSize: 22,
    fontWeight: '600' as any,
    color: '#FFD43B',
    height: 110,
  },
  pickerLabel: {
    fontSize: 13,
    fontWeight: '500' as any,
    color: '#777777',
    marginTop: 8,
    textAlign: 'center',
  },
  webPickerScroll: {
    maxHeight: 100,
    width: '90%',
  },
  webPickerContent: {
    paddingVertical: theme.spacing.sm,
  },
  webPickerItem: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
    marginVertical: 2,
  },
  webPickerItemActive: {
    backgroundColor: theme.colors.glass,
  },
  webPickerText: {
    fontSize: 18,
    fontWeight: '500' as any,
    color: '#666666',
  },
  webPickerTextActive: {
    fontSize: 24,
    fontWeight: '700' as any,
    color: '#FFD43B',
  },
});