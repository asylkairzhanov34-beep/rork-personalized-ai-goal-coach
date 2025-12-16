import createContextHook from '@nkzw/create-context-hook';
import { useRorkAgent, createRorkTool } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import { useGoalStore } from '@/hooks/use-goal-store';
import { ChatMessage } from '@/types/chat';
import { useMemo, useEffect, useCallback, useState } from 'react';

export const [ChatProvider, useChat] = createContextHook(() => {
  const goalStore = useGoalStore();

  console.log('[ChatStore] Initializing chat store');
  console.log('[ChatStore] Toolkit URL:', process.env.EXPO_PUBLIC_TOOLKIT_URL);

  const { messages, error, sendMessage: rorkSendMessage, setMessages } = useRorkAgent({
    tools: {
      addTask: createRorkTool({
        description: 'Add a new task to the user plan. Use when the user asks to add a task or create something in the plan.',
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
          return `Task "${input.title}" successfully added to plan for ${new Date(input.date).toLocaleDateString('en-US')}`;
        },
      }),
      updateTask: createRorkTool({
        description: 'Update an existing task. Use for changing status, title, or other parameters.',
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
           return `Task updated successfully.`;
        },
      }),
      deleteTask: createRorkTool({
        description: 'Delete a task from the schedule',
        zodSchema: z.object({
          taskId: z.string().describe('ID of the task to delete'),
        }),
        execute: async (input) => {
          goalStore.deleteTask(input.taskId);
          return `Task deleted successfully.`;
        },
      }),
      getTasks: createRorkTool({
        description: 'Get tasks for a specific period or all active tasks. Use before adding or modifying tasks to understand the current plan.',
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
        description: 'Get completion history for the last 90 days for productivity analysis and personalized recommendations',
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

  const sendMessage = useCallback(async (text: string) => {
    setIsSending(true);
    try {
      console.log('[ChatStore] Sending message to agent:', text);
      console.log('[ChatStore] Current messages count:', messages.length);
      console.log('[ChatStore] Toolkit URL:', process.env.EXPO_PUBLIC_TOOLKIT_URL);
      
      const result = await rorkSendMessage(text);
      console.log('[ChatStore] Message sent successfully, result:', result);
    } catch (e: any) {
      console.error('[ChatStore] sendMessage failed:', e);
      console.error('[ChatStore] Error name:', e?.name);
      console.error('[ChatStore] Error message:', e?.message);
      console.error('[ChatStore] Error stack:', e?.stack);
      
      if (e?.message && typeof e.message === 'string') {
        if (e.message.includes('SyntaxError')) {
          console.error('[ChatStore] SYNTAX ERROR DETECTED - Response parsing failed');
          throw new Error('Failed to process AI response. Please try again.');
        }
      }
      
      throw e;
    } finally {
      setIsSending(false);
    }
  }, [rorkSendMessage, messages.length]);

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
                 text = 'Processing...'; 
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
    console.log('[ChatStore] Error detected:', error);
    const message = typeof error === 'string' ? error : (error as any)?.message;
    const errorStr = message ? String(message) : 'Unknown chat error';
    
    if (errorStr.includes('SyntaxError') || errorStr.includes('parsing') || errorStr.includes('expected')) {
      return 'Failed to process AI response. Please try again.';
    }
    if (errorStr.includes('Не удалось подключиться') || errorStr.includes('fetch failed')) {
      return 'Could not connect to AI server. Please check your internet connection.';
    }
    if (errorStr.includes('Ошибка сети') || errorStr.includes('Network')) {
      return 'Network error. Please try again.';
    }
    if (errorStr.includes('Время ожидания') || errorStr.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    if (errorStr.includes('unauthorized') || errorStr.includes('401')) {
      return 'Authentication error. Please try restarting the app.';
    }
    if (errorStr.includes('500') || errorStr.includes('Internal Server Error')) {
      return 'Server error. Please try again in a moment.';
    }
    
    return 'An error occurred. Please try again.';
  }, [error]);

  useEffect(() => {
    console.log('[ChatStore] State updated:', {
      messagesCount: uiMessages.length,
      isLoading: isSending,
      hasError: !!errorText,
      error: errorText,
    });
  }, [uiMessages.length, isSending, errorText]);

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
