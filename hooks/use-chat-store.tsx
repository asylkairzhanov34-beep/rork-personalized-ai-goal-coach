import createContextHook from '@nkzw/create-context-hook';
import { useRorkAgent, createRorkTool } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import { useGoalStore } from '@/hooks/use-goal-store';
import { ChatMessage } from '@/types/chat';
import { useMemo, useEffect, useCallback, useState, useRef } from 'react';
import { Platform } from 'react-native';

const getToolkitConfig = () => {
  const toolkitUrl = process.env.EXPO_PUBLIC_TOOLKIT_URL || 'https://toolkit.rork.com';
  const projectId = process.env.EXPO_PUBLIC_PROJECT_ID || '';
  
  return { toolkitUrl, projectId };
};

export const [ChatProvider, useChat] = createContextHook(() => {
  const goalStore = useGoalStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const lastUserMessageRef = useRef<string>('');
  const configRef = useRef(getToolkitConfig());

  useEffect(() => {
    const cfg = configRef.current;
    const isHermes = !!(global as any)?.HermesInternal;

    console.log('[ChatStore] ========== Initialization ==========');
    console.log('[ChatStore] Platform:', Platform.OS);
    console.log('[ChatStore] Hermes:', isHermes);
    console.log('[ChatStore] Toolkit URL:', cfg.toolkitUrl);
    console.log('[ChatStore] Project ID:', cfg.projectId || 'NOT SET');
    console.log('[ChatStore] Tasks loaded:', goalStore.dailyTasks?.length || 0);
    console.log('[ChatStore] ENV EXPO_PUBLIC_TOOLKIT_URL:', process.env.EXPO_PUBLIC_TOOLKIT_URL || 'undefined');
    console.log('[ChatStore] =====================================');
  }, [goalStore.dailyTasks?.length]);

  const { messages, error: agentError, sendMessage: rorkSendMessage, setMessages } = useRorkAgent({
    tools: {
      getTasks: createRorkTool({
        description: 'Get list of all user tasks (read-only)',
        zodSchema: z.object({
          filter: z.enum(['all', 'today', 'week', 'completed', 'pending']).optional().describe('Filter tasks'),
        }),
        execute: async (input) => {
          console.log('[ChatStore] getTasks called with:', input);
          const tasks = goalStore.dailyTasks || [];
          const today = new Date().toISOString().split('T')[0];
          
          let filtered = tasks;
          if (input.filter === 'today') {
            filtered = tasks.filter(t => t.date?.startsWith(today));
          } else if (input.filter === 'completed') {
            filtered = tasks.filter(t => t.completed);
          } else if (input.filter === 'pending') {
            filtered = tasks.filter(t => !t.completed);
          } else if (input.filter === 'week') {
            const weekFromNow = new Date();
            weekFromNow.setDate(weekFromNow.getDate() + 7);
            filtered = tasks.filter(t => {
              const taskDate = new Date(t.date);
              return taskDate >= new Date() && taskDate <= weekFromNow;
            });
          }
          
          return JSON.stringify({
            count: filtered.length,
            tasks: filtered.slice(0, 20).map(t => ({
              title: t.title,
              date: t.date,
              completed: t.completed,
              priority: t.priority || 'medium',
            }))
          });
        },
      }),
      getProgress: createRorkTool({
        description: 'Get user productivity statistics and progress',
        zodSchema: z.object({}),
        execute: async () => {
          console.log('[ChatStore] getProgress called');
          const tasks = goalStore.dailyTasks || [];
          const total = tasks.length;
          const completed = tasks.filter(t => t.completed).length;
          const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
          
          return JSON.stringify({
            totalTasks: total,
            completedTasks: completed,
            completionRate: rate + '%',
            currentStreak: goalStore.profile?.currentStreak || 0,
            currentGoal: goalStore.currentGoal?.title || 'No goal set',
          });
        },
      }),
    },
  });

  const buildSystemPrompt = useCallback(() => {
    const tasks = goalStore.dailyTasks || [];
    const profile = goalStore.profile;
    const currentGoal = goalStore.currentGoal;
    const today = new Date().toISOString().split('T')[0];
    
    const todayTasks = tasks.filter(t => t.date?.startsWith(today));
    const completedToday = todayTasks.filter(t => t.completed).length;
    const totalCompleted = tasks.filter(t => t.completed).length;
    
    let prompt = `You are GoalForge AI - a friendly productivity coach. Today: ${today}.\n\n`;
    prompt += `RULES:\n`;
    prompt += `- You are an ADVISOR ONLY - you CANNOT modify tasks\n`;
    prompt += `- Give motivation, tips, and analyze progress\n`;
    prompt += `- If user asks to add/edit/delete tasks, explain they need to use the app interface\n`;
    prompt += `- Be concise and helpful\n`;
    prompt += `- Always respond in English\n\n`;
    
    if (currentGoal) {
      prompt += `User's Goal: "${currentGoal.title}"\n`;
    }
    
    prompt += `\nStats: ${tasks.length} total tasks, ${totalCompleted} completed`;
    if (profile?.currentStreak) {
      prompt += `, ${profile.currentStreak} day streak`;
    }
    prompt += `\n`;
    
    if (todayTasks.length > 0) {
      prompt += `\nToday (${completedToday}/${todayTasks.length} done):\n`;
      todayTasks.slice(0, 5).forEach((t, i) => {
        prompt += `${t.completed ? '✓' : '○'} ${t.title}\n`;
      });
      if (todayTasks.length > 5) {
        prompt += `...and ${todayTasks.length - 5} more\n`;
      }
    }
    
    return prompt;
  }, [goalStore.dailyTasks, goalStore.profile, goalStore.currentGoal]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const trimmed = text.trim();
    const cfg = configRef.current;

    console.log('[ChatStore] sendMessage called:', trimmed.substring(0, 50));
    console.log('[ChatStore] Config:', {
      toolkitUrl: cfg.toolkitUrl,
      projectId: cfg.projectId ? 'SET' : 'NOT SET',
      platform: Platform.OS,
    });

    setChatError(null);
    setIsProcessing(true);
    lastUserMessageRef.current = trimmed;

    try {
      const systemPrompt = buildSystemPrompt();
      const fullMessage = `[SYSTEM]\n${systemPrompt}\n[/SYSTEM]\n\nUser: ${trimmed}`;

      console.log('[ChatStore] Sending to Rork agent...');
      console.log('[ChatStore] Message length:', fullMessage.length);

      const timeoutMs = 30000;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('Request timed out. Please check your internet connection.'));
        }, timeoutMs);
      });

      try {
        await Promise.race([rorkSendMessage(fullMessage), timeoutPromise]);
        console.log('[ChatStore] Message sent successfully');
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    } catch (e: unknown) {
      const err = e as any;
      let message: string = 'Failed to send message';
      
      if (err?.message) {
        message = err.message;
      } else if (typeof err === 'string') {
        message = err;
      }

      console.error('[ChatStore] sendMessage error:', message);
      console.error('[ChatStore] Error type:', typeof err);
      console.error('[ChatStore] Error details:', JSON.stringify(err, null, 2));

      setChatError(message);
    } finally {
      setIsProcessing(false);
    }
  }, [rorkSendMessage, buildSystemPrompt]);

  const clearChat = useCallback(() => {
    console.log('[ChatStore] Clearing chat');
    setMessages([]);
    setChatError(null);
  }, [setMessages]);

  const uiMessages: ChatMessage[] = useMemo(() => {
    console.log('[ChatStore] Processing messages, count:', messages.length);
    
    return messages.map((m, idx) => {
      let text = '';
      
      if (Array.isArray(m.parts)) {
        const textParts = m.parts.filter((p: any) => p.type === 'text');
        text = textParts.map((p: any) => p.text || '').join('');
        
        const toolParts = m.parts.filter((p: any) => p.type === 'tool');
        if (text === '' && toolParts.length > 0) {
          const states = toolParts.map((p: any) => p.state);
          if (states.includes('output-available')) {
            text = '';
          } else {
            text = 'Analyzing...';
          }
        }
      } else if (typeof (m as any).content === 'string') {
        text = (m as any).content;
      }
      
      if (m.role === 'user') {
        text = text.replace(/^\[SYSTEM\][\s\S]*?\[\/SYSTEM\]\s*/i, '');
        text = text.replace(/^User:\s*/i, '');
      }
      
      text = text.trim();
      
      if (!text && m.role === 'user') {
        text = lastUserMessageRef.current;
      }
      
      return {
        id: m.id || `msg-${idx}`,
        text: text,
        isBot: m.role === 'assistant',
        timestamp: new Date(),
      };
    }).filter(m => m.text.length > 0);
  }, [messages]);

  const errorText = useMemo(() => {
    const err = chatError || agentError;
    if (!err) return null;
    
    const message = typeof err === 'string' ? err : (err as any)?.message || 'Unknown error';
    console.log('[ChatStore] Error:', message);
    
    if (message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    if (message.includes('fetch') || message.includes('network') || message.includes('Network')) {
      return 'Connection error. Please check your internet connection.';
    }
    if (message.includes('not configured')) {
      return 'AI service is not configured. Please reinstall or contact support.';
    }
    if (message.includes('500') || message.includes('502') || message.includes('503')) {
      return 'Server is temporarily unavailable. Please try again later.';
    }
    
    return 'Something went wrong. Please try again.';
  }, [chatError, agentError]);

  return useMemo(() => ({
    messages: uiMessages,
    isLoading: isProcessing,
    error: errorText,
    sendMessage,
    clearChat,
  }), [uiMessages, isProcessing, errorText, sendMessage, clearChat]);
});
