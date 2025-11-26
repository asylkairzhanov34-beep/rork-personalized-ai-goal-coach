import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
  FlatList,
  Keyboard,
  Animated,
  Easing,
  AccessibilityInfo
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { X, MessageCircle, Bot, Send, Sparkles } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { Button } from '@/components/Button';
import { useGoalStore } from '@/hooks/use-goal-store';
import { Goal, DailyTask } from '@/types/goal';

const questions = [
  "Какую конкретную цель вы хотите достичь?",
  "Почему эта цель важна для вас?",
  "Какие препятствия вы можете встретить?",
  "Какие ресурсы или поддержка у вас есть?",
  "Сколько времени в день вы можете уделять?",
  "Как бы выглядел успех для вас?",
];

const examples = [
  "Например: Выучить английский до уровня B2, пробежать марафон, запустить свой бизнес",
  "Например: Для карьерного роста, чтобы путешествовать без языкового барьера, для личного развития",
  "Например: Нехватка времени, отсутствие мотивации, финансовые ограничения, страх неудачи",
  "Например: Онлайн-курсы, друзья-носители языка, спортзал рядом с домом, накопления",
  "Например: 30 минут утром, 1 час вечером, выходные по 2 часа",
  "Например: Свободно общаюсь на английском, пробежал 42 км без остановки, получаю первую прибыль",
];

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function GoalCreationModal() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<string[]>(Array(questions.length).fill(''));
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  const { createGoal } = useGoalStore();
  const insets = useSafeAreaInsets();
  
  // Animation refs
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const inputRef = useRef<TextInput>(null);
  const [inputHeight, setInputHeight] = useState(48);

  const animateTransition = (callback: () => void) => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: -10,
        duration: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback();
      translateYAnim.setValue(10);
      
      // Small delay to ensure state updates
      setTimeout(() => {
         Animated.parallel([
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
          }),
          Animated.spring(translateYAnim, {
            toValue: 0,
            friction: 7,
            tension: 40,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (inputRef.current) {
            // Optional: refocus or keep focus
            // inputRef.current.focus();
          }
           AccessibilityInfo.announceForAccessibility(`Вопрос ${currentQuestion + 1}: ${questions[currentQuestion]}`);
        });
      }, 50);
    });
  };

  const handleNext = () => {
    if (currentAnswer.trim()) {
      // Button press animation
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 0.96, duration: 60, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1.0, duration: 60, useNativeDriver: true }),
      ]).start();

      const nextAction = () => {
        const newAnswers = [...answers];
        newAnswers[currentQuestion] = currentAnswer;
        setAnswers(newAnswers);
        
        if (currentQuestion < questions.length - 1) {
          setCurrentQuestion(currentQuestion + 1);
          setCurrentAnswer(answers[currentQuestion + 1] || '');
        } else {
          generatePlan(newAnswers);
        }
      };

      if (currentQuestion < questions.length - 1) {
        animateTransition(nextAction);
      } else {
        nextAction();
      }
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      animateTransition(() => {
        setCurrentQuestion(currentQuestion - 1);
        setCurrentAnswer(answers[currentQuestion - 1]);
      });
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput.trim(),
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const conversationHistory = [...chatMessages, userMessage]
        .map(msg => ({ role: msg.role, content: msg.content }))
        .slice(-10); // Keep last 10 messages for context

      const systemPrompt = `Ты - эксперт-коуч по достижению целей. Помогаешь пользователю сформулировать четкую, достижимую цель. 

Твоя задача:
1. Задавать уточняющие вопросы о цели
2. Помочь сделать цель более конкретной и измеримой
3. Выяснить мотивацию и препятствия
4. В конце предложить четко сформулированную цель

Отвечай дружелюбно, по-русски, задавай один вопрос за раз. Будь кратким но полезным.`;

      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            ...conversationHistory
          ]
        })
      });

      const data = await response.json();
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.completion,
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Извините, произошла ошибка. Попробуйте еще раз.',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const startAIChat = () => {
    setShowAIChat(true);
    if (chatMessages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: '0',
        role: 'assistant',
        content: 'Привет! 👋 Расскажи подробнее о своей цели. Что именно ты хочешь достичь и почему это важно для тебя?',
        timestamp: new Date()
      };
      setChatMessages([welcomeMessage]);
    }
  };

  const applyAISuggestion = () => {
    // Find the last assistant message that looks like a goal suggestion
    const lastAssistantMessage = [...chatMessages]
      .reverse()
      .find(msg => msg.role === 'assistant' && msg.content.length > 50);
    
    if (lastAssistantMessage) {
      setCurrentAnswer(lastAssistantMessage.content);
      setShowAIChat(false);
    }
  };

  const generatePlan = async (finalAnswers: string[]) => {
    setIsGenerating(true);
    
    try {
      const prompt = `
        Создай детальный план достижения цели на русском языке:
        Цель: ${finalAnswers[0]}
        Мотивация: ${finalAnswers[1]}
        Препятствия: ${finalAnswers[2]}
        Ресурсы: ${finalAnswers[3]}
        Время в день: ${finalAnswers[4]}
        Критерии успеха: ${finalAnswers[5]}
        
        Создай JSON с:
        1. Объект goal с полями: title, description, category, motivation
        2. Массив tasks с 15-20 разнообразными задачами для достижения цели
        
        Каждая задача должна содержать:
        - title: конкретное название задачи
        - description: подробное описание (2-3 предложения)
        - duration: время выполнения (например "30 минут")
        - priority: приоритет (high/medium/low)
        - difficulty: сложность (easy/medium/hard)
        - estimatedTime: время в минутах (число)
        - tips: массив из 3-4 практических советов
        - subtasks: массив подзадач (по 3-5 на задачу), каждая с полями title, estimatedTime, completed: false
        
        ВАЖНО! Подзадачи должны быть МАКСИМАЛЬНО КОНКРЕТНЫМИ и ДЕТАЛЬНЫМИ:
        - Для физических упражнений: указывай КОНКРЕТНЫЕ упражнения с ТОЧНЫМ количеством повторений/подходов/времени
          Примеры: "Отжимания - 3 подхода по 15 раз", "Планка - 3 подхода по 45 секунд", "Приседания - 4 подхода по 20 раз"
        - Для изучения языка: указывай КОНКРЕТНЫЕ слова, темы, правила
          Примеры: "Выучить слова: apple, banana, orange, grape, watermelon (5 слов)", "Изучить правило Past Simple с 10 примерами"
        - Для обучения: указывай КОНКРЕТНЫЕ темы, страницы, упражнения
          Примеры: "Прочитать главу 3, стр. 45-67 (22 страницы)", "Решить задачи №15-25 из учебника"
        - Для планирования: указывай КОНКРЕТНЫЕ пункты плана
          Примеры: "Составить список из 10 подцелей", "Записать 5 ежедневных привычек"
        
        Подзадачи НЕ должны быть общими типа "Силовые упражнения" или "Выучить новые слова".
        Каждая подзадача = конкретное действие с числовыми показателями.
        
        Задачи должны быть:
        - Разнообразными (теория, практика, планирование, анализ, развитие навыков)
        - Прогрессивными (от простых к сложным)
        - Практичными и выполнимыми
        - Направленными на формирование привычек
        - Адаптированными под указанное время
        
        Включи задачи разных типов:
        - Изучение теории
        - Практические упражнения
        - Планирование и анализ
        - Развитие навыков
        - Отслеживание прогресса
        - Работа с мотивацией
        - Преодоление препятствий
        
        Формат: { "goal": {...}, "tasks": [...] }
      `;

      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'Ты эксперт-коуч по достижению целей. Создаешь ОЧЕНЬ ДЕТАЛЬНЫЕ, практичные планы. В подзадачах ВСЕГДА указывай конкретные действия с числами (количество повторений, конкретные упражнения, конкретные слова для изучения). НЕ используй общие формулировки. Отвечай только валидным JSON без дополнительного текста. Все тексты на русском языке.' },
            { role: 'user', content: prompt }
          ]
        })
      });

      const data = await response.json();
      console.log('Raw AI response:', data.completion);
      
      // Extract JSON from the response
      let jsonString = data.completion.trim();
      
      // Remove markdown code blocks if present
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.replace(/```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Find JSON object boundaries
      const startIndex = jsonString.indexOf('{');
      const lastIndex = jsonString.lastIndexOf('}');
      
      if (startIndex === -1 || lastIndex === -1) {
        throw new Error('No valid JSON found in response');
      }
      
      jsonString = jsonString.substring(startIndex, lastIndex + 1);
      console.log('Extracted JSON:', jsonString);
      
      const planData = JSON.parse(jsonString);
      console.log('Parsed plan data:', planData);
      
      // Validate the structure
      if (!planData.goal || !planData.tasks || !Array.isArray(planData.tasks)) {
        throw new Error('Invalid plan structure received from AI');
      }
      
      const startDate = new Date();

      const goal: Omit<Goal, 'id' | 'createdAt' | 'isActive' | 'completedTasksCount' | 'totalTasksCount'> = {
        title: planData.goal?.title || finalAnswers[0],
        description: planData.goal?.description || `Персональный план для достижения: ${finalAnswers[0]}`,
        category: planData.goal?.category || 'Личное развитие',
        motivation: planData.goal?.motivation || finalAnswers[1],
        obstacles: [finalAnswers[2]],
        resources: [finalAnswers[3]],
        startDate: startDate.toISOString(),
        planType: 'free', // Устанавливаем тип плана как свободный
        // endDate не устанавливаем для свободного плана
      };

      const tasks: Omit<DailyTask, 'id' | 'goalId' | 'completed' | 'completedAt'>[] = planData.tasks.map((task: any, index: number) => {
        const taskDate = new Date();
        taskDate.setDate(taskDate.getDate() + index);
        
        // Обработка подзадач
        const subtasks = Array.isArray(task?.subtasks) ? task.subtasks.map((st: any, stIndex: number) => ({
          id: `subtask_${Date.now()}_${index}_${stIndex}`,
          title: st?.title || `Подзадача ${stIndex + 1}`,
          completed: false,
          estimatedTime: st?.estimatedTime || 10,
        })) : undefined;
        
        return {
          day: index + 1,
          date: taskDate.toISOString(),
          title: task?.title || `Задача ${index + 1}`,
          description: task?.description || 'Работайте над своей целью сегодня',
          duration: task?.duration || finalAnswers[4] || '30 минут',
          priority: (task?.priority as 'high' | 'medium' | 'low') || 'medium',
          tips: Array.isArray(task?.tips) ? task.tips : ['Сохраняйте фокус', 'Делайте перерывы при необходимости'],
          difficulty: (task?.difficulty as 'easy' | 'medium' | 'hard') || 'medium',
          estimatedTime: task?.estimatedTime || 30,
          subtasks,
        };
      });

      await createGoal(goal, tasks);
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/home');
      }
    } catch (error) {
      console.error('Error generating plan:', error);
      console.error('Failed to create goal plan');
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: ((currentQuestion + 1) / questions.length) * 100,
      duration: 240,
      useNativeDriver: false,
    }).start();
  }, [currentQuestion, progressAnim]);

  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        setKeyboardHeight(event.endCoordinates.height);
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
          keyboardVerticalOffset={0}
        >
          <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/home');
              }
            }}
            style={styles.closeButton}
          >
            <X size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Создать цель</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View style={[styles.progressFill, { width: progressAnim.interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', '100%']
            }) }]} />
          </View>
          <Text style={styles.progressText}>
            Вопрос {currentQuestion + 1} из {questions.length}
          </Text>
        </View>

        {isGenerating ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Создаём ваш персональный план...</Text>
            <Text style={styles.loadingSubtext}>Это может занять немного времени</Text>
          </View>
        ) : (
          <ScrollView 
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View style={{ 
              opacity: opacityAnim, 
              transform: [{ translateY: translateYAnim }],
              width: '100%'
            }}>
              <View style={styles.questionContainer}>
                <MessageCircle size={32} color={theme.colors.primary} />
                <Text style={styles.question}>{questions[currentQuestion]}</Text>
                <Text style={styles.example}>{examples[currentQuestion]}</Text>
              </View>

              <TextInput
                ref={inputRef}
                style={[styles.input, { height: Math.max(48, Math.min(inputHeight, 200)) }]}
                placeholder="Опиши свою цель..."
                placeholderTextColor={theme.colors.textLight}
                value={currentAnswer}
                onChangeText={setCurrentAnswer}
                multiline
                onContentSizeChange={(e) => setInputHeight(e.nativeEvent.contentSize.height)}
                textAlignVertical="top"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => {
                  if (currentAnswer.trim()) {
                    handleNext();
                  }
                }}
              />

              <TouchableOpacity 
                style={styles.aiChatButton}
                onPress={startAIChat}
                activeOpacity={0.7}
              >
                <Sparkles size={20} color={theme.colors.primary} />
                <Text style={styles.aiChatButtonText}>Обсудить с ИИ</Text>
                <Text style={styles.aiChatButtonSubtext}>Помощь в формулировке цели</Text>
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.footer}>
              <View style={styles.buttonRow}>
                {currentQuestion > 0 && (
                  <Button
                    title="Назад"
                    onPress={handleBack}
                    variant="outline"
                    style={styles.backButton}
                  />
                )}
                <Animated.View style={[
                  styles.nextButtonWrapper, 
                  { transform: [{ scale: scaleAnim }] },
                  currentQuestion === 0 && { flex: 1 } // Full width if no back button
                ]}>
                  <Button
                    title={currentQuestion === questions.length - 1 ? "Создать план" : "Далее"}
                    onPress={handleNext}
                    variant="premium"
                    disabled={!currentAnswer.trim()}
                    style={styles.nextButton}
                  />
                </Animated.View>
              </View>
            </View>
          </ScrollView>
        )}

        <Modal
          visible={showAIChat}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.chatContainer} edges={['top', 'bottom']}>
            <View style={styles.chatHeader}>
              <View style={styles.chatHeaderLeft}>
                <Bot size={24} color={theme.colors.primary} />
                <Text style={styles.chatHeaderTitle}>ИИ-помощник</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAIChat(false)}
                style={styles.chatCloseButton}
              >
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={chatMessages}
              keyExtractor={(item) => item.id}
              style={styles.chatMessages}
              contentContainerStyle={styles.chatMessagesContent}
              renderItem={({ item }) => (
                <View style={[
                  styles.chatMessage,
                  item.role === 'user' ? styles.userMessage : styles.assistantMessage
                ]}>
                  <Text style={[
                    styles.chatMessageText,
                    item.role === 'user' ? styles.userMessageText : styles.assistantMessageText
                  ]}>
                    {item.content}
                  </Text>
                </View>
              )}
            />

            {isChatLoading && (
              <View style={styles.chatLoadingContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.chatLoadingText}>ИИ думает...</Text>
              </View>
            )}

            <View style={[
              styles.chatInputContainer,
              {
                paddingBottom: keyboardHeight > 0 ? 0 : Math.max(insets.bottom, 16),
                position: keyboardHeight > 0 ? 'absolute' : 'relative',
                bottom: keyboardHeight > 0 ? keyboardHeight : 0,
                left: 0,
                right: 0,
              }
            ]}>
              <View style={styles.chatInputRow}>
                <TextInput
                  style={styles.chatInput}
                  placeholder="Напишите сообщение..."
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={chatInput}
                  onChangeText={setChatInput}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[
                    styles.chatSendButton,
                    (!chatInput.trim() || isChatLoading) && styles.chatSendButtonDisabled
                  ]}
                  onPress={sendChatMessage}
                  disabled={!chatInput.trim() || isChatLoading}
                >
                  <Send size={20} color="#000000" />
                </TouchableOpacity>
              </View>
              
              {chatMessages.length > 2 && (
                <TouchableOpacity
                  style={styles.applySuggestionButton}
                  onPress={applyAISuggestion}
                >
                  <Text style={styles.applySuggestionText}>Применить предложение ИИ</Text>
                </TouchableOpacity>
              )}
            </View>
          </SafeAreaView>
        </Modal>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  placeholder: {
    width: 40,
  },
  progressContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  progressBar: {
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  progressText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
  },
  questionContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  question: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    lineHeight: 32,
  },
  input: {
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    minHeight: 120,
    backgroundColor: theme.colors.surface,
  },
  nextButtonWrapper: {
    flex: 2,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: theme.spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  loadingText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
  },
  loadingSubtext: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  example: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textLight,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    fontStyle: 'italic' as const,
    lineHeight: 20,
    paddingHorizontal: theme.spacing.md,
  },
  aiChatButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  aiChatButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.primary,
    marginTop: theme.spacing.xs,
  },
  aiChatButtonSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textLight,
    marginTop: theme.spacing.xs,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  chatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatHeaderTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  chatCloseButton: {
    padding: theme.spacing.sm,
  },
  chatMessages: {
    flex: 1,
  },
  chatMessagesContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  chatMessage: {
    marginBottom: theme.spacing.md,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    borderBottomRightRadius: theme.borderRadius.sm,
    padding: theme.spacing.md,
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderBottomLeftRadius: theme.borderRadius.sm,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chatMessageText: {
    fontSize: theme.fontSize.md,
    lineHeight: 22,
  },
  userMessageText: {
    color: theme.colors.text,
  },
  assistantMessageText: {
    color: theme.colors.text,
  },
  chatLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
  },
  chatLoadingText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
  },
  chatInputContainer: {
    backgroundColor: '#000000',
    paddingTop: 16,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 16,
    maxHeight: 100,
    marginRight: 12,
  },
  chatSendButton: {
    backgroundColor: '#FFD600',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFD600',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  chatSendButtonDisabled: {
    opacity: 0.5,
  },
  applySuggestionButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
    alignItems: 'center',
  },
  applySuggestionText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
  },
});