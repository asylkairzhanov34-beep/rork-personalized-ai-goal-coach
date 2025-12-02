import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Modal,
  Alert,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { Picker } from '@react-native-picker/picker';
import { X, Settings, Play, Pause, Wind, RotateCcw } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useGoalStore } from '@/hooks/use-goal-store';
import { useTimer } from '@/hooks/use-timer-store';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const TIMER_SIZE = Math.min(SCREEN_WIDTH * 0.7, SCREEN_HEIGHT * 0.4, 280);
const STROKE_WIDTH = 4;
const RADIUS = TIMER_SIZE / 2 - STROKE_WIDTH;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const QUICK_PRESETS = [10, 25, 45, 60];

const SESSION_LABELS = {
  focus: 'Фокус',
  shortBreak: 'Перерыв',
  longBreak: 'Длинный перерыв',
};

export default function TimerFullscreenScreen() {
  const insets = useSafeAreaInsets();
  const { currentGoal } = useGoalStore();
  const timerStore = useTimer();

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const panelSlideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [selectedMinutes, setSelectedMinutes] = useState<number>(25);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(25);
  const [showTimeSelector, setShowTimeSelector] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showCompletionModal, setShowCompletionModal] = useState<boolean>(false);

  const isRunning = timerStore?.isRunning ?? false;
  const isPaused = timerStore?.isPaused ?? false;
  const currentTime = timerStore?.currentTime ?? 1500;
  const totalTime = timerStore?.totalTime ?? 1500;
  const mode = timerStore?.mode ?? 'focus';
  const startTimer = timerStore?.startTimer;
  const pauseTimer = timerStore?.pauseTimer;
  const resumeTimer = timerStore?.resumeTimer;
  const stopTimer = timerStore?.stopTimer;
  const setCustomDuration = timerStore?.setCustomDuration;

  const minuteOptions = useMemo(() => {
    return Array.from({ length: 120 }, (_, i) => i + 1);
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 30,
        friction: 7,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, fadeAnim]);

  useEffect(() => {
    if (timerStore) {
      const progress = totalTime > 0 ? 1 - currentTime / totalTime : 0;
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [currentTime, totalTime, progressAnim, timerStore]);

  useEffect(() => {
    if (timerStore && isRunning && !isPaused) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.03,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRunning, isPaused, pulseAnim, timerStore]);

  useEffect(() => {
    if (timerStore && currentTime === 0 && !isRunning) {
      setShowCompletionModal(true);
    }
  }, [currentTime, isRunning, timerStore]);

  useEffect(() => {
    if (!isRunning && setCustomDuration) {
      setCustomDuration(selectedMinutes * 60);
    }
  }, [selectedMinutes, isRunning, setCustomDuration]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      router.back();
    });
  };

  const handleStart = async () => {
    if (startTimer) {
      await startTimer(currentGoal?.id);
    }
  };

  const handlePause = async () => {
    if (pauseTimer) {
      await pauseTimer();
    }
  };

  const handleResume = async () => {
    if (resumeTimer) {
      await resumeTimer();
    }
  };

  const handleReset = async () => {
    Alert.alert(
      'Сбросить таймер?',
      'Текущий прогресс будет потерян',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Сбросить',
          style: 'destructive',
          onPress: async () => {
            if (stopTimer) {
              await stopTimer();
            }
          },
        },
      ]
    );
  };

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

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = totalTime > 0 ? 1 - currentTime / totalTime : 0;

  if (!timerStore) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Загрузка...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar hidden />
      
      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.background} />

        <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity style={styles.iconButton} onPress={handleClose}>
            <X size={24} color={theme.colors.text} />
          </TouchableOpacity>
          
          <Text style={styles.modeLabel}>{SESSION_LABELS[mode]}</Text>
          
          <TouchableOpacity style={styles.iconButton} onPress={() => setShowSettings(true)}>
            <Settings size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <TouchableOpacity
            onPress={openTimeSelector}
            disabled={isRunning}
            activeOpacity={0.9}
            style={styles.timerWrapper}
          >
            <Animated.View
              style={[
                styles.timerContainer,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <View style={[styles.timerCircle, { width: TIMER_SIZE, height: TIMER_SIZE }]}>
                <View
                  style={[
                    styles.circleBackground,
                    { width: TIMER_SIZE, height: TIMER_SIZE, borderRadius: TIMER_SIZE / 2 },
                  ]}
                />

                <View style={styles.progressContainer}>
                  {Platform.OS !== 'web' ? (
                    <Svg width={TIMER_SIZE} height={TIMER_SIZE} style={styles.progressSvg}>
                      <Circle
                        cx={TIMER_SIZE / 2}
                        cy={TIMER_SIZE / 2}
                        r={RADIUS}
                        stroke={theme.colors.glassBorder}
                        strokeWidth={STROKE_WIDTH}
                        fill="none"
                        opacity={0.3}
                      />
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
                      <View
                        style={[
                          styles.progressRingWeb,
                          {
                            width: TIMER_SIZE - STROKE_WIDTH * 2,
                            height: TIMER_SIZE - STROKE_WIDTH * 2,
                            borderRadius: (TIMER_SIZE - STROKE_WIDTH * 2) / 2,
                            borderWidth: STROKE_WIDTH,
                            borderColor: theme.colors.glassBorder + '4D',
                          },
                        ]}
                      />
                      <View
                        style={[
                          styles.progressRingWeb,
                          {
                            width: TIMER_SIZE - STROKE_WIDTH * 2,
                            height: TIMER_SIZE - STROKE_WIDTH * 2,
                            borderRadius: (TIMER_SIZE - STROKE_WIDTH * 2) / 2,
                            borderWidth: STROKE_WIDTH,
                            borderColor: 'transparent',
                            borderTopColor: theme.colors.primary,
                            transform: [{ rotate: '-90deg' }, { rotate: `${progress * 360}deg` }],
                          },
                        ]}
                      />
                    </>
                  )}
                </View>

                <View style={styles.timerContent}>
                  <Text style={styles.timerText}>{formatTime(currentTime)}</Text>
                  <Text style={styles.timerStatus}>
                    {isRunning && !isPaused
                      ? 'Идёт фокус'
                      : isPaused
                      ? 'На паузе'
                      : currentTime === 0
                      ? 'Завершено!'
                      : 'Нажми на таймер'}
                  </Text>
                </View>
              </View>
            </Animated.View>
          </TouchableOpacity>

          <View style={styles.controls}>
            {!isRunning ? (
              <Pressable
                style={({ pressed }) => [styles.startButton, pressed && styles.startButtonPressed]}
                onPress={handleStart}
              >
                <Play size={28} color="#111214" fill="#111214" strokeWidth={2.5} />
                <Text style={styles.startButtonText}>Старт</Text>
              </Pressable>
            ) : (
              <View style={styles.controlRow}>
                <Pressable
                  style={({ pressed }) => [styles.controlButton, pressed && styles.controlButtonPressed]}
                  onPress={isPaused ? handleResume : handlePause}
                >
                  {isPaused ? (
                    <Play size={28} color={theme.colors.primary} fill={theme.colors.primary} />
                  ) : (
                    <Pause size={28} color={theme.colors.primary} fill={theme.colors.primary} />
                  )}
                </Pressable>

                <Pressable
                  style={({ pressed }) => [styles.resetButton, pressed && styles.resetButtonPressed]}
                  onPress={handleReset}
                >
                  <RotateCcw size={24} color="#FF4D4D" />
                </Pressable>
              </View>
            )}
          </View>

          {!isRunning && (
            <Pressable style={styles.setTimeButton} onPress={openTimeSelector}>
              <Text style={styles.setTimeText}>Установить время</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.breathingSection}>
          <Text style={styles.breathingTitle}>Быстрые действия</Text>
          <TouchableOpacity
            style={styles.breathingButton}
            onPress={() => router.push('/breathing')}
          >
            <Wind size={20} color={theme.colors.primary} />
            <Text style={styles.breathingText}>Дыхательные техники</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Modal visible={showTimeSelector} transparent animationType="none" onRequestClose={closeTimeSelector}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeTimeSelector}>
          <Animated.View
            style={[
              styles.timeSelectorPanel,
              {
                opacity: panelSlideAnim,
                transform: [
                  {
                    translateY: panelSlideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [400, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity activeOpacity={1}>
              <View style={styles.panelHandle} />

              <View style={styles.panelContent}>
                <View style={styles.panelHeader}>
                  <Text style={styles.panelTitle}>Выберите время</Text>
                  <TouchableOpacity onPress={closeTimeSelector} style={styles.closeButton}>
                    <X size={20} color="#AFAFAF" />
                  </TouchableOpacity>
                </View>

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
                      <Text
                        style={[
                          styles.presetButtonText,
                          selectedPreset === minutes && styles.presetButtonTextActive,
                        ]}
                      >
                        {minutes}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

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
                          <Text
                            style={[
                              styles.webPickerText,
                              selectedMinutes === min && styles.webPickerTextActive,
                            ]}
                          >
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
                        <Picker.Item key={min} label={`${min}`} value={min} />
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

      <Modal
        visible={showCompletionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCompletionModal(false)}
      >
        <View style={styles.completionOverlay}>
          <View style={styles.completionCard}>
            <Text style={styles.completionTitle}>🎯 Завершено!</Text>
            <Text style={styles.completionMessage}>
              {mode === 'focus' ? 'Отличная работа! Время для перерыва.' : 'Перерыв окончен. Готовы продолжить?'}
            </Text>
            <TouchableOpacity
              style={styles.completionButton}
              onPress={() => setShowCompletionModal(false)}
            >
              <Text style={styles.completionButtonText}>Понятно</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showSettings}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.settingsOverlay}>
          <View style={styles.settingsCard}>
            <View style={styles.settingsHeader}>
              <Text style={styles.settingsTitle}>Настройки</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.settingsMessage}>Настройки находятся на вкладке Фокус</Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.text,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  modeLabel: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.extrabold as any,
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  timerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  circleBackground: {
    position: 'absolute',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    ...theme.shadows.medium,
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
    fontSize: 48,
    fontWeight: theme.fontWeight.extrabold as any,
    color: theme.colors.text,
    marginBottom: 8,
    letterSpacing: -2,
  },
  timerStatus: {
    fontSize: 15,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.medium as any,
  },
  controls: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 40,
    height: 64,
    borderRadius: 32,
    gap: 16,
    minWidth: 220,
    ...theme.shadows.gold,
  },
  startButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  startButtonText: {
    fontSize: 22,
    fontWeight: theme.fontWeight.bold as any,
    color: '#111214',
    letterSpacing: 0.3,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 209, 42, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 209, 42, 0.3)',
  },
  controlButtonPressed: {
    transform: [{ scale: 0.95 }],
    backgroundColor: 'rgba(255, 209, 42, 0.25)',
  },
  resetButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 77, 0.2)',
  },
  resetButtonPressed: {
    transform: [{ scale: 0.95 }],
    backgroundColor: 'rgba(255, 77, 77, 0.1)',
  },
  setTimeButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  setTimeText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.text,
  },
  breathingSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  breathingTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  breathingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    gap: 8,
  },
  breathingText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium as any,
    color: theme.colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  timeSelectorPanel: {
    backgroundColor: '#0E0E0E',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 40,
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: 'rgba(255, 212, 59, 0.15)',
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
    fontSize: 20,
    fontWeight: theme.fontWeight.bold as any,
    color: '#AFAFAF',
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
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#1A1A1A',
    borderWidth: 1.5,
    borderColor: '#2A2A2A',
    alignItems: 'center',
  },
  presetButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    ...theme.shadows.gold,
  },
  presetButtonText: {
    fontSize: 16,
    fontWeight: theme.fontWeight.semibold as any,
    color: '#888888',
  },
  presetButtonTextActive: {
    color: '#000000',
    fontWeight: theme.fontWeight.bold as any,
  },
  pickerContainer: {
    alignItems: 'center',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  picker: {
    width: '85%',
    height: 120,
  },
  pickerItem: {
    fontSize: 24,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.primary,
    height: 120,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: theme.fontWeight.medium as any,
    color: '#777777',
    marginTop: 8,
  },
  webPickerScroll: {
    maxHeight: 120,
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
    fontWeight: theme.fontWeight.medium as any,
    color: '#666666',
  },
  webPickerTextActive: {
    fontSize: 26,
    fontWeight: theme.fontWeight.bold as any,
    color: theme.colors.primary,
  },
  completionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  completionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    ...theme.shadows.premium,
    width: '90%',
    maxWidth: 400,
  },
  completionTitle: {
    fontSize: 32,
    fontWeight: theme.fontWeight.extrabold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  completionMessage: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 24,
  },
  completionButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.gold,
  },
  completionButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold as any,
    color: '#111214',
  },
  settingsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  settingsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    width: '90%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  settingsTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.extrabold as any,
    color: theme.colors.text,
  },
  settingsMessage: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
});
