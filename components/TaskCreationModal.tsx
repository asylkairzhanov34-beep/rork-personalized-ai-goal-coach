import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator } from 'react-native';
import { X, Plus, Clock, Target, AlertCircle, Star, Lightbulb, Sparkles, Bot } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DailyTask, SubTask } from '@/types/goal';
import { theme } from '@/constants/theme';
import { useGoalStore } from '@/hooks/use-goal-store';

interface AIGeneratedTask {
  title: string;
  description: string;
  estimatedTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  priority: 'high' | 'medium' | 'low';
  tips: string[];
  subtasks?: { title: string; estimatedTime: number; }[];
}

interface TaskCreationModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (task: Omit<DailyTask, 'id' | 'goalId' | 'completed' | 'completedAt'>) => void;
  selectedDay: string;
  previousDayTasks?: DailyTask[];
}

const DIFFICULTY_OPTIONS = [
  { value: 'easy' as const, label: 'Легко', color: '#4ADE80' },
  { value: 'medium' as const, label: 'Средне', color: '#FFD600' },
  { value: 'hard' as const, label: 'Сложно', color: '#FF6B6B' },
];

const PRIORITY_OPTIONS = [
  { value: 'low' as const, label: 'Низкий', icon: Clock, color: '#4ADE80' },
  { value: 'medium' as const, label: 'Средний', icon: Target, color: '#FFD600' },
  { value: 'high' as const, label: 'Высокий', icon: AlertCircle, color: '#FF6B6B' },
];

const SUGGESTED_TASKS = [
  {
    title: 'Утренняя медитация',
    description: 'Начните день с 10-минутной медитации для ясности ума',
    estimatedTime: 10,
    difficulty: 'easy' as const,
    priority: 'medium' as const,
    tips: ['Найдите тихое место', 'Используйте приложение для медитации', 'Сосредоточьтесь на дыхании']
  },
  {
    title: 'Планирование дня',
    description: 'Составьте список приоритетных задач на день',
    estimatedTime: 15,
    difficulty: 'easy' as const,
    priority: 'high' as const,
    tips: ['Используйте правило 3-х важных дел', 'Оцените время на каждую задачу', 'Оставьте буферное время']
  },
  {
    title: 'Физическая активность',
    description: 'Выполните комплекс упражнений или прогулку',
    estimatedTime: 30,
    difficulty: 'medium' as const,
    priority: 'high' as const,
    tips: ['Начните с разминки', 'Выберите активность по настроению', 'Не забывайте про воду']
  },
];

