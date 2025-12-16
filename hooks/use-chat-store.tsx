import createContextHook from '@nkzw/create-context-hook';
import { useRorkAgent, createRorkTool } from '@/lib/rork-toolkit';
import { z } from 'zod';
import { useGoalStore } from '@/hooks/use-goal-store';
import { ChatMessage } from '@/types/chat';
import { useMemo, useEffect, useCallback, useState, useRef } from 'react';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

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
  const [localError, setLocalError] = useState<string | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  const checkNetworkConnection = useCallback(async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'web') {
        return navigator.onLine;
      }
      const state = await NetInfo.fetch();
      console.log('[ChatStore] Network state:', state.isConnected, state.isInternetReachable);
      return state.isConnected === true && state.isInternetReachable !== false;
    } catch (e) {
      console.log('[ChatStore] Network check failed, assuming connected:', e);
      return true;
    }
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    setIsSending(true);
    setLocalError(null);
    
    try {
      const isConnected = await checkNetworkConnection();
      if (!isConnected) {
        throw new Error('No internet connection. Please check your network.');
      }

      console.log('[ChatStore] Sending message to agent:', text);
      console.log('[ChatStore] Toolkit URL:', process.env.EXPO_PUBLIC_TOOLKIT_URL);
      console.log('[ChatStore] Current messages count:', messages.length);
      
      retryCountRef.current = 0;
      
      const sendWithRetry = async (): Promise<any> => {
        try {
          const result = await rorkSendMessage(text);
          console.log('[ChatStore] Message sent successfully');
          return result;
        } catch (e: any) {
          retryCountRef.current++;
          console.log(`[ChatStore] Send attempt ${retryCountRef.current} failed:`, e?.message);
          
          if (retryCountRef.current < maxRetries) {
            console.log(`[ChatStore] Retrying in ${retryCountRef.current * 1000}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryCountRef.current * 1000));
            return sendWithRetry();
          }
          throw e;
        }
      };
      
      await sendWithRetry();
    } catch (e: any) {
      console.error('[ChatStore] sendMessage failed after retries:', e);
      console.error('[ChatStore] Error message:', e?.message);
      const errorMsg = e?.message || 'Failed to send message';
      setLocalError(errorMsg);
      throw e;
    } finally {
      setIsSending(false);
    }
  }, [rorkSendMessage, messages.length, checkNetworkConnection]);

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
    const activeError = localError || error;
    if (!activeError) return null;
    
    console.log('[ChatStore] Error detected:', activeError);
    const message = typeof activeError === 'string' ? activeError : (activeError as any)?.message;
    const errorStr = message ? String(message) : 'Unknown error';
    
    if (errorStr.includes('No internet connection')) {
      return 'No internet connection. Please check your network.';
    }
    if (errorStr.includes('Не удалось подключиться') || errorStr.includes('fetch failed') || errorStr.includes('Failed to fetch')) {
      return 'Could not connect to AI server. Please check your internet connection.';
    }
    if (errorStr.includes('Ошибка сети') || errorStr.includes('Network') || errorStr.includes('network')) {
      return 'Network error. Please try again.';
    }
    if (errorStr.includes('Время ожидания') || errorStr.includes('timeout') || errorStr.includes('Timeout')) {
      return 'Request timed out. Please try again.';
    }
    if (errorStr.includes('unauthorized') || errorStr.includes('401') || errorStr.includes('Unauthorized')) {
      return 'Authentication error. Please restart the app.';
    }
    if (errorStr.includes('500') || errorStr.includes('Internal Server Error') || errorStr.includes('server error')) {
      return 'Server error. Please try again in a moment.';
    }
    if (errorStr.includes('429') || errorStr.includes('rate limit') || errorStr.includes('Too Many')) {
      return 'Too many requests. Please wait a moment and try again.';
    }
    if (errorStr.includes('CORS') || errorStr.includes('cors')) {
      return 'Connection blocked. Please try again.';
    }
    
    return 'Could not process your request. Please try again.';
  }, [error, localError]);

  useEffect(() => {
    console.log('[ChatStore] State updated:', {
      messagesCount: uiMessages.length,
      isLoading: isSending,
      hasError: !!errorText,
      error: errorText,
      toolkitUrl: process.env.EXPO_PUBLIC_TOOLKIT_URL,
    });
  }, [uiMessages.length, isSending, errorText]);

  const clearError = useCallback(() => {
    setLocalError(null);
  }, []);

  return useMemo(() => ({
    messages: uiMessages,
    isLoading: isSending,
    error: errorText,
    sendMessage,
    clearChat,
    clearError,
    userContext: {
        profile: goalStore.profile,
        currentGoal: goalStore.currentGoal,
    }
  }), [uiMessages, isSending, errorText, sendMessage, clearChat, clearError, goalStore.profile, goalStore.currentGoal]);
});
