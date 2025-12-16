import createContextHook from '@nkzw/create-context-hook';
import { useRorkAgent, createRorkTool } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import { useGoalStore } from '@/hooks/use-goal-store';
import { ChatMessage } from '@/types/chat';
import { useMemo, useEffect, useCallback, useState, useRef } from 'react';

export const [ChatProvider, useChat] = createContextHook(() => {
  const goalStore = useGoalStore();
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  console.log('[ChatStore] Initializing chat...');
  console.log('[ChatStore] EXPO_PUBLIC_TOOLKIT_URL:', process.env.EXPO_PUBLIC_TOOLKIT_URL);
  console.log('[ChatStore] EXPO_PUBLIC_PROJECT_ID:', process.env.EXPO_PUBLIC_PROJECT_ID);

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
  const lastMessageRef = useRef<string | null>(null);

  const sendMessage = useCallback(async (text: string) => {
    setIsSending(true);
    retryCountRef.current = 0;
    lastMessageRef.current = text;
    
    const attemptSend = async (): Promise<void> => {
      try {
        console.log('[ChatStore] Sending message to agent:', text);
        console.log('[ChatStore] Current messages count:', messages.length);
        console.log('[ChatStore] Toolkit URL:', process.env.EXPO_PUBLIC_TOOLKIT_URL);
        console.log('[ChatStore] Attempt:', retryCountRef.current + 1);
        
        const systemContext = `[SYSTEM: User profile - Name: ${goalStore.profile.name}, Current Goal: ${goalStore.currentGoal?.title || 'None'}, Active Streak: ${goalStore.profile.currentStreak} days]\n\n${text}`;
        console.log('[ChatStore] Sending with context:', systemContext.substring(0, 100));
        
        await rorkSendMessage(systemContext);
        console.log('[ChatStore] Message sent successfully');
        retryCountRef.current = 0;
      } catch (e) {
        console.error('[ChatStore] sendMessage failed:', e);
        
        let errorMessage = 'Unknown error';
        try {
          errorMessage = JSON.stringify(e, null, 2);
        } catch {
          errorMessage = String(e);
        }
        console.error('[ChatStore] Error details:', errorMessage);
        
        if (e instanceof Error) {
          console.error('[ChatStore] Error message:', e.message);
          console.error('[ChatStore] Error stack:', e.stack);
          
          // Don't retry on parsing errors - they won't fix themselves
          const isSyntaxError = e.message.includes('SyntaxError') || 
                               e.message.includes("';' expected") ||
                               e.message.includes('Unexpected token') ||
                               e.name === 'SyntaxError';
          if (isSyntaxError) {
            console.log('[ChatStore] Syntax/parsing error detected, not retrying');
            throw e;
          }
        }
        
        retryCountRef.current++;
        if (retryCountRef.current < maxRetries) {
          console.log(`[ChatStore] Retrying... Attempt ${retryCountRef.current + 1}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCountRef.current));
          return attemptSend();
        }
        
        throw e;
      }
    };
    
    try {
      await attemptSend();
    } finally {
      setIsSending(false);
    }
  }, [rorkSendMessage, messages.length, goalStore.profile, goalStore.currentGoal]);

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

  const retryLastMessage = useCallback(async () => {
    if (lastMessageRef.current) {
      console.log('[ChatStore] Retrying last message:', lastMessageRef.current);
      await sendMessage(lastMessageRef.current);
    }
  }, [sendMessage]);

  useEffect(() => {
    if (error) {
      console.log('[ChatStore] useRorkAgent error detected:', error);
      console.log('[ChatStore] Error type:', typeof error);
      console.log('[ChatStore] Error details:', JSON.stringify(error, null, 2));
    }
  }, [error]);

  const errorText = useMemo(() => {
    if (!error) return null;
    
    console.log('[ChatStore] Processing error:', error);
    
    const message = typeof error === 'string' ? error : (error as any)?.message;
    const errorStr = message ? String(message) : 'Unknown error';
    
    console.log('[ChatStore] Processed error message:', errorStr);
    
    // SyntaxError / JSON parsing errors
    if (errorStr.toLowerCase().includes('syntaxerror') || 
        errorStr.includes("';' expected") ||
        errorStr.toLowerCase().includes('unexpected token') ||
        errorStr.toLowerCase().includes('json parse') ||
        errorStr.toLowerCase().includes('json.parse')) {
      return 'AI service temporarily unavailable. Please try again.';
    }
    
    if (errorStr.toLowerCase().includes('fetch failed') || 
        errorStr.toLowerCase().includes('failed to fetch') ||
        errorStr.toLowerCase().includes('не удалось подключиться') ||
        errorStr.toLowerCase().includes('could not connect') ||
        errorStr.toLowerCase().includes('networkerror')) {
      return 'Could not connect to AI server. Please check your internet connection.';
    }
    if (errorStr.toLowerCase().includes('network') || errorStr.toLowerCase().includes('ошибка сети')) {
      return 'Network error. Please try again.';
    }
    if (errorStr.toLowerCase().includes('timeout') || errorStr.toLowerCase().includes('время ожидания')) {
      return 'Request timed out. Please try again.';
    }
    if (errorStr.toLowerCase().includes('unauthorized') || errorStr.toLowerCase().includes('401')) {
      return 'Authentication required. Please check your subscription.';
    }
    if (errorStr.toLowerCase().includes('forbidden') || errorStr.toLowerCase().includes('403')) {
      return 'Access denied. Premium subscription required.';
    }
    if (errorStr.toLowerCase().includes('500') || errorStr.toLowerCase().includes('server error')) {
      return 'Server error. Please try again later.';
    }
    
    return 'Something went wrong. Please try again.';
  }, [error]);

  useEffect(() => {
    console.log('[ChatStore] State update - Messages:', uiMessages.length, 'Loading:', isSending, 'Error:', !!errorText);
  }, [uiMessages.length, isSending, errorText]);

  return useMemo(() => ({
    messages: uiMessages,
    isLoading: isSending,
    error: errorText,
    sendMessage,
    clearChat,
    retryLastMessage: lastMessageRef.current ? retryLastMessage : undefined,
    userContext: {
        profile: goalStore.profile,
        currentGoal: goalStore.currentGoal,
    }
  }), [uiMessages, isSending, errorText, sendMessage, clearChat, retryLastMessage, goalStore.profile, goalStore.currentGoal]);
});