export function TaskCreationModal({ 
  visible, 
  onClose, 
  onSave, 
  selectedDay,
  previousDayTasks = []
}: TaskCreationModalProps) {
  const insets = useSafeAreaInsets();
  const { currentGoal } = useGoalStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('30');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [tips, setTips] = useState<string[]>([]);
  const [newTip, setNewTip] = useState('');
  const [subtasks, setSubtasks] = useState<Omit<SubTask, 'id'>[]>([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [newSubtaskTime, setNewSubtaskTime] = useState('10');
  const [aiSuggestions, setAiSuggestions] = useState<AIGeneratedTask[]>([]);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);



  const resetForm = () => {
    setTitle('');
    setDescription('');
    setEstimatedTime('30');
    setDifficulty('medium');
    setPriority('medium');
    setTips([]);
    setNewTip('');
    setSubtasks([]);
    setNewSubtask('');
    setNewSubtaskTime('10');
  };

  const handleSave = () => {
    if (!title.trim()) return;

    const task: Omit<DailyTask, 'id' | 'goalId' | 'completed' | 'completedAt'> = {
      day: 0, // Will be set by parent
      date: new Date().toISOString(),
      title: title.trim(),
      description: description.trim(),
      duration: `${estimatedTime}м`,
      priority,
      difficulty,
      estimatedTime: parseInt(estimatedTime) || 30,
      tips,
      subtasks: subtasks.length > 0 ? subtasks.map((st, index) => ({
        ...st,
        id: `subtask_${Date.now()}_${index}`,
      })) : undefined,
    };

    onSave(task);
    resetForm();
    onClose();
  };

  const addTip = () => {
    if (newTip.trim()) {
      setTips([...tips, newTip.trim()]);
      setNewTip('');
    }
  };

  const removeTip = (index: number) => {
    setTips(tips.filter((_, i) => i !== index));
  };

  const addSubtask = () => {
    if (newSubtask.trim()) {
      setSubtasks([...subtasks, {
        title: newSubtask.trim(),
        completed: false,
        estimatedTime: parseInt(newSubtaskTime) || 10,
      }]);
      setNewSubtask('');
      setNewSubtaskTime('10');
    }
  };

  const removeSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  const applySuggestedTask = (suggested: typeof SUGGESTED_TASKS[0]) => {
    if (!suggested?.title?.trim()) return;
    setTitle(suggested.title);
    setDescription(suggested.description);
    setEstimatedTime(suggested.estimatedTime.toString());
    setDifficulty(suggested.difficulty);
    setPriority(suggested.priority);
    setTips(suggested.tips);
  };

  const adaptFromPreviousDay = (previousTask: DailyTask) => {
    if (!previousTask?.title?.trim()) return;
    setTitle(previousTask.title);
    setDescription(`Адаптировано: ${previousTask.description}`);
    setEstimatedTime(previousTask.estimatedTime.toString());
    setDifficulty(previousTask.difficulty);
    setPriority(previousTask.priority);
    setTips(previousTask.tips || []);
    if (previousTask.subtasks) {
      setSubtasks(previousTask.subtasks.map(st => ({
        title: st.title,
        completed: false,
        estimatedTime: st.estimatedTime,
      })));
    }
  };

  const generateAITasks = async () => {
    if (!currentGoal?.title) return;
    
    setIsGeneratingAI(true);
    try {
      // Умный анализ категории цели для более специфичных задач
      const isLanguageLearning = /английск|язык|english|изуч.*слов|vocabular/i.test(
        `${currentGoal.title} ${currentGoal.description} ${currentGoal.category}`
      );
      const isFitness = /похуд|тренир|фитнес|спорт|физ.*актив|упражнен|мышц|пресс|бег|качал|вес|килограмм|fitness|workout|exercise/i.test(
        `${currentGoal.title} ${currentGoal.description} ${currentGoal.category}`
      );
      const isCooking = /готов|кулинар|рецепт|еда|блюд|cook/i.test(
        `${currentGoal.title} ${currentGoal.description} ${currentGoal.category}`
      );
      const isReading = /чита|книг|прочита|book|read/i.test(
        `${currentGoal.title} ${currentGoal.description} ${currentGoal.category}`
      );
      const isProgramming = /программ|код|разработ|js|python|react|web|develop/i.test(
        `${currentGoal.title} ${currentGoal.description} ${currentGoal.category}`
      );

      let specificInstructions = '';
      
      if (isLanguageLearning) {
        specificInstructions = `
        ВАЖНО: Для изучения языка давай КОНКРЕТНЫЙ КОНТЕНТ:
        - Не пиши "Выучить новые слова", а дай 10-15 конкретных слов с переводом
        - Не пиши "Практиковать грамматику", а дай конкретное грамматическое правило с примерами
        - Давай готовые фразы и выражения для запоминания
        - В описании включай сами слова/фразы, которые нужно выучить
        - В подзадачах - конкретные слова или фразы для отработки
        
        Пример правильной задачи:
        {
          "title": "Выучить 12 глаголов движения",
          "description": "Запомнить глаголы: walk (ходить), run (бежать), jump (прыгать), swim (плавать), climb (взбираться), crawl (ползти), fly (летать), drive (водить), ride (ездить верхом), skip (скакать), hop (прыгать на одной ноге), march (маршировать)",
          "subtasks": [
            {"title": "Выучить walk, run, jump, swim", "estimatedTime": 10},
            {"title": "Выучить climb, crawl, fly, drive", "estimatedTime": 10},
            {"title": "Практика: составить 5 предложений с этими глаголами", "estimatedTime": 10}
          ],
          "tips": [
            "Повторяй каждое слово вслух 5 раз",
            "Представляй действие визуально",
            "Используй флеш-карточки"
          ]
        }`;
      } else if (isFitness) {
        specificInstructions = `
        ВАЖНО: Для фитнеса давай КОНКРЕТНЫЕ УПРАЖНЕНИЯ С ЧИСЛАМИ:
        - Не пиши "Сделать упражнения", а дай точный список: "20 приседаний, 15 отжиманий, 30 сек планка"
        - Указывай количество повторений, подходов, время отдыха
        - Давай технику выполнения в tips
        - В подзадачах - разбивка по упражнениям с конкретными числами
        
        Пример правильной задачи:
        {
          "title": "Тренировка ног и ягодиц - 35 минут",
          "description": "Комплекс из 5 упражнений: 1) Приседания - 3 подхода по 20 раз, 2) Выпады - 3 подхода по 15 раз на каждую ногу, 3) Ягодичный мостик - 3 подхода по 25 раз, 4) Боковые выпады - 2 подхода по 12 раз, 5) Прыжки - 3 подхода по 30 секунд. Отдых между подходами 45 секунд",
          "subtasks": [
            {"title": "Разминка 5 минут: суставная гимнастика", "estimatedTime": 5},
            {"title": "Приседания 3x20 + Выпады 3x15", "estimatedTime": 12},
            {"title": "Мостик 3x25 + Боковые выпады 2x12", "estimatedTime": 10},
            {"title": "Прыжки 3x30 сек + растяжка", "estimatedTime": 8}
          ],
          "tips": [
            "Следи за коленями - они не должны выходить за носки",
            "Держи спину прямой",
            "Пей воду между подходами",
            "Дыши ровно: выдох на усилии"
          ]
        }`;
      } else if (isCooking) {
        specificInstructions = `
        ВАЖНО: Для готовки давай КОНКРЕТНЫЕ РЕЦЕПТЫ:
        - Указывай конкретное блюдо, которое нужно приготовить
        - Давай список ингредиентов с количеством
        - Пошаговую инструкцию в подзадачах
        - Время на каждый этап`;
      } else if (isReading) {
        specificInstructions = `
        ВАЖНО: Для чтения давай КОНКРЕТНЫЙ ПЛАН:
        - Указывай точное количество страниц/глав
        - Давай конкретные книги если цель позволяет определить
        - Предлагай конкретные вопросы для размышления о прочитанном`;
      } else if (isProgramming) {
        specificInstructions = `
        ВАЖНО: Для программирования давай КОНКРЕТНЫЕ ЗАДАЧИ:
        - Указывай точную задачу: "Создать компонент Button с пропсами", а не "Изучить React"
        - Давай конкретные концепции для изучения
        - В подзадачах - конкретный код или функционал для реализации`;
      } else {
        specificInstructions = `
        ВАЖНО: Делай задачи максимально КОНКРЕТНЫМИ:
        - Вместо "Изучить тему" -> "Прочитать главу 3 и сделать конспект на 1 страницу"
        - Вместо "Поработать над проектом" -> "Создать первые 3 слайда презентации с титульным, содержанием и введением"
        - Давай измеримые результаты и конкретные действия`;
      }

      const prompt = `
        Создай 3-4 конкретные задачи для достижения цели на русском языке:
        Цель: ${currentGoal.title}
        Описание цели: ${currentGoal.description}
        Категория: ${currentGoal.category}
        Мотивация: ${currentGoal.motivation}
        ${specificInstructions}
        
        Создай JSON массив tasks с задачами, каждая должна содержать:
        - title: конкретное название задачи (не общее, а специфичное)
        - description: ОЧЕНЬ подробное описание с конкретными деталями - что именно делать, какие слова учить, какие упражнения делать, сколько повторений и т.д. (3-5 предложений)
        - estimatedTime: время в минутах (число от 15 до 90)
        - difficulty: сложность (easy/medium/hard)
        - priority: приоритет (high/medium/low)
        - tips: массив из 3-4 практических советов как лучше выполнить
        - subtasks: массив из 2-4 подзадач с полями title (конкретное действие) и estimatedTime
        
        Задачи должны быть:
        - МАКСИМАЛЬНО КОНКРЕТНЫМИ - с числами, списками, именами
        - Практичными и сразу выполнимыми - пользователь должен точно понимать что делать
        - Разнообразными по типу активности
        - С измеримым результатом
        
        Формат ответа: { "tasks": [...] }
        Отвечай ТОЛЬКО JSON без markdown и объяснений.
      `;

      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { 
              role: 'system', 
              content: 'Ты эксперт по планированию задач и персональный тренер/преподаватель. Создаешь МАКСИМАЛЬНО КОНКРЕТНЫЕ, практичные задачи с детальными инструкциями. Для изучения языков - даешь конкретные слова и фразы. Для фитнеса - конкретные упражнения с повторениями. Для любых целей - измеримые, конкретные действия. Отвечай только валидным JSON без markdown блоков и объяснений. Все тексты на русском языке.' 
            },
            { role: 'user', content: prompt }
          ]
        })
      });

      const data = await response.json();
      console.log('AI task suggestions response:', data.completion);
      
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
      
      if (startIndex !== -1 && lastIndex !== -1) {
        jsonString = jsonString.substring(startIndex, lastIndex + 1);
        const aiData = JSON.parse(jsonString);
        
        if (aiData.tasks && Array.isArray(aiData.tasks)) {
          setAiSuggestions(aiData.tasks.slice(0, 4)); // Limit to 4 suggestions
        }
      }
    } catch (error) {
      console.error('Error generating AI tasks:', error);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const applyAITask = (aiTask: AIGeneratedTask) => {
    setTitle(aiTask.title);
    setDescription(aiTask.description);
    setEstimatedTime(aiTask.estimatedTime.toString());
    setDifficulty(aiTask.difficulty);
    setPriority(aiTask.priority);
    setTips(aiTask.tips || []);
    if (aiTask.subtasks) {
      setSubtasks(aiTask.subtasks.map(st => ({
        title: st.title,
        completed: false,
        estimatedTime: st.estimatedTime,
      })));
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={['#1a1a2e', '#0f0f1e']}
          style={StyleSheet.absoluteFillObject}
        />
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Новая задача</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* AI Task Generation */}
          {currentGoal && (
            <View style={styles.section}>
              <View style={styles.aiSectionHeader}>
                <Text style={styles.sectionTitle}>🤖 ИИ-предложения для вашей цели</Text>
                <TouchableOpacity 
                  style={[styles.generateAIButton, isGeneratingAI && styles.generateAIButtonDisabled]}
                  onPress={generateAITasks}
                  disabled={isGeneratingAI}
                >
                  {isGeneratingAI ? (
                    <ActivityIndicator size="small" color="#000000" />
                  ) : (
                    <Sparkles size={16} color="#000000" />
                  )}
                  <Text style={styles.generateAIButtonText}>
                    {isGeneratingAI ? 'Генерирую...' : 'Создать задачи'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {aiSuggestions.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.suggestedContainer}>
                    {aiSuggestions.map((aiTask, index) => (
                      <TouchableOpacity
                        key={`ai_${index}`}
                        style={[styles.suggestedCard, styles.aiSuggestedCard]}
                        onPress={() => applyAITask(aiTask)}
                      >
                        <View style={styles.aiTaskBadge}>
                          <Bot size={12} color="#FFD600" />
                        </View>
                        <Text style={styles.suggestedTitle}>{aiTask.title}</Text>
                        <Text style={styles.suggestedTime}>{aiTask.estimatedTime}м</Text>
                        <Text style={styles.aiTaskDifficulty}>{aiTask.difficulty}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>
          )}

          {/* Suggested Tasks */}
          {SUGGESTED_TASKS.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💡 Общие рекомендации</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.suggestedContainer}>
                  {SUGGESTED_TASKS.map((suggested) => (
                    <TouchableOpacity
                      key={suggested.title}
                      style={styles.suggestedCard}
                      onPress={() => applySuggestedTask(suggested)}
                    >
                      <Text style={styles.suggestedTitle}>{suggested.title}</Text>
                      <Text style={styles.suggestedTime}>{suggested.estimatedTime}м</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Previous Day Adaptation */}
          {previousDayTasks.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⭐ Адаптировать из предыдущего дня</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.suggestedContainer}>
                  {previousDayTasks.slice(0, 3).map((task) => (
                    <TouchableOpacity
                      key={task.id}
                      style={[styles.suggestedCard, styles.adaptedCard]}
                      onPress={() => adaptFromPreviousDay(task)}
                    >
                      <View style={styles.adaptedBadge}>
                        <Star size={12} color="#FFD600" />
                      </View>
                      <Text style={styles.suggestedTitle}>{task.title}</Text>
                      <Text style={styles.suggestedTime}>{task.estimatedTime}м</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Basic Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Основная информация</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Название задачи</Text>
              <TextInput
                style={styles.textInput}
                value={title}
                onChangeText={setTitle}
                placeholder="Введите название задачи..."
                placeholderTextColor="rgba(255,255,255,0.4)"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Описание</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Подробное описание задачи..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Время выполнения (минуты)</Text>
              <TextInput
                style={styles.textInput}
                value={estimatedTime}
                onChangeText={setEstimatedTime}
                placeholder="30"
                placeholderTextColor="rgba(255,255,255,0.4)"
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Priority & Difficulty */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Приоритет и сложность</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Приоритет</Text>
              <View style={styles.optionsContainer}>
                {PRIORITY_OPTIONS.map((option) => {
                  const IconComponent = option.icon;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.optionButton,
                        priority === option.value && styles.optionButtonSelected
                      ]}
                      onPress={() => setPriority(option.value)}
                    >
                      <IconComponent size={16} color={option.color} />
                      <Text style={[
                        styles.optionText,
                        priority === option.value && styles.optionTextSelected
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Сложность</Text>
              <View style={styles.optionsContainer}>
                {DIFFICULTY_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionButton,
                      difficulty === option.value && styles.optionButtonSelected
                    ]}
                    onPress={() => setDifficulty(option.value)}
                  >
                    <View style={[styles.difficultyDot, { backgroundColor: option.color }]} />
                    <Text style={[
                      styles.optionText,
                      difficulty === option.value && styles.optionTextSelected
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Subtasks */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Подзадачи</Text>
            
            <View style={styles.addItemContainer}>
              <TextInput
                style={[styles.textInput, styles.addItemInput]}
                value={newSubtask}
                onChangeText={setNewSubtask}
                placeholder="Добавить подзадачу..."
                placeholderTextColor="rgba(255,255,255,0.4)"
              />
              <TextInput
                style={[styles.textInput, styles.timeInput]}
                value={newSubtaskTime}
                onChangeText={setNewSubtaskTime}
                placeholder="10м"
                placeholderTextColor="rgba(255,255,255,0.4)"
                keyboardType="numeric"
              />
              <TouchableOpacity style={styles.addButton} onPress={addSubtask}>
                <Plus size={20} color="#0A0A0A" />
              </TouchableOpacity>
            </View>

            {subtasks.map((subtask) => (
              <View key={subtask.title} style={styles.listItem}>
                <Text style={styles.listItemText}>{subtask.title}</Text>
                <Text style={styles.listItemTime}>{subtask.estimatedTime}м</Text>
                <TouchableOpacity onPress={() => removeSubtask(subtasks.indexOf(subtask))}>
                  <X size={16} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Tips */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Советы</Text>
            
            <View style={styles.addItemContainer}>
              <TextInput
                style={[styles.textInput, styles.addItemInput]}
                value={newTip}
                onChangeText={setNewTip}
                placeholder="Добавить совет..."
                placeholderTextColor="rgba(255,255,255,0.4)"
              />
              <TouchableOpacity style={styles.addButton} onPress={addTip}>
                <Plus size={20} color="#0A0A0A" />
              </TouchableOpacity>
            </View>

            {tips.map((tip) => (
              <View key={tip} style={styles.listItem}>
                <Lightbulb size={16} color="#FFD600" />
                <Text style={[styles.listItemText, { flex: 1, marginLeft: 8 }]}>{tip}</Text>
                <TouchableOpacity onPress={() => removeTip(tips.indexOf(tip))}>
                  <X size={16} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Отмена</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.saveButton, !title.trim() && styles.saveButtonDisabled]} 
            onPress={handleSave}
            disabled={!title.trim()}
          >
            <Text style={styles.saveButtonText}>Сохранить</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginBottom: 12,
  },
  suggestedContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  suggestedCard: {
    minWidth: 120,
    padding: 16,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    alignItems: 'center',
  },
  adaptedCard: {
    borderWidth: 1,
    borderColor: '#FFD600',
    position: 'relative',
  },
  adaptedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  suggestedTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  suggestedTime: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 6,
  },
  optionButtonSelected: {
    borderColor: '#FFD600',
    backgroundColor: 'rgba(255, 214, 0, 0.1)',
  },
  optionText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  optionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  difficultyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  addItemContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  addItemInput: {
    flex: 1,
  },
  timeInput: {
    width: 80,
  },
  addButton: {
    width: 48,
    height: 48,
    backgroundColor: '#FFD600',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    marginBottom: 8,
    gap: 8,
  },
  listItemText: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
  },
  listItemTime: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  footer: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  cancelButton: {
    flex: 1,
    height: 48,
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.8)',
  },
  saveButton: {
    flex: 1,
    height: 48,
    backgroundColor: '#FFD600',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(255, 214, 0, 0.3)',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#0A0A0A',
  },
  aiSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  generateAIButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD600',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  generateAIButtonDisabled: {
    backgroundColor: 'rgba(255, 214, 0, 0.5)',
  },
  generateAIButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#000000',
  },
  aiSuggestedCard: {
    borderWidth: 1,
    borderColor: '#4ADE80',
    position: 'relative',
  },
  aiTaskBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  aiTaskDifficulty: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'capitalize',
    marginTop: 4,
  },
});