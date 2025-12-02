import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Sunrise, Sun, Moon } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { ProductivityTimeOption } from '@/types/first-time-setup';

interface Step3BiorhythmProps {
  onNext: (time: 'morning' | 'afternoon' | 'evening') => void;
  onSkip: () => void;
  initialTime?: 'morning' | 'afternoon' | 'evening';
}

export default function Step3Biorhythm({ onNext, onSkip, initialTime }: Step3BiorhythmProps) {
  const [selectedTime, setSelectedTime] = useState<'morning' | 'afternoon' | 'evening' | null>(
    initialTime || null
  );
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(1));

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const times: ProductivityTimeOption[] = [
    {
      id: 'morning',
      icon: 'sunrise',
      title: 'Утро',
      time: '6:00 - 12:00',
    },
    {
      id: 'afternoon',
      icon: 'sun',
      title: 'День',
      time: '12:00 - 18:00',
    },
    {
      id: 'evening',
      icon: 'moon',
      title: 'Вечер',
      time: '18:00 - 00:00',
    },
  ];

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'sunrise':
        return Sunrise;
      case 'sun':
        return Sun;
      case 'moon':
        return Moon;
      default:
        return Sun;
    }
  };

  const handleSelect = (timeId: 'morning' | 'afternoon' | 'evening') => {
    setSelectedTime(timeId);
    
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.05,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleNext = () => {
    if (selectedTime) {
      onNext(selectedTime);
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Когда у тебя пик энергии?</Text>
          <Text style={styles.subtitle}>Настроим уведомления под твой ритм</Text>
        </View>

        <View style={styles.timesContainer}>
          {times.map((time, index) => {
            const IconComponent = getIcon(time.icon);
            const isSelected = selectedTime === time.id;
            
            return (
              <TouchableOpacity
                key={time.id}
                style={[
                  styles.timeCard,
                  isSelected && styles.timeCardActive,
                ]}
                onPress={() => handleSelect(time.id)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.iconContainer,
                  isSelected && styles.iconContainerActive
                ]}>
                  <IconComponent 
                    size={28} 
                    color={isSelected ? theme.colors.background : theme.colors.primary}
                    strokeWidth={2}
                  />
                </View>
                <View style={styles.timeTextContainer}>
                  <Text style={[
                    styles.timeTitle,
                    isSelected && styles.timeTitleActive
                  ]}>
                    {time.title}
                  </Text>
                  <Text style={styles.timeRange}>
                    {time.time}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            !selectedTime && styles.buttonDisabled
          ]}
          onPress={handleNext}
          disabled={!selectedTime}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Продолжить</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={onSkip}
          activeOpacity={0.7}
        >
          <Text style={styles.skipButtonText}>Пропустить</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xxxl,
    paddingBottom: theme.spacing.xl,
  },
  content: {
    flex: 1,
  },
  header: {
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.regular,
  },
  timesContainer: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  timeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1213',
    borderRadius: 20,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.1)',
    minHeight: 80,
  },
  timeCardActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderColor: theme.colors.primary,
    ...theme.shadows.gold,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  iconContainerActive: {
    backgroundColor: theme.colors.primary,
  },
  timeTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: 4,
  },
  timeTitleActive: {
    color: theme.colors.primary,
  },
  timeRange: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
  },
  button: {
    marginTop: theme.spacing.xl,
    height: 56,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.gold,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.background,
  },
  skipButton: {
    marginTop: theme.spacing.md,
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  skipButtonText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textLight,
    fontWeight: theme.fontWeight.medium,
  },
  timeTextContainer: {
    flex: 1,
  },
});
