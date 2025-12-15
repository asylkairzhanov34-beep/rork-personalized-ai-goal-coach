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
  "What specific goal do you want to achieve?",
  "Why is this goal important to you?",
  "What obstacles might you face?",
  "What resources or support do you have?",
  "How much time per day can you dedicate?",
  "What would success look like for you?",
];

const examples = [
  "For example: Learn English to B2 level, run a marathon, start my own business",
  "For example: Career growth, travel without language barriers, personal development",
  "For example: Lack of time, lack of motivation, financial constraints, fear of failure",
  "For example: Online courses, native speaker friends, gym nearby, savings",
  "For example: 30 minutes in the morning, 1 hour in the evening, 2 hours on weekends",
  "For example: Fluent English conversations, ran 42 km non-stop, earning first profit",
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
           AccessibilityInfo.announceForAccessibility(`Question ${currentQuestion + 1}: ${questions[currentQuestion]}`);
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

      const systemPrompt = `You are an expert goal achievement coach. You help users formulate clear, achievable goals.

Your tasks:
1. Ask clarifying questions about the goal
2. Help make the goal more specific and measurable
3. Understand motivation and obstacles
4. At the end, suggest a clearly formulated goal

Respond in a friendly manner in English, ask one question at a time. Be concise but helpful.`;

      const toolkitBaseUrl = (process.env.EXPO_PUBLIC_TOOLKIT_URL || 'https://toolkit.rork.com').replace(/\/$/, '');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${toolkitBaseUrl}/text/llm/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            ...conversationHistory
          ]
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      const rawText = await response.text();
      console.log('[GoalCreationModal] AI chat response status:', response.status);
      console.log('[GoalCreationModal] AI chat response preview:', rawText.substring(0, 200));

      if (!response.ok) {
        throw new Error(`AI request failed (${response.status})`);
      }

      const data = JSON.parse(rawText) as { completion?: string };
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.completion ?? 'Sorry, I could not generate a response. Please try again.',
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, an error occurred. Please try again.',
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
        content: 'Hi! 👋 Tell me more about your goal. What exactly do you want to achieve and why is it important to you?',
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
        Create a detailed goal achievement plan in English:
        Goal: ${finalAnswers[0]}
        Motivation: ${finalAnswers[1]}
        Obstacles: ${finalAnswers[2]}
        Resources: ${finalAnswers[3]}
        Time per day: ${finalAnswers[4]}
        Success criteria: ${finalAnswers[5]}
        
        Create JSON with:
        1. goal object with fields: title, description, category, motivation
        2. dailyPlans array - 30-day plan where each day contains 2-3 INTERCONNECTED tasks
        
        CRITICALLY IMPORTANT:
        - Each day should contain EXACTLY 2-3 tasks of varying difficulty
        - Tasks within a day should be LOGICALLY CONNECTED and complement each other
        - Tasks should form a UNIFIED STRUCTURE where each subsequent task builds on the previous one
        - Progress should be gradual - from simple to complex over 30 days
        
        Structure of dailyPlans:
        [
          {
            "dayNumber": 1,
            "dailyTheme": "Day theme (e.g.: Basics and planning)",
            "tasks": [
              {
                "title": "Task name",
                "description": "Detailed description (2-3 sentences)",
                "duration": "time (e.g. 20 minutes)",
                "priority": "high/medium/low",
                "difficulty": "easy/medium/hard",
                "estimatedTime": number in minutes,
                "connectionToNext": "How this task connects to the next",
                "tips": ["tip 1", "tip 2"],
                "subtasks": [
                  { "title": "Specific subtask", "estimatedTime": 5, "completed": false }
                ]
              }
            ]
          }
        ]
        
        Examples of task connectivity within a day:
        - Language learning day: 1) Learn 10 new words → 2) Create 5 sentences with these words → 3) Listen to dialogue with these words
        - Fitness day: 1) 10 min warm-up → 2) Main workout → 3) Stretching and analysis
        - Business day: 1) Research market → 2) Analyze competitors → 3) Create action plan
        
        Difficulty distribution within a day:
        - 1 easy task (easy) - preparation/warm-up
        - 1 medium task (medium) - main work  
        - 1 hard task (hard) - application/reinforcement (optional)
        
        Format: { "goal": {...}, "dailyPlans": [...] }
      `;

      const toolkitBaseUrl = (process.env.EXPO_PUBLIC_TOOLKIT_URL || 'https://toolkit.rork.com').replace(/\/$/, '');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000);

      const response = await fetch(`${toolkitBaseUrl}/text/llm/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'You are an expert goal achievement coach. Create VERY DETAILED, practical plans. In subtasks ALWAYS specify concrete actions with numbers (number of repetitions, specific exercises, specific words to learn). DO NOT use generic formulations. Respond only with valid JSON without additional text. All texts in English.' },
            { role: 'user', content: prompt }
          ]
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      const rawText = await response.text();
      console.log('[GoalCreationModal] Raw AI response status:', response.status);
      console.log('[GoalCreationModal] Raw AI response preview:', rawText.substring(0, 300));

      if (!response.ok) {
        throw new Error(`AI request failed (${response.status})`);
      }

      const data = JSON.parse(rawText) as { completion?: string };
      console.log('Raw AI response:', data.completion);
      
      // Extract JSON from the response
      const completion = data.completion ?? '';
      if (!completion.trim()) {
        throw new Error('AI returned an empty response');
      }

      let jsonString = completion.trim();
      
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
      
      // Remove single-line comments (// ...)
      jsonString = jsonString.replace(/\/\/[^\n]*\n/g, '\n');
      // Remove multi-line comments (/* ... */)
      jsonString = jsonString.replace(/\/\*[\s\S]*?\*\//g, '');
      // Remove trailing commas before closing brackets
      jsonString = jsonString.replace(/,\s*([}\]])/g, '$1');
      
      console.log('Cleaned JSON:', jsonString.substring(0, 500));
      
      const planData = JSON.parse(jsonString);
      console.log('Parsed plan data:', planData);
      
      // Validate the structure
      if (!planData.goal || (!planData.dailyPlans && !planData.tasks)) {
        throw new Error('Invalid plan structure received from AI');
      }
      
      const startDate = new Date();

      const goal: Omit<Goal, 'id' | 'createdAt' | 'isActive' | 'completedTasksCount' | 'totalTasksCount'> = {
        title: planData.goal?.title || finalAnswers[0],
        description: planData.goal?.description || `Personal plan to achieve: ${finalAnswers[0]}`,
        category: planData.goal?.category || 'Personal Development',
        motivation: planData.goal?.motivation || finalAnswers[1],
        obstacles: [finalAnswers[2]],
        resources: [finalAnswers[3]],
        startDate: startDate.toISOString(),
        planType: 'free',
      };

      // Преобразуем новую структуру dailyPlans в задачи
      const tasks: Omit<DailyTask, 'id' | 'goalId' | 'completed' | 'completedAt'>[] = [];
      
      const dailyPlans = planData.dailyPlans || planData.tasks;
      
      if (Array.isArray(dailyPlans)) {
        dailyPlans.forEach((dayPlan: any, dayIndex: number) => {
          const dayDate = new Date();
          dayDate.setDate(dayDate.getDate() + dayIndex);
          
          // Если структура новая (dailyPlans с tasks внутри)
          const dayTasks = dayPlan?.tasks || [dayPlan];
          
          dayTasks.forEach((task: any, taskIndex: number) => {
            const subtasks = Array.isArray(task?.subtasks) ? task.subtasks.map((st: any, stIndex: number) => ({
              id: `subtask_${Date.now()}_${dayIndex}_${taskIndex}_${stIndex}`,
              title: st?.title || `Подзадача ${stIndex + 1}`,
              completed: false,
              estimatedTime: st?.estimatedTime || 10,
            })) : undefined;
            
            tasks.push({
              day: dayIndex + 1,
              date: dayDate.toISOString(),
              title: task?.title || `Task ${dayIndex + 1}.${taskIndex + 1}`,
              description: task?.description || 'Work on your goal today',
              duration: task?.duration || finalAnswers[4] || '30 minutes',
              priority: (task?.priority as 'high' | 'medium' | 'low') || 'medium',
              tips: Array.isArray(task?.tips) ? task.tips : ['Stay focused', 'Take breaks when needed'],
              difficulty: (task?.difficulty as 'easy' | 'medium' | 'hard') || 'medium',
              estimatedTime: task?.estimatedTime || 30,
              subtasks,
            });
          });
        });
      }

      await createGoal(goal, tasks);
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/home');
      }
    } catch (error) {
      console.error('Error generating plan:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error message:', errorMessage);

      const debugId = `goal_create_${Date.now()}`;
      console.error('[GoalCreationModal] Debug ID:', debugId);

      const AlertModule = await import('react-native');
      AlertModule.Alert.alert(
        'Failed to create goal',
        `Please try again.\n\nError: ${errorMessage}\n\nDebug ID: ${debugId}`,
        [{ text: 'OK' }]
      );
      throw error;
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
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
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
          <Text style={styles.headerTitle}>Create Goal</Text>
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
            Question {currentQuestion + 1} of {questions.length}
          </Text>
        </View>

        {isGenerating ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Creating your personalized plan...</Text>
            <Text style={styles.loadingSubtext}>This may take a moment</Text>
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
                placeholder="Describe your goal..."
                placeholderTextColor={theme.colors.textLight}
                value={currentAnswer}
                onChangeText={setCurrentAnswer}
                multiline
                onContentSizeChange={(e) => setInputHeight(e.nativeEvent.contentSize.height)}
                textAlignVertical="top"
                returnKeyType="done"
                blurOnSubmit={true}
                onSubmitEditing={() => {
                  Keyboard.dismiss();
                }}
              />

              <TouchableOpacity 
                style={styles.aiChatButton}
                onPress={startAIChat}
                activeOpacity={0.7}
              >
                <Sparkles size={20} color={theme.colors.primary} />
                <Text style={styles.aiChatButtonText}>Discuss with AI</Text>
                <Text style={styles.aiChatButtonSubtext}>Help with goal formulation</Text>
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.footer}>
              <View style={styles.buttonRow}>
                {currentQuestion > 0 && (
                  <Button
                    title="Back"
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
                    title={currentQuestion === questions.length - 1 ? "Create Plan" : "Next"}
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
                <Text style={styles.chatHeaderTitle}>AI Assistant</Text>
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
                <Text style={styles.chatLoadingText}>AI is thinking...</Text>
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
                  placeholder="Type a message..."
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
                  <Text style={styles.applySuggestionText}>Apply AI Suggestion</Text>
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
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
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