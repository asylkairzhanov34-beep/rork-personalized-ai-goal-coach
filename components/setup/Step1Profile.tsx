import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { User } from 'lucide-react-native';
import { theme } from '@/constants/theme';

interface Step1ProfileProps {
  onNext: (data: { nickname: string; birthdate: Date }) => void;
  initialData?: { nickname: string; birthdate?: Date };
}

export default function Step1Profile({ onNext, initialData }: Step1ProfileProps) {
  const [nickname, setNickname] = useState<string>(initialData?.nickname || '');
  const [birthdate, setBirthdate] = useState<Date>(initialData?.birthdate || new Date(2000, 0, 1));
  const [nicknameError, setNicknameError] = useState<string>('');
  const [fadeAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const validateNickname = (text: string): boolean => {
    if (text.length < 2) {
      setNicknameError('Минимум 2 символа');
      return false;
    }
    if (text.length > 20) {
      setNicknameError('Максимум 20 символов');
      return false;
    }
    setNicknameError('');
    return true;
  };

  const handleNicknameChange = (text: string) => {
    setNickname(text);
    if (text.length > 0) {
      validateNickname(text);
    } else {
      setNicknameError('');
    }
  };

  const calculateAge = (date: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
      age--;
    }
    return age;
  };

  const handleNext = () => {
    if (!validateNickname(nickname)) {
      return;
    }

    const age = calculateAge(birthdate);
    if (age < 13) {
      setNicknameError('Требуется возраст 13+');
      return;
    }

    onNext({ nickname, birthdate });
  };

  const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);
  const months = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Привет! 👋</Text>
            <Text style={styles.subtitle}>Как к тебе обращаться?</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <User size={48} color={theme.colors.primary} strokeWidth={1.5} />
              </View>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.label}>Никнейм</Text>
              <TextInput
                style={[
                  styles.input,
                  nicknameError ? styles.inputError : {},
                  nickname.length > 0 && !nicknameError ? styles.inputSuccess : {}
                ]}
                value={nickname}
                onChangeText={handleNicknameChange}
                placeholder="Введи своё имя"
                placeholderTextColor={theme.colors.textLight}
                maxLength={20}
                autoCapitalize="words"
                autoCorrect={false}
              />
              {nicknameError ? (
                <Text style={styles.errorText}>{nicknameError}</Text>
              ) : null}
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.label}>Дата рождения</Text>
              <View style={styles.datePickerRow}>
                {Platform.OS === 'web' ? (
                  <>
                    <View style={styles.datePickerItem}>
                      <Text style={styles.datePickerLabel}>День</Text>
                      <ScrollView 
                        style={styles.dateScroll}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.dateScrollContent}
                      >
                        {days.map(day => (
                          <TouchableOpacity
                            key={day}
                            style={[
                              styles.dateOption,
                              birthdate.getDate() === day && styles.dateOptionActive
                            ]}
                            onPress={() => setBirthdate(new Date(birthdate.getFullYear(), birthdate.getMonth(), day))}
                          >
                            <Text style={[
                              styles.dateOptionText,
                              birthdate.getDate() === day && styles.dateOptionTextActive
                            ]}>
                              {day}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>

                    <View style={styles.datePickerItem}>
                      <Text style={styles.datePickerLabel}>Месяц</Text>
                      <ScrollView 
                        style={styles.dateScroll}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.dateScrollContent}
                      >
                        {months.map((month, idx) => (
                          <TouchableOpacity
                            key={month}
                            style={[
                              styles.dateOption,
                              birthdate.getMonth() === idx && styles.dateOptionActive
                            ]}
                            onPress={() => setBirthdate(new Date(birthdate.getFullYear(), idx, birthdate.getDate()))}
                          >
                            <Text style={[
                              styles.dateOptionText,
                              birthdate.getMonth() === idx && styles.dateOptionTextActive
                            ]}>
                              {month}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>

                    <View style={styles.datePickerItem}>
                      <Text style={styles.datePickerLabel}>Год</Text>
                      <ScrollView 
                        style={styles.dateScroll}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.dateScrollContent}
                      >
                        {years.map(year => (
                          <TouchableOpacity
                            key={year}
                            style={[
                              styles.dateOption,
                              birthdate.getFullYear() === year && styles.dateOptionActive
                            ]}
                            onPress={() => setBirthdate(new Date(year, birthdate.getMonth(), birthdate.getDate()))}
                          >
                            <Text style={[
                              styles.dateOptionText,
                              birthdate.getFullYear() === year && styles.dateOptionTextActive
                            ]}>
                              {year}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.pickerWrapper}>
                      <Picker
                        selectedValue={birthdate.getDate()}
                        onValueChange={(day) => setBirthdate(new Date(birthdate.getFullYear(), birthdate.getMonth(), day))}
                        style={styles.picker}
                        itemStyle={styles.pickerItem}
                      >
                        {days.map(day => (
                          <Picker.Item key={day} label={day.toString()} value={day} />
                        ))}
                      </Picker>
                      <Text style={styles.pickerUnit}>день</Text>
                    </View>

                    <View style={styles.pickerWrapper}>
                      <Picker
                        selectedValue={birthdate.getMonth()}
                        onValueChange={(month) => setBirthdate(new Date(birthdate.getFullYear(), month, birthdate.getDate()))}
                        style={styles.picker}
                        itemStyle={styles.pickerItem}
                      >
                        {months.map((month, idx) => (
                          <Picker.Item key={idx} label={month} value={idx} />
                        ))}
                      </Picker>
                      <Text style={styles.pickerUnit}>месяц</Text>
                    </View>

                    <View style={styles.pickerWrapper}>
                      <Picker
                        selectedValue={birthdate.getFullYear()}
                        onValueChange={(year) => setBirthdate(new Date(year, birthdate.getMonth(), birthdate.getDate()))}
                        style={styles.picker}
                        itemStyle={styles.pickerItem}
                      >
                        {years.map(year => (
                          <Picker.Item key={year} label={year.toString()} value={year} />
                        ))}
                      </Picker>
                      <Text style={styles.pickerUnit}>год</Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              (!nickname || nicknameError) && styles.buttonDisabled
            ]}
            onPress={handleNext}
            disabled={!nickname || !!nicknameError}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Продолжить</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
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
  card: {
    backgroundColor: '#0F1213',
    borderRadius: 24,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.06)',
    ...theme.shadows.medium,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.gold,
  },
  inputSection: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    fontWeight: theme.fontWeight.medium,
  },
  input: {
    height: 52,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingHorizontal: theme.spacing.md,
    fontSize: theme.fontSize.lg,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  inputSuccess: {
    borderColor: theme.colors.primary,
  },
  errorText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  },
  datePickerRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: 180,
    justifyContent: 'space-between',
  },
  datePickerItem: {
    flex: 1,
    minWidth: 0,
  },
  datePickerLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textLight,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  dateScroll: {
    height: 140,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dateScrollContent: {
    paddingVertical: theme.spacing.sm,
  },
  dateOption: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    alignItems: 'center',
  },
  dateOptionActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
  },
  dateOptionText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  dateOptionTextActive: {
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
  },
  pickerWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  picker: {
    width: 120,
    height: 180,
  },
  pickerItem: {
    fontSize: 18,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary,
    height: 180,
  },
  pickerUnit: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: -20,
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
});
