import createContextHook from '@nkzw/create-context-hook';
import { useGoalStore } from '@/hooks/use-goal-store';
import { ChatMessage } from '@/types/chat';
import { useMemo, useEffect, useCallback, useState } from 'react';

type AiStatus = 'checking' | 'online' | 'offline';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export const [ChatProvider, useChat] = createContextHook(() => {
  const goalStore = useGoalStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[ChatStore] ========== Environment Check ==========');
    console.log('[ChatStore] Toolkit URL:', process.env.EXPO_PUBLIC_TOOLKIT_URL || 'NOT SET');
    console.log('[ChatStore] Project ID:', process.env.EXPO_PUBLIC_PROJECT_ID || 'NOT SET');
    console.log('[ChatStore] Team ID:', process.env.EXPO_PUBLIC_TEAM_ID || 'NOT SET');
    console.log('[ChatStore] API Base URL:', process.env.EXPO_PUBLIC_RORK_API_BASE_URL || 'NOT SET');
    console.log('[ChatStore] ============================================');
  }, []);

  const [isSending, setIsSending] = useState<boolean>(false);
  const [aiStatus, setAiStatus] = useState<AiStatus>('checking');
  const [aiStatusError, setAiStatusError] = useState<string | null>(null);

  const refreshAiStatus = useCallback(async (): Promise<AiStatus> => {
    console.log('[ChatStore] Checking AI connectivity...');
    setAiStatus('checking');
    setAiStatusError(null);

    try {
      const toolkitUrl = process.env.EXPO_PUBLIC_TOOLKIT_URL;
      const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
      const teamId = process.env.EXPO_PUBLIC_TEAM_ID;

      if (!toolkitUrl || !projectId) {
        throw new Error('Missing configuration: TOOLKIT_URL or PROJECT_ID');
      }

      console.log('[ChatStore] Testing connection to:', toolkitUrl);
      console.log('[ChatStore] Project ID:', projectId);

      const apiUrl = `${toolkitUrl}/text/generate`;
      console.log('[ChatStore] API URL:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-rork-project-id': projectId,
          ...(teamId ? { 'x-rork-team-id': teamId } : {}),
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Say OK' }],
        }),
      });

      console.log('[ChatStore] Response status:', response.status);
      console.log('[ChatStore] Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ChatStore] Error response body:', errorText);
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[ChatStore] Health check response:', data);

      setAiStatus('online');
      setAiStatusError(null);
      return 'online';
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[ChatStore] AI health-check failed:', msg);
      console.error('[ChatStore] Full error:', e);
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
    setError(null);

    try {
      const toolkitUrl = process.env.EXPO_PUBLIC_TOOLKIT_URL;
      const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
      const teamId = process.env.EXPO_PUBLIC_TEAM_ID;

      if (!toolkitUrl || !projectId) {
        throw new Error('Missing configuration');
      }

      const userMessage: Message = { role: 'user', content: text };
      setMessages(prev => [...prev, userMessage]);

      const context = buildSystemContext();
      const systemInstruction = `You are GoalForge AI, a productivity advisor. You can only give advice and analyze progress. You CANNOT modify tasks. Always answer in English.`;

      const apiMessages: Message[] = [
        { role: 'system', content: systemInstruction + '\n' + context },
        ...messages,
        userMessage,
      ];

      console.log('[ChatStore] Sending', apiMessages.length, 'messages to API');
      console.log('[ChatStore] Latest user message:', text);

      const apiUrl = `${toolkitUrl}/text/generate`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-rork-project-id': projectId,
          ...(teamId ? { 'x-rork-team-id': teamId } : {}),
        },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ChatStore] API error:', response.status, errorText);
        throw new Error(`Failed to send message: ${response.status}`);
      }

      const data = await response.json();
      console.log('[ChatStore] API response:', data);

      const assistantText = typeof data === 'string' ? data : data.text || data.content || 'Sorry, I could not process that.';
      const assistantMessage: Message = { role: 'assistant', content: assistantText };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[ChatStore] sendMessage failed:', msg, e);
      setError(msg);
      throw e;
    } finally {
      setIsSending(false);
    }
  }, [aiStatus, refreshAiStatus, buildSystemContext, messages]);

  const clearChat = useCallback(() => {
    setMessages([]);
  }, [setMessages]);

  const uiMessages: ChatMessage[] = useMemo(() => {
    return messages
      .filter(m => m.role !== 'system')
      .map((m, idx) => ({
        id: `msg-${idx}`,
        text: m.content,
        isBot: m.role === 'assistant',
        timestamp: new Date(),
      }));
  }, [messages]);

  const errorText = useMemo(() => {
    if (!error) return null;
    
    const errorStr = String(error);
    console.log('[ChatStore] Error:', errorStr);
    
    if (errorStr.includes('fetch failed') || errorStr.includes('network') || errorStr.includes('Failed to fetch')) {
      return 'Connection error. Check your internet.';
    }
    if (errorStr.includes('timeout')) {
      return 'Request timed out. Try again.';
    }
    if (errorStr.includes('500') || errorStr.includes('502') || errorStr.includes('503')) {
      return 'Server error. Try again later.';
    }
    if (errorStr.includes('configuration') || errorStr.includes('Missing')) {
      return 'Configuration error. Please restart.';
    }
    
    return errorStr;
  }, [error]);

  return useMemo(() => ({
    messages: uiMessages,
    isLoading: isSending,
    error: errorText,
    sendMessage,
    clearChat,
    aiStatus,
    aiStatusError,
    refreshAiStatus,
  }), [
    uiMessages,
    isSending,
    errorText,
    sendMessage,
    clearChat,
    aiStatus,
    aiStatusError,
    refreshAiStatus,
  ]);
});
