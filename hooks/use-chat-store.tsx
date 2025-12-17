import createContextHook from '@nkzw/create-context-hook';
import { useRorkAgent, createRorkTool } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import { useGoalStore } from '@/hooks/use-goal-store';
import { ChatMessage } from '@/types/chat';
import { getRorkConfig } from '@/lib/rork-config';
import { useMemo, useEffect, useCallback, useState, useRef } from 'react';

export const [ChatProvider, useChat] = createContextHook(() => {
  const goalStore = useGoalStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const lastUserMessageRef = useRef<string>('');

  useEffect(() => {
    const cfg = getRorkConfig();
    const isHermes = !!(global as any)?.HermesInternal;

    console.log('[ChatStore] ========== Initialization ==========');
    console.log('[ChatStore] Platform:', typeof window === 'undefined' ? 'native' : 'web');
    console.log('[ChatStore] Hermes:', isHermes);
    console.log('[ChatStore] Toolkit URL:', cfg.toolkitUrl || 'NOT SET');
    console.log('[ChatStore] Project ID:', cfg.projectId || 'NOT SET');
    console.log('[ChatStore] Tasks loaded:', goalStore.dailyTasks?.length || 0);
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
    const cfg = getRorkConfig();

    console.log('[ChatStore] sendMessage called:', trimmed);
    console.log('[ChatStore] Env check:', {
      toolkitUrlSet: !!cfg.toolkitUrl,
      projectIdSet: !!cfg.projectId,
      baseUrlSet: !!process.env.EXPO_PUBLIC_RORK_API_BASE_URL,
    });

    setChatError(null);
    setIsProcessing(true);
    lastUserMessageRef.current = trimmed;

    const probeConnectivity = async () => {
      if (!cfg.toolkitUrl) return;

      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 8000);

      try {
        console.log('[ChatStore] Connectivity probe ->', cfg.toolkitUrl);
        const res = await fetch(cfg.toolkitUrl, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        console.log('[ChatStore] Connectivity probe status:', res.status);
      } catch (e) {
        console.error('[ChatStore] Connectivity probe failed:', e);
        throw new Error('network');
      } finally {
        clearTimeout(id);
      }
    };

    try {
      if (!cfg.toolkitUrl || !cfg.projectId) {
        throw new Error('AI service is not configured');
      }

      await probeConnectivity();

      const systemPrompt = buildSystemPrompt();
      const fullMessage = `[SYSTEM]\n${systemPrompt}\n[/SYSTEM]\n\nUser: ${trimmed}`;

      console.log('[ChatStore] Sending to Rork agent...');

      const timeoutMs = 25000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        const id2 = setTimeout(() => {
          clearTimeout(id2);
          reject(new Error('timeout'));
        }, timeoutMs);
      });

      await Promise.race([rorkSendMessage(fullMessage), timeoutPromise]);

      console.log('[ChatStore] Message sent successfully');
    } catch (e: unknown) {
      const err = e as any;
      const message: string = err?.message || 'Failed to send message';

      console.error('[ChatStore] sendMessage error (raw):', err);
      console.error('[ChatStore] sendMessage error (message):', message);
      console.error('[ChatStore] sendMessage error (stack):', err?.stack);

      setChatError(message);
      throw e;
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
      return 'Connection error. Please check your internet connection and try again.';
    }
    if (message.trim() === 'network') {
      return 'Connection error. Please check your internet connection and try again.';
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
