import createContextHook from '@nkzw/create-context-hook';
import { useRorkAgent, createRorkTool } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import { useGoalStore } from '@/hooks/use-goal-store';
import { ChatMessage } from '@/types/chat';
import { useMemo, useEffect, useCallback, useState } from 'react';

export const [ChatProvider, useChat] = createContextHook(() => {
  const goalStore = useGoalStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { messages, sendMessage: rorkSendMessage, setMessages } = useRorkAgent({
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

  const sendMessage = useCallback(async (text: string) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('[Chat] Sending message:', text.substring(0, 50) + '...');
      await rorkSendMessage(text);
      console.log('[Chat] Message sent successfully');
    } catch (err) {
      console.error('[Chat] Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Ошибка при отправке сообщения');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [rorkSendMessage]);

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

  return useMemo(() => ({
    messages: uiMessages,
    isLoading,
    error,
    sendMessage,
    clearChat,
    userContext: {
        profile: goalStore.profile,
        currentGoal: goalStore.currentGoal,
    }
  }), [uiMessages, isLoading, error, sendMessage, clearChat, goalStore.profile, goalStore.currentGoal]);
});
