import createContextHook from '@nkzw/create-context-hook';
import React, { useState, useCallback, useMemo } from 'react';
import { ChatMessage } from '@/types/chat';
import { useGoalStore } from '@/hooks/use-goal-store';

export const [ChatProvider, useChat] = createContextHook(() => {
  const goalStore = useGoalStore();
  // Генерируем персонализированное приветствие
  const getWelcomeMessage = useCallback(() => {
    const name = goalStore.profile.name;
    const currentGoal = goalStore.currentGoal;
    const todayTasks = goalStore.getTodayTasks();
    const completedTasks = todayTasks.filter(t => t.completed).length;
    const streak = goalStore.profile.currentStreak;

    console.log('Chat welcome message data:', {
      name,
      currentGoal: currentGoal ? { id: currentGoal.id, title: currentGoal.title, isActive: currentGoal.isActive } : null,
      todayTasksCount: todayTasks.length,
      completedTasks,
      streak,
      isReady: goalStore.isReady
    });

    let greeting = `👋 Привет${name ? `, ${name}` : ''}! Я ваш персональный помощник 🤖\n\n`;

    if (currentGoal) {
      greeting += `🎯 Вижу, что вы работаете над целью: "${currentGoal.title}"\n`;
      
      if (todayTasks.length > 0) {
        greeting += `📅 На сегодня у вас ${todayTasks.length} задач${todayTasks.length === 1 ? 'а' : todayTasks.length < 5 ? 'и' : ''}`;
        if (completedTasks > 0) {
          greeting += `, из которых ${completedTasks} уже выполнено! 🎉`;
        } else {
          greeting += `. Пора приступать! 💪`;
        }
        greeting += '\n';
      }
      
      if (streak > 0) {
        greeting += `🔥 Отлично! У вас стрик ${streak} дн${streak === 1 ? 'ень' : streak < 5 ? 'я' : 'ей'}!\n`;
      }
    } else {
      greeting += `🎆 Похоже, у вас ещё нет активной цели. Могу помочь с её созданием!\n`;
    }

    greeting += `\n💬 Могу помочь с:\n• Анализом прогресса\n• Мотивацией и советами\n• Планированием задач\n• Ответами на вопросы\n\nКак дела? 😊`;

    return greeting;
  }, [goalStore]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Инициализируем приветственное сообщение когда данные готовы
  React.useEffect(() => {
    if (goalStore.isReady && !isInitialized) {
      setMessages([{
        id: '1',
        text: getWelcomeMessage(),
        isBot: true,
        timestamp: new Date(),
      }]);
      setIsInitialized(true);
    }
  }, [goalStore.isReady, isInitialized, getWelcomeMessage]);

  // Обновляем приветственное сообщение при изменении цели
  React.useEffect(() => {
    if (goalStore.isReady && isInitialized && messages.length > 0) {
      // Обновляем только первое сообщение (приветственное)
      setMessages(prev => {
        if (prev.length > 0 && prev[0].id === '1') {
          return [{
            ...prev[0],
            text: getWelcomeMessage(),
            timestamp: new Date(),
          }, ...prev.slice(1)];
        }
        return prev;
      });
    }
  }, [goalStore.currentGoal?.id, goalStore.isReady, isInitialized, messages.length, getWelcomeMessage]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const sendMessage = useCallback(async (text: string) => {
    if (!text || typeof text !== 'string' || !text.trim() || text.length > 500) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: text.trim(),
      isBot: false,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Подготавливаем контекст о текущем состоянии пользователя
      const userContext = {
        profile: goalStore.profile,
        currentGoal: goalStore.currentGoal,
        todayTasks: goalStore.getTodayTasks(),
        progress: goalStore.getProgress(),
        pomodoroStats: goalStore.getPomodoroStats(),
      };

      // Подготавливаем детальную информацию о задачах
      const todayTasksDetails = userContext.todayTasks.slice(0, 10).map(task => 
        `- ${task.completed ? '✓' : '○'} ${task.title.slice(0, 50)} (${task.priority} приоритет, ${task.estimatedTime} мин)`
      ).join('\n');

      // Санитизация данных для системного промпта
      const safeName = (userContext.profile.name || 'Не указано').slice(0, 50);
      const safeGoalTitle = userContext.currentGoal ? userContext.currentGoal.title.slice(0, 100) : 'Нет активной цели';
      const safeGoalDescription = userContext.currentGoal ? userContext.currentGoal.description.slice(0, 200) : 'Нет';
      
      const systemPrompt = `Ты персональный помощник в приложении для достижения целей и продуктивности. 

📊 Текущее состояние пользователя:
👤 Имя: ${safeName}
🎯 Текущая цель: ${safeGoalTitle}
📝 Описание: ${safeGoalDescription}
📈 Прогресс: ${userContext.progress.toFixed(1)}%
🔥 Текущий стрик: ${userContext.profile.currentStreak} дней
🏆 Лучший стрик: ${userContext.profile.bestStreak} дней
🍅 Помодоро сегодня: ${userContext.pomodoroStats.todaySessions} сессий (${Math.round(userContext.pomodoroStats.todayWorkTime / 60)} мин)

📅 Задачи на сегодня (${userContext.todayTasks.filter(t => t.completed).length}/${userContext.todayTasks.length}):
${todayTasksDetails || 'Нет задач на сегодня'}

🤖 Ты можешь:
• Анализировать прогресс и давать обратную связь
• Предлагать советы по продуктивности
• Мотивировать на основе достижений
• Помогать с планированием и приоритизацией
• Предлагать корректировки целей и задач
• Отвечать на вопросы о приложении

💬 Отвечай дружелюбно и мотивирующе, давай практические советы. Используй эмодзи для лучшего восприятия. Отвечай на русском языке. Будь кратким, но полезным.`;

      const requestBody = {
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          ...messages.slice(-5).map(msg => ({
            role: msg.isBot ? 'assistant' : 'user',
            content: msg.text.slice(0, 1000)
          })),
          {
            role: 'user',
            content: text.trim().slice(0, 500)
          }
        ]
      };

      console.log('Sending request to LLM API with', requestBody.messages.length, 'messages');

      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('HTTP error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      console.log('Raw response text (first 200 chars):', responseText.substring(0, 200));
      console.log('Response text length:', responseText.length);
      
      // Проверяем, что ответ не пустой
      if (!responseText || responseText.trim().length === 0) {
        throw new Error('Получен пустой ответ от сервера');
      }
      
      let data;
      
      try {
        // Сначала пробуем парсить как есть
        data = JSON.parse(responseText);
        console.log('Successfully parsed JSON:', data);
      } catch (parseError) {
        console.error('Initial JSON parse error:', parseError);
        
        // Удаляем BOM и другие невидимые символы
        let cleanedResponse = responseText
          .replace(/^\uFEFF/, '') // BOM
          .replace(/^[\u200B-\u200D\uFEFF\u0000-\u001F]/, '') // Другие невидимые символы
          .trim();
        
        console.log('Cleaned response (first 200 chars):', cleanedResponse.substring(0, 200));
        
        try {
          // Пробуем парсить очищенный ответ
          data = JSON.parse(cleanedResponse);
          console.log('Successfully parsed cleaned JSON:', data);
        } catch (cleanParseError) {
          console.error('Cleaned JSON parse error:', cleanParseError);
          
          // Ищем JSON объект в тексте
          const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/g);
          if (jsonMatch && jsonMatch.length > 0) {
            // Берем последний найденный JSON объект
            const lastJsonMatch = jsonMatch[jsonMatch.length - 1];
            try {
              data = JSON.parse(lastJsonMatch);
              console.log('Successfully parsed extracted JSON:', data);
            } catch (extractParseError) {
              console.error('Extracted JSON parse error:', extractParseError);
              
              // Если все попытки парсинга провалились, используем весь текст как ответ
              console.log('Using entire response as completion text');
              data = { completion: cleanedResponse };
            }
          } else {
            // Если JSON не найден, используем весь текст как ответ
            console.log('No JSON found, using entire response as completion');
            data = { completion: cleanedResponse };
          }
        }
      }

      if (!data || !data.completion) {
        console.error('Invalid response structure:', data);
        throw new Error('Некорректная структура ответа');
      }
      
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: typeof data.completion === 'string' ? data.completion : 'Ошибка обработки ответа',
        isBot: true,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      let errorText = 'Извините, произошла ошибка. Попробуйте еще раз.';
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('Network request failed')) {
          errorText = 'Проблема с подключением к интернету. Проверьте соединение и попробуйте снова.';
        } else if (error.message.includes('HTTP error')) {
          errorText = 'Сервер временно недоступен. Попробуйте позже.';
        } else if (error.message.includes('JSON') || error.message.includes('некорректный ответ')) {
          errorText = 'Ошибка обработки ответа сервера. Попробуйте еще раз.';
        }
      }
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: errorText,
        isBot: true,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, goalStore]);

  const clearChat = useCallback(() => {
    setMessages([
      {
        id: '1',
        text: getWelcomeMessage(),
        isBot: true,
        timestamp: new Date(),
      }
    ]);
  }, [getWelcomeMessage]);

  // Функции для работы с целями через чат
  const updateGoalFromChat = useCallback((updates: Record<string, any>) => {
    if (!updates || typeof updates !== 'object') return;
    
    // Валидация входных данных
    const validKeys = ['title', 'description', 'category', 'targetDate'];
    const sanitizedUpdates: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(updates)) {
      if (validKeys.includes(key) && typeof value === 'string' && value.trim().length > 0 && value.length <= 200) {
        sanitizedUpdates[key] = value.trim();
      }
    }
    
    if (Object.keys(sanitizedUpdates).length === 0) return;
    
    if (goalStore.currentGoal) {
      // Здесь можно добавить логику обновления цели
      console.log('Updating goal from chat:', sanitizedUpdates);
    }
  }, [goalStore]);

  const addTaskFromChat = useCallback((taskData: Record<string, any>) => {
    if (!taskData || typeof taskData !== 'object') return;
    
    // Валидация и санитизация данных задачи
    const title = taskData.title?.toString().trim();
    if (!title || title.length === 0 || title.length > 100) return;
    
    const description = taskData.description?.toString().trim() || '';
    if (description.length > 300) return;
    
    const validPriorities = ['high', 'medium', 'low'];
    const validDifficulties = ['easy', 'medium', 'hard'];
    
    goalStore.addTask({
      day: typeof taskData.day === 'number' && taskData.day >= 1 && taskData.day <= 30 ? taskData.day : 1,
      title,
      description,
      date: taskData.date || new Date().toISOString(),
      duration: taskData.duration || '30 мин',
      priority: validPriorities.includes(taskData.priority) ? taskData.priority : 'medium',
      tips: Array.isArray(taskData.tips) ? taskData.tips.slice(0, 5) : [],
      difficulty: validDifficulties.includes(taskData.difficulty) ? taskData.difficulty : 'medium',
      estimatedTime: typeof taskData.estimatedTime === 'number' && taskData.estimatedTime > 0 && taskData.estimatedTime <= 480 ? taskData.estimatedTime : 30,
    });
  }, [goalStore]);

  return useMemo(() => ({
    messages,
    isLoading,
    sendMessage,
    clearChat,
    updateGoalFromChat,
    addTaskFromChat,
    userContext: {
      profile: goalStore.profile,
      currentGoal: goalStore.currentGoal,
      todayTasks: goalStore.getTodayTasks(),
      progress: goalStore.getProgress(),
    },
  }), [messages, isLoading, sendMessage, clearChat, updateGoalFromChat, addTaskFromChat, goalStore]);
});

