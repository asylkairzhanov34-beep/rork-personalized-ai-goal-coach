import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Play, Pause, Square, ArrowLeft } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { theme } from '@/constants/theme';
import { useBreathingTimer } from '@/hooks/use-breathing-timer';
import { BreathingTechnique } from '@/types/breathing';
import { router } from 'expo-router';

const { width: screenWidth } = Dimensions.get('window');
const TIMER_SIZE = Math.min(screenWidth * 0.6, 240);
const STROKE_WIDTH = 4;
const RADIUS = (TIMER_SIZE / 2) - STROKE_WIDTH;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface BreathingTimerProps {
  technique: BreathingTechnique;
}

export function BreathingTimer({ technique }: BreathingTimerProps) {
  const {
    isActive,
    isPaused,
    currentCycle,
    currentPhase,
    phaseTimeLeft,
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    getProgress,
    getOverallProgress
  } = useBreathingTimer();

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Breathing animation
  useEffect(() => {
    if (isActive && !isPaused && currentPhase) {
      const isInhale = currentPhase.type === 'inhale';
      const isExhale = currentPhase.type === 'exhale';
      
      if (isInhale || isExhale) {
        const targetScale = isInhale ? 1.15 : 0.9;
        const duration = phaseTimeLeft * 1000;
        
        Animated.timing(pulseAnim, {
          toValue: targetScale,
          duration: duration,
          useNativeDriver: true,
        }).start();
      } else {
        pulseAnim.stopAnimation();
      }
    } else {
      pulseAnim.setValue(1);
    }
  }, [isActive, isPaused, currentPhase, phaseTimeLeft, pulseAnim]);

  const handleStart = () => {
    if (!isActive) {
      startSession(technique);
    } else if (isPaused) {
      resumeSession();
    } else {
      pauseSession();
    }
  };

  const handleStop = () => {
    stopSession();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/home');
    }
  };

  const progress = getProgress();
  const overallProgress = getOverallProgress();
  const techniqueColor = technique.color || theme.colors.primary;

  const getPhaseColor = () => {
    if (!currentPhase) return techniqueColor;
    
    switch (currentPhase.type) {
      case 'inhale': return '#10B981';
      case 'exhale': return '#F59E0B';
      case 'hold': return '#8B5CF6';
      case 'pause': return '#6B7280';
      default: return techniqueColor;
    }
  };

  const formatTime = (seconds: number): string => {
    return seconds.toString();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)/home');
          }
        }}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{technique.name}</Text>
          <Text style={styles.subtitle}>
            Цикл {currentCycle + 1} из {technique.totalCycles}
          </Text>
        </View>
      </View>

      {/* Main Timer Circle */}
      <View style={styles.timerSection}>
        <Animated.View style={[
          styles.timerContainer,
          {
            transform: [
              { scale: scaleAnim },
              { scale: pulseAnim }
            ]
          }
        ]}>
          <View style={[styles.timerCircle, { width: TIMER_SIZE, height: TIMER_SIZE }]}>
            {/* Background Circle */}
            <View style={[
              styles.circleBackground,
              {
                width: TIMER_SIZE,
                height: TIMER_SIZE,
                backgroundColor: getPhaseColor() + '10'
              }
            ]} />
            
            {/* Progress Ring */}
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
                    stroke={getPhaseColor()}
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
                  <View style={[
                    styles.progressRingWeb,
                    {
                      width: TIMER_SIZE - STROKE_WIDTH * 2,
                      height: TIMER_SIZE - STROKE_WIDTH * 2,
                      borderRadius: (TIMER_SIZE - STROKE_WIDTH * 2) / 2,
                      borderWidth: STROKE_WIDTH,
                      borderColor: theme.colors.glassBorder + '4D',
                    }
                  ]} />
                  <View style={[
                    styles.progressRingWeb,
                    {
                      width: TIMER_SIZE - STROKE_WIDTH * 2,
                      height: TIMER_SIZE - STROKE_WIDTH * 2,
                      borderRadius: (TIMER_SIZE - STROKE_WIDTH * 2) / 2,
                      borderWidth: STROKE_WIDTH,
                      borderColor: 'transparent',
                      borderTopColor: getPhaseColor(),
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
              <Text style={[styles.timerText, { color: getPhaseColor() }]}>
                {formatTime(phaseTimeLeft)}
              </Text>
              <Text style={styles.phaseText}>
                {currentPhase?.name || 'Готов'}
              </Text>
              <Text style={styles.instructionText}>
                {currentPhase?.instruction || 'Нажми старт'}
              </Text>
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Overall Progress */}
      <View style={styles.overallProgress}>
        <Text style={styles.progressLabel}>Общий прогресс</Text>
        <View style={styles.progressBar}>
          <View style={[
            styles.progressFill,
            {
              width: `${overallProgress * 100}%`,
              backgroundColor: techniqueColor
            }
          ]} />
        </View>
        <Text style={styles.progressText}>
          {Math.round(overallProgress * 100)}%
        </Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            { backgroundColor: getPhaseColor() }
          ]}
          onPress={handleStart}
        >
          {!isActive ? (
            <Play size={24} color={theme.colors.background} />
          ) : isPaused ? (
            <Play size={24} color={theme.colors.background} />
          ) : (
            <Pause size={24} color={theme.colors.background} />
          )}
          <Text style={styles.primaryButtonText}>
            {!isActive ? 'Старт' : isPaused ? 'Продолжить' : 'Пауза'}
          </Text>
        </TouchableOpacity>
        
        {isActive && (
          <TouchableOpacity style={styles.secondaryButton} onPress={handleStop}>
            <Square size={20} color={theme.colors.textSecondary} />
            <Text style={styles.secondaryButtonText}>Стоп</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Technique Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>О технике</Text>
        <Text style={styles.infoDescription}>{technique.description}</Text>
        <Text style={styles.infoBenefits}>{technique.benefits}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    marginRight: theme.spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold as any,
    color: theme.colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  timerSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
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
    borderRadius: TIMER_SIZE / 2,
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
    fontSize: 40,
    fontWeight: theme.fontWeight.extrabold as any,
    marginBottom: 6,
    letterSpacing: -1.5,
  },
  phaseText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.text,
    marginBottom: 2,
  },
  instructionText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    maxWidth: 200,
  },
  overallProgress: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  progressLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xs,
    overflow: 'hidden',
    marginBottom: theme.spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: theme.borderRadius.xs,
  },
  progressText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium as any,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    gap: 8,
    ...theme.shadows.medium,
    minWidth: 120,
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold as any,
    color: theme.colors.background,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    gap: 6,
  },
  secondaryButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium as any,
    color: theme.colors.textSecondary,
  },
  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    ...theme.shadows.subtle,
    marginBottom: theme.spacing.lg,
  },
  infoTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  infoDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  infoBenefits: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    lineHeight: 20,
    fontStyle: 'italic',
  },
});