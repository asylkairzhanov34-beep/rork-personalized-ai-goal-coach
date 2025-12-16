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
        description: 'Добавить новую задачу в план пользователя. Используй когда пользователь просит добавить задачу или создать что-то в плане.',
        zodSchema: z.object({
          title: z.string().describe('Title of the task'),
          description: z.string().describe('Detailed description'),
          date: z.string().describe('Date for the task (ISO format)'),
          priority: z.enum(['high', 'medium', 'low']).optional().describe('Priority level'),
          duration: z.string().optional().describe('Estimated duration (e.g., "30 min")'),
          difficulty: z.enum(['easy', 'medium', 'hard']).optional().describe('Difficulty level'),
          estimatedTime: z.number().optional().describe('Estimated time in minutes'),
        }),
        execute: async (input) => {
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
          return `Задача "${input.title}" успешно добавлена в план на ${new Date(input.date).toLocaleDateString('ru-RU')}`;
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
        description: 'Получить задачи для определенного периода или все активные задачи. Используй перед добавлением или изменением задач чтобы понять текущий план.',
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
          return JSON.stringify(tasks.map(t => ({
            id: t.id,
            title: t.title,
            description: t.description,
            date: t.date,
            completed: t.completed,
            priority: t.priority,
            difficulty: t.difficulty,
            estimatedTime: t.estimatedTime
          })));
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
    
    context += `\nСтатистика задач:\n`;
    context += `- Всего задач: ${tasks.length}\n`;
    context += `- Выполнено: ${completedTasks.length}\n`;
    context += `- В процессе: ${pendingTasks.length}\n`;
    
    if (todayTasks.length > 0) {
      context += `\nЗадачи на сегодня (${todayTasks.length}):\n`;
      todayTasks.forEach((t, i) => {
        context += `${i + 1}. [${t.completed ? '✓' : '○'}] "${t.title}" (ID: ${t.id}, приоритет: ${t.priority || 'medium'})\n`;
      });
    } else {
      context += `\nНа сегодня задач нет.\n`;
    }
    
    if (upcomingTasks.length > 0 && upcomingTasks.length <= 10) {
      context += `\nБлижайшие задачи на неделю:\n`;
      upcomingTasks.slice(0, 10).forEach((t, i) => {
        const taskDate = new Date(t.date).toLocaleDateString('ru-RU');
        context += `${i + 1}. [${t.completed ? '✓' : '○'}] "${t.title}" - ${taskDate} (ID: ${t.id})\n`;
      });
    }
    
    context += `\nКРИТИЧЕСКИЕ ИНСТРУКЦИИ:\n`;
    context += `1. НИКОГДА не удаляй существующие задачи - только добавляй новые через addTask\n`;
    context += `2. При добавлении задачи используй addTask - она ДОБАВЛЯЕТ к существующим, НЕ заменяет их\n`;
    context += `3. deleteTask используй ТОЛЬКО если пользователь ЯВНО попросил удалить конкретную задачу\n`;
    context += `4. Дата должна быть в ISO формате (YYYY-MM-DD), например: ${todayStr}\n`;
    context += `5. Отвечай кратко и по делу на русском языке\n`;
    context += `6. Если нужно обновить задачу - используй updateTask с правильным taskId\n`;
    context += `]\n\n`;
    
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
            text = text.replace(/^\[SYSTEM:.*?\]\s*/s, '');
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
