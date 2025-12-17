import createContextHook from '@nkzw/create-context-hook';
import { useRorkAgent, createRorkTool, generateText } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import { useGoalStore } from '@/hooks/use-goal-store';
import { ChatMessage } from '@/types/chat';
import { useMemo, useEffect, useCallback, useState } from 'react';

type AiStatus = 'checking' | 'online' | 'offline';

type ChatUserContext = {
  profile: unknown;
  currentGoal: unknown;
};

export const [ChatProvider, useChat] = createContextHook(() => {
  const goalStore = useGoalStore();

  useEffect(() => {
    console.log('[ChatStore] ========== Environment Check ==========');
    console.log('[ChatStore] Toolkit URL:', process.env.EXPO_PUBLIC_TOOLKIT_URL || 'NOT SET');
    console.log('[ChatStore] Project ID:', process.env.EXPO_PUBLIC_PROJECT_ID || 'NOT SET');
    console.log('[ChatStore] Team ID:', process.env.EXPO_PUBLIC_TEAM_ID || 'NOT SET');
    console.log('[ChatStore] API Base URL:', process.env.EXPO_PUBLIC_RORK_API_BASE_URL || 'NOT SET');
    console.log('[ChatStore] ============================================');
  }, []);

  const { messages, error, sendMessage: rorkSendMessage, setMessages } = useRorkAgent({
    tools: {
      getTasks: createRorkTool({
        description: 'Get list of all user tasks. This function only retrieves tasks, does NOT modify them.',
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
          const summary = `Found ${tasks.length} tasks:\n`;
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
        description: 'Get execution history for the last 90 days for productivity analysis and personalized recommendations',
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
  const [aiStatus, setAiStatus] = useState<AiStatus>('checking');
  const [aiStatusError, setAiStatusError] = useState<string | null>(null);

  const refreshAiStatus = useCallback(async (): Promise<AiStatus> => {
    console.log('[ChatStore] Checking AI connectivity...');
    setAiStatus('checking');
    setAiStatusError(null);

    try {
      const res = await generateText({
        messages: [
          {
            role: 'user',
            content: 'Respond with a single word: OK',
          },
        ],
      });

      console.log('[ChatStore] AI health-check response:', String(res).slice(0, 60));
      setAiStatus('online');
      setAiStatusError(null);
      return 'online';
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[ChatStore] AI health-check failed:', msg);
      setAiStatus('offline');
      setAiStatusError(msg);
      return 'offline';
    }
  }, []);

  useEffect(() => {
    refreshAiStatus();
  }, [refreshAiStatus]);

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
    
    let context = `[SYSTEM: You are GoalForge AI - a smart productivity coach. Current date: ${todayStr}.\n`;
    context += `You are an ADVISOR ONLY. You CANNOT modify, add, edit, or delete any tasks.\n`;
    context += `Your role is to: give advice, analyze progress, suggest strategies, motivate, and answer questions.\n`;
    context += `Always respond in English.\n`;
    
    if (currentGoal) {
      context += `\nUser's current goal: "${currentGoal.title}"\n`;
      if (currentGoal.description) {
        context += `Goal description: ${currentGoal.description}\n`;
      }
    }
    
    if (profile) {
      context += `\nProfile: ${profile.currentStreak} day streak\n`;
    }
    
    context += `\n📊 TASK STATISTICS:\n`;
    context += `- Total tasks: ${tasks.length}\n`;
    context += `- Completed: ${completedTasks.length}\n`;
    context += `- Pending: ${pendingTasks.length}\n`;
    
    if (todayTasks.length > 0) {
      context += `\n📋 Today's tasks (${todayTasks.length}):\n`;
      todayTasks.forEach((t, i) => {
        context += `${i + 1}. [${t.completed ? '✓' : '○'}] "${t.title}" (ID: ${t.id}, priority: ${t.priority || 'medium'})\n`;
      });
    } else {
      context += `\nNo tasks for today.\n`;
    }
    
    if (upcomingTasks.length > 0 && upcomingTasks.length <= 10) {
      context += `\n🗓 Upcoming tasks this week (${upcomingTasks.length}):\n`;
      upcomingTasks.slice(0, 10).forEach((t, i) => {
        const taskDate = new Date(t.date).toLocaleDateString('en-US');
        context += `${i + 1}. [${t.completed ? '✓' : '○'}] "${t.title}" - ${taskDate} (ID: ${t.id})\n`;
      });
    }
    
    context += `\n⚠️ IMPORTANT RULES:\n`;
    context += `- You are ONLY an advisor - you CANNOT modify any tasks\n`;
    context += `- You can view tasks using getTasks (read-only)\n`;
    context += `- You can analyze progress using getHistory\n`;
    context += `- If user asks to add/edit/delete/complete tasks, politely explain that you can only give advice\n`;
    context += `- Tell them to use the app interface to manage tasks\n`;
    context += `- Focus on: motivation, productivity tips, time management advice, goal strategies\n`;
    context += `- Be helpful, friendly, and concise\n`;
    context += `[/END_SYSTEM]\n\n`;
    
    return context;
  }, [goalStore.dailyTasks, goalStore.profile, goalStore.currentGoal]);

  const sendMessage = useCallback(async (text: string) => {
    if (aiStatus !== 'online') {
      console.warn('[ChatStore] sendMessage blocked because AI is not online:', aiStatus);
      const latestStatus = await refreshAiStatus();
      if (latestStatus !== 'online') {
        throw new Error('AI is currently unreachable. Please try again.');
      }
    }

    setIsSending(true);
    try {
      const context = buildSystemContext();
      // Enforce ONLY advisor role, no task modification
      const systemInstruction = `
IMPORTANT: You are GoalForge AI, a productivity advisor.
You CANNOT create, edit, delete, or complete tasks.
If the user asks to modify tasks, politely refuse and explain you are only an advisor.
Focus on giving motivation, strategies, and analyzing the user's progress.
Always answer in English.
`;
      const messageWithContext = systemInstruction + "\n" + context + "\nUser message: " + text;
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
  }, [aiStatus, refreshAiStatus, rorkSendMessage, buildSystemContext, goalStore.dailyTasks]);

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
    
    console.log('[ChatStore] Error object:', error);
    console.log('[ChatStore] Error type:', typeof error);
    
    const message = typeof error === 'string' ? error : (error as any)?.message;
    const errorStr = message ? String(message) : 'Unknown chat error';
    
    console.log('[ChatStore] Error string:', errorStr);
    
    if (errorStr.includes('Не удалось подключиться') || errorStr.includes('fetch failed') || errorStr.includes('network') || errorStr.includes('Failed to fetch')) {
      return 'Connection error. Please check your internet and try again.';
    }
    if (errorStr.includes('timeout') || errorStr.includes('timed out')) {
      return 'Request timed out. Please try again.';
    }
    if (errorStr.includes('server') || errorStr.includes('500') || errorStr.includes('502') || errorStr.includes('503')) {
      return 'Server error. Please try again later.';
    }
    if (errorStr.includes('TOOLKIT_URL') || errorStr.includes('PROJECT_ID')) {
      return 'Configuration error. Please restart the app.';
    }
    
    return errorStr;
  }, [error]);

  const userContext: ChatUserContext = useMemo(() => ({
    profile: goalStore.profile,
    currentGoal: goalStore.currentGoal,
  }), [goalStore.profile, goalStore.currentGoal]);

  return useMemo(() => ({
    messages: uiMessages,
    isLoading: isSending,
    error: errorText,
    sendMessage,
    clearChat,
    aiStatus,
    aiStatusError,
    refreshAiStatus,
    userContext,
  }), [
    uiMessages,
    isSending,
    errorText,
    sendMessage,
    clearChat,
    aiStatus,
    aiStatusError,
    refreshAiStatus,
    userContext,
  ]);
});
