import createContextHook from '@nkzw/create-context-hook';
import { useGoalStore } from '@/hooks/use-goal-store';
import { ChatMessage } from '@/types/chat';
import { useMemo, useEffect, useCallback, useState, useRef } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getOpenAIConfig = () => {
  const extra = Constants.expoConfig?.extra || {};
  
  const apiKey = 
    process.env.OPENAI_API_KEY || 
    extra.OPENAI_API_KEY;
  
  console.log('[ChatStore] OpenAI Config:');
  console.log('  - API Key:', apiKey ? 'SET (length: ' + apiKey.length + ')' : 'NOT SET');
  console.log('  - From env:', !!process.env.OPENAI_API_KEY);
  console.log('  - From extra:', !!extra.OPENAI_API_KEY);
  
  return { apiKey };
};

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const [ChatProvider, useChat] = createContextHook(() => {
  const goalStore = useGoalStore();
  const [messages, setMessages] = useState<OpenAIMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const lastUserMessageRef = useRef<string>('');
  const configRef = useRef(getOpenAIConfig());

  useEffect(() => {
    const cfg = configRef.current;
    const isHermes = !!(global as any)?.HermesInternal;

    console.log('[ChatStore] ========== Initialization ==========');
    console.log('[ChatStore] Platform:', Platform.OS);
    console.log('[ChatStore] Hermes:', isHermes);
    console.log('[ChatStore] OpenAI API Key:', cfg.apiKey ? 'CONFIGURED' : 'NOT SET');
    console.log('[ChatStore] Tasks loaded:', goalStore.dailyTasks?.length || 0);
    console.log('[ChatStore] =====================================');
  }, [goalStore.dailyTasks?.length]);

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
    prompt += `- Be concise and helpful (2-4 sentences max unless detailed analysis requested)\n`;
    prompt += `- Always respond in English\n`;
    prompt += `- Use friendly, encouraging tone\n\n`;
    
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
      todayTasks.slice(0, 5).forEach((t) => {
        prompt += `${t.completed ? '✓' : '○'} ${t.title}\n`;
      });
      if (todayTasks.length > 5) {
        prompt += `...and ${todayTasks.length - 5} more\n`;
      }
    }
    
    return prompt;
  }, [goalStore.dailyTasks, goalStore.profile, goalStore.currentGoal]);

  const callOpenAI = useCallback(async (messages: OpenAIMessage[]): Promise<string> => {
    const cfg = configRef.current;
    
    if (!cfg.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('[ChatStore] Calling OpenAI API...');
    console.log('[ChatStore] Messages count:', messages.length);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ChatStore] OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('[ChatStore] OpenAI response received');
    
    return data.choices[0]?.message?.content || 'No response';
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const trimmed = text.trim();
    const cfg = configRef.current;

    console.log('[ChatStore] sendMessage called:', trimmed.substring(0, 50));
    console.log('[ChatStore] API Key configured:', !!cfg.apiKey);

    if (!cfg.apiKey) {
      setChatError('API key not configured. Please contact support.');
      return;
    }

    setChatError(null);
    setIsProcessing(true);
    lastUserMessageRef.current = trimmed;

    const userMessage: OpenAIMessage = {
      role: 'user',
      content: trimmed,
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      const systemPrompt = buildSystemPrompt();
      
      const messagesToSend: OpenAIMessage[] = [
        { role: 'system', content: systemPrompt },
        ...messages.slice(-10),
        userMessage,
      ];

      console.log('[ChatStore] Sending to OpenAI...');

      const timeoutMs = 30000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Request timed out. Please check your internet connection.'));
        }, timeoutMs);
      });

      const assistantResponse = await Promise.race([
        callOpenAI(messagesToSend),
        timeoutPromise,
      ]);

      console.log('[ChatStore] Response received successfully');

      const assistantMessage: OpenAIMessage = {
        role: 'assistant',
        content: assistantResponse,
      };

      setMessages(prev => [...prev, assistantMessage]);
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
      
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsProcessing(false);
    }
  }, [messages, buildSystemPrompt, callOpenAI]);

  const clearChat = useCallback(() => {
    console.log('[ChatStore] Clearing chat');
    setMessages([]);
    setChatError(null);
  }, [setMessages]);

  const uiMessages: ChatMessage[] = useMemo(() => {
    console.log('[ChatStore] Processing messages, count:', messages.length);
    
    return messages
      .filter(m => m.role !== 'system')
      .map((m, idx) => {
        return {
          id: `msg-${idx}`,
          text: m.content,
          isBot: m.role === 'assistant',
          timestamp: new Date(),
        };
      })
      .filter(m => m.text.length > 0);
  }, [messages]);

  const errorText = useMemo(() => {
    if (!chatError) return null;
    
    const message = typeof chatError === 'string' ? chatError : (chatError as any)?.message || 'Unknown error';
    console.log('[ChatStore] Error:', message);
    
    if (message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    if (message.includes('fetch') || message.includes('network') || message.includes('Network')) {
      return 'Connection error. Please check your internet connection.';
    }
    if (message.includes('not configured')) {
      return 'AI service is not configured. Please contact support.';
    }
    if (message.includes('401')) {
      return 'API authentication error. Please contact support.';
    }
    if (message.includes('429')) {
      return 'Rate limit exceeded. Please try again in a moment.';
    }
    if (message.includes('500') || message.includes('502') || message.includes('503')) {
      return 'Server is temporarily unavailable. Please try again later.';
    }
    
    return 'Something went wrong. Please try again.';
  }, [chatError]);

  return useMemo(() => ({
    messages: uiMessages,
    isLoading: isProcessing,
    error: errorText,
    sendMessage,
    clearChat,
  }), [uiMessages, isProcessing, errorText, sendMessage, clearChat]);
});
