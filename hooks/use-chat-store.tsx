import createContextHook from '@nkzw/create-context-hook';
import { useRorkAgent, createRorkTool } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import { useGoalStore } from '@/hooks/use-goal-store';
import { ChatMessage } from '@/types/chat';
import { useMemo, useEffect, useCallback, useState } from 'react';

export const [ChatProvider, useChat] = createContextHook(() => {
  const goalStore = useGoalStore();

  const { messages, error, sendMessage: rorkSendMessage, setMessages } = useRorkAgent({
    tools: {
      addTask: createRorkTool({
        description: 'Добавить ОДНУ новую задачу в план. Эта функция ТОЛЬКО добавляет новую задачу к существующим, НЕ удаляет и НЕ заменяет другие задачи. Используй когда пользователь просит добавить задачу.',
        zodSchema: z.object({
          title: z.string().describe('Title of the task'),
          description: z.string().describe('Detailed description'),
          date: z.string().describe('Date for the task (ISO format, YYYY-MM-DD)'),
          priority: z.enum(['high', 'medium', 'low']).optional().describe('Priority level'),
          duration: z.string().optional().describe('Estimated duration (e.g., "30 min")'),
          difficulty: z.enum(['easy', 'medium', 'hard']).optional().describe('Difficulty level'),
          estimatedTime: z.number().optional().describe('Estimated time in minutes'),
        }),
        execute: async (input) => {
          const currentTaskCount = goalStore.dailyTasks.length;
          await goalStore.addTask({
            title: input.title,
            description: input.description,
            date: input.date,
            priority: (input.priority || 'medium') as any,
            duration: input.duration || '30 min',
            difficulty: (input.difficulty || 'medium') as any,
            estimatedTime: input.estimatedTime || 30,
            day: 0,
            tips: [],
          });
          const newTaskCount = goalStore.dailyTasks.length;
          return `✅ Задача "${input.title}" добавлена в план на ${new Date(input.date).toLocaleDateString('ru-RU')}. Всего задач: ${currentTaskCount} → ${newTaskCount}`;
        },
      }),
      updateTask: createRorkTool({
        description: 'Обновить существующую задачу. Используй для изменения статуса, названия или других параметров.',
        zodSchema: z.object({
          taskId: z.string().describe('ID of the task to update'),
          title: z.string().optional(),
          description: z.string().optional(),
          date: z.string().optional(),
          completed: z.boolean().optional(),
          priority: z.enum(['high', 'medium', 'low']).optional(),
          difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
          duration: z.string().optional(),
          estimatedTime: z.number().optional(),
        }),
        execute: async (input) => {
           goalStore.updateTask(input.taskId, {
             ...(input.title && { title: input.title }),
             ...(input.description && { description: input.description }),
             ...(input.date && { date: input.date }),
             ...(input.completed !== undefined && { completed: input.completed }),
             ...(input.priority && { priority: input.priority as any }),
             ...(input.difficulty && { difficulty: input.difficulty as any }),
             ...(input.duration && { duration: input.duration }),
             ...(input.estimatedTime && { estimatedTime: input.estimatedTime }),
           });
           return `Задача обновлена успешно.`;
        },
      }),
      deleteTask: createRorkTool({
        description: 'Удалить задачу из расписания',
        zodSchema: z.object({
          taskId: z.string().describe('ID of the task to delete'),
        }),
        execute: async (input) => {
          goalStore.deleteTask(input.taskId);
          return `Задача удалена успешно.`;
        },
      }),
      getTasks: createRorkTool({
        description: 'Получить список всех задач пользователя. ВАЖНО: Эта функция только показывает задачи, НЕ изменяет их.',
        zodSchema: z.object({
          startDate: z.string().optional().describe('Start date (ISO)'),
          endDate: z.string().optional().describe('End date (ISO)'),
        }),
        execute: async (input) => {
          let tasks = goalStore.dailyTasks;
          if (input.startDate) {
            tasks = tasks.filter(t => new Date(t.date) >= new Date(input.startDate!));
          }
          if (input.endDate) {
             tasks = tasks.filter(t => new Date(t.date) <= new Date(input.endDate!));
          }
          const summary = `Найдено задач: ${tasks.length}\n`;
          return summary + JSON.stringify(tasks.map(t => ({
            id: t.id,
            title: t.title,
            description: t.description,
            date: t.date,
            completed: t.completed,
            priority: t.priority,
            difficulty: t.difficulty,
            estimatedTime: t.estimatedTime
          })), null, 2);
        },
      }),
      getHistory: createRorkTool({
        description: 'Получить историю выполнения за последние 90 дней для анализа продуктивности и персонализированных рекомендаций',
        zodSchema: z.object({}),
        execute: async () => {
          const now = new Date();
          const ninetyDaysAgo = new Date();
          ninetyDaysAgo.setDate(now.getDate() - 90);
          
          const relevantTasks = goalStore.dailyTasks.filter(t => 
            new Date(t.date) >= ninetyDaysAgo && new Date(t.date) <= now
          );
          
          const total = relevantTasks.length;
          const completed = relevantTasks.filter(t => t.completed).length;
          const rate = total > 0 ? (completed / total) * 100 : 0;
          
          return JSON.stringify({
            period: 'Last 90 days',
            totalTasks: total,
            completedTasks: completed,
            completionRate: rate.toFixed(1) + '%',
            streak: goalStore.profile.currentStreak
          });
        },
      }),
    },
  });

  const [isSending, setIsSending] = useState<boolean>(false);

  const buildSystemContext = useCallback(() => {
    const tasks = goalStore.dailyTasks || [];
    const profile = goalStore.profile;
    const currentGoal = goalStore.currentGoal;
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Get tasks for today and upcoming week
    const todayTasks = tasks.filter(t => t.date?.startsWith(todayStr));
    const upcomingTasks = tasks.filter(t => {
      const taskDate = new Date(t.date);
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      return taskDate >= today && taskDate <= weekFromNow;
    });
    
    const completedTasks = tasks.filter(t => t.completed);
    const pendingTasks = tasks.filter(t => !t.completed);
    
    let context = `[SYSTEM: Ты GoalForge AI - умный помощник для достижения целей. Текущая дата: ${todayStr}.\n`;
    
    if (currentGoal) {
      context += `\nТекущая цель пользователя: "${currentGoal.title}"\n`;
      if (currentGoal.description) {
        context += `Описание цели: ${currentGoal.description}\n`;
      }
    }
    
    if (profile) {
      context += `\nПрофиль: Streak ${profile.currentStreak} дней\n`;
    }
    
    context += `\n📊 СТАТИСТИКА ЗАДАЧ:\n`;
    context += `- Всего задач в системе: ${tasks.length}\n`;
    context += `- Выполнено: ${completedTasks.length}\n`;
    context += `- В процессе: ${pendingTasks.length}\n`;
    
    if (todayTasks.length > 0) {
      context += `\n📋 Задачи на сегодня (${todayTasks.length}):\n`;
      todayTasks.forEach((t, i) => {
        context += `${i + 1}. [${t.completed ? '✓' : '○'}] "${t.title}" (ID: ${t.id}, приоритет: ${t.priority || 'medium'})\n`;
      });
    } else {
      context += `\nНа сегодня задач нет.\n`;
    }
    
    if (upcomingTasks.length > 0 && upcomingTasks.length <= 10) {
      context += `\n🗓 Ближайшие задачи на неделю (${upcomingTasks.length}):\n`;
      upcomingTasks.slice(0, 10).forEach((t, i) => {
        const taskDate = new Date(t.date).toLocaleDateString('ru-RU');
        context += `${i + 1}. [${t.completed ? '✓' : '○'}] "${t.title}" - ${taskDate} (ID: ${t.id})\n`;
      });
    }
    
    context += `\n⚠️ КРИТИЧЕСКИ ВАЖНЫЕ ПРАВИЛА:\n`;
    context += `\n🚫 ЗАПРЕЩЕНО:\n`;
    context += `- Удалять существующие задачи без явной просьбы пользователя\n`;
    context += `- Заменять или перезаписывать задачи при добавлении новых\n`;
    context += `- Вызывать deleteTask когда пользователь просит "добавить" задачу\n`;
    context += `\n✅ ПРАВИЛЬНЫЙ ПОДХОД:\n`;
    context += `1. Когда пользователь просит ДОБАВИТЬ задачу:\n`;
    context += `   → Используй ТОЛЬКО addTask\n`;
    context += `   → addTask автоматически добавляет к существующим ${tasks.length} задачам\n`;
    context += `   → После addTask количество задач станет ${tasks.length + 1}\n`;
    context += `\n2. Когда пользователь просит УДАЛИТЬ конкретную задачу:\n`;
    context += `   → Сначала спроси какую именно задачу удалить\n`;
    context += `   → Используй deleteTask только с конкретным taskId\n`;
    context += `\n3. Когда пользователь просит ИЗМЕНИТЬ задачу:\n`;
    context += `   → Используй updateTask с нужным taskId\n`;
    context += `\n4. Формат даты: YYYY-MM-DD (например: ${todayStr})\n`;
    context += `5. Отвечай кратко и дружелюбно на русском языке\n`;
    context += `\n💡 Помни: У пользователя сейчас ${tasks.length} задач. При добавлении новой их станет ${tasks.length + 1}.\n`;
    context += `[/END_SYSTEM]\n\n`;
    
    return context;
  }, [goalStore.dailyTasks, goalStore.profile, goalStore.currentGoal]);

  const sendMessage = useCallback(async (text: string) => {
    setIsSending(true);
    try {
      const context = buildSystemContext();
      const messageWithContext = context + text;
      console.log('[ChatStore] Sending message with context to agent');
      console.log('[ChatStore] User message:', text);
      console.log('[ChatStore] Tasks count:', goalStore.dailyTasks?.length || 0);
      await rorkSendMessage(messageWithContext);
    } catch (e) {
      console.error('[ChatStore] sendMessage failed:', e);
      throw e;
    } finally {
      setIsSending(false);
    }
  }, [rorkSendMessage, buildSystemContext, goalStore.dailyTasks]);

  const clearChat = useCallback(() => {
    setMessages([]);
  }, [setMessages]);

  const uiMessages: ChatMessage[] = useMemo(() => {
    return messages.map(m => {
        let text = '';
        if (Array.isArray(m.parts)) {
             text = m.parts
                .filter((p: any) => p.type === 'text')
                .map((p: any) => p.text)
                .join('');
             
             const toolCalls = m.parts.filter((p: any) => p.type === 'tool');
             if (text === '' && toolCalls.length > 0) {
                 text = 'Выполняю...'; 
             }
        } else {
             text = (m as any).content || '';
        }
        
        if (m.role === 'user') {
            text = text.replace(/^\[SYSTEM:.*?\[\/END_SYSTEM\]\s*/s, '');
        }

        return {
            id: m.id,
            text: text,
            isBot: m.role === 'assistant',
            timestamp: new Date(),
        };
    });
  }, [messages]);

  useEffect(() => {
    if (uiMessages.length === 0 && goalStore.isReady) {
       // We can't easily inject a "fake" message into useRorkAgent state if it doesn't match its internal structure.
       // But we can return a welcome message in uiMessages if empty.
       // However, useRorkAgent handles state.
       // Let's just send a system prompt as the first hidden message if possible, but useRorkAgent might not support hidden.
       // We will just rely on the user sending the first message or add a UI placeholder in ChatScreen.
    }
  }, [uiMessages.length, goalStore.isReady]);

  const errorText = useMemo(() => {
    if (!error) return null;
    const message = typeof error === 'string' ? error : (error as any)?.message;
    const errorStr = message ? String(message) : 'Unknown chat error';
    
    // Translate common error messages to English
    if (errorStr.includes('Не удалось подключиться') || errorStr.includes('fetch failed') || errorStr.includes('network')) {
      return 'Connection error. Please check your internet and try again.';
    }
    if (errorStr.includes('timeout') || errorStr.includes('timed out')) {
      return 'Request timed out. Please try again.';
    }
    if (errorStr.includes('server') || errorStr.includes('500') || errorStr.includes('502') || errorStr.includes('503')) {
      return 'Server error. Please try again later.';
    }
    
    return errorStr;
  }, [error]);

  return useMemo(() => ({
    messages: uiMessages,
    isLoading: isSending,
    error: errorText,
    sendMessage,
    clearChat,
    userContext: {
        profile: goalStore.profile,
        currentGoal: goalStore.currentGoal,
    }
  }), [uiMessages, isSending, errorText, sendMessage, clearChat, goalStore.profile, goalStore.currentGoal]);
});
