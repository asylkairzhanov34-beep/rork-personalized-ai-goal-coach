import createContextHook from '@nkzw/create-context-hook';
import { generateText } from '@rork-ai/toolkit-sdk';
import { useGoalStore } from '@/hooks/use-goal-store';
import { ChatMessage } from '@/types/chat';
import { useMemo, useEffect, useCallback, useState, useRef } from 'react';

type TextPart = { type: 'text'; text: string };
type UserMessage = { role: 'user'; content: string | TextPart[] };
type AssistantMessage = { role: 'assistant'; content: string | TextPart[] };

export const [ChatProvider, useChat] = createContextHook(() => {
  const goalStore = useGoalStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const lastMessageRef = useRef<string | null>(null);
  const messageIdRef = useRef<number>(0);

  console.log('[ChatStore] Initializing chat (generateText mode)...');
  console.log('[ChatStore] EXPO_PUBLIC_TOOLKIT_URL:', process.env.EXPO_PUBLIC_TOOLKIT_URL);
  console.log('[ChatStore] EXPO_PUBLIC_PROJECT_ID:', process.env.EXPO_PUBLIC_PROJECT_ID);

  const makeId = useCallback((): string => {
    messageIdRef.current += 1;
    return `${Date.now()}_${messageIdRef.current}`;
  }, []);

  const buildSystemContext = useCallback((): string => {
    const name = goalStore.profile.name || 'User';
    const goal = goalStore.currentGoal?.title || 'None';
    const streak = goalStore.profile.currentStreak || 0;

    return [
      'You are GoalForge, a productivity coach and goal assistant.',
      'Be concise, friendly, and actionable.',
      'If the user asks about their plan/progress, give concrete next steps.',
      `User profile: name=${name}; currentGoal=${goal}; streakDays=${streak}.`,
    ].join('\n');
  }, [goalStore.profile.name, goalStore.profile.currentStreak, goalStore.currentGoal?.title]);

  const toToolkitMessages = useCallback(
    (chatMessages: ChatMessage[]): (UserMessage | AssistantMessage)[] => {
      return chatMessages.map((m) => {
        if (m.isBot) {
          return { role: 'assistant', content: m.text };
        }
        return { role: 'user', content: m.text };
      });
    },
    []
  );

  const mapErrorToUserMessage = useCallback((e: unknown): string => {
    const raw = e instanceof Error ? e.message : String(e);
    const lower = raw.toLowerCase();

    console.error('[ChatStore] AI error (raw):', raw);

    if (
      lower.includes('syntaxerror') ||
      raw.includes("';' expected") ||
      lower.includes('unexpected token') ||
      lower.includes('json parse') ||
      lower.includes('json.parse')
    ) {
      return 'AI сервис временно недоступен. Попробуйте еще раз.';
    }

    if (
      lower.includes('fetch failed') ||
      lower.includes('failed to fetch') ||
      lower.includes('network') ||
      lower.includes('timeout')
    ) {
      return 'Не удалось подключиться к AI. Проверьте интернет и попробуйте еще раз.';
    }

    if (lower.includes('unauthorized') || lower.includes('401')) {
      return 'Нужна авторизация. Проверьте доступ/подписку.';
    }

    if (lower.includes('forbidden') || lower.includes('403')) {
      return 'Доступ запрещен. Нужна Premium подписка.';
    }

    return 'Что-то пошло не так. Попробуйте еще раз.';
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      setError(null);
      setIsSending(true);
      lastMessageRef.current = trimmed;

      const userMessage: ChatMessage = {
        id: makeId(),
        text: trimmed,
        isBot: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);

      try {
        const systemContext = buildSystemContext();
        const toolkitMessages = toToolkitMessages([...messages, userMessage]);

        const promptMessages: (UserMessage | AssistantMessage)[] = [
          { role: 'user', content: `[SYSTEM]\n${systemContext}` },
          ...toolkitMessages,
        ];

        console.log('[ChatStore] Sending to generateText. Messages:', promptMessages.length);

        const responseText = await generateText({ messages: promptMessages });

        const botMessage: ChatMessage = {
          id: makeId(),
          text: responseText,
          isBot: true,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, botMessage]);
        console.log('[ChatStore] AI response received. Length:', responseText.length);
      } catch (e) {
        const userFriendly = mapErrorToUserMessage(e);
        setError(userFriendly);
        console.error('[ChatStore] generateText failed:', e);
      } finally {
        setIsSending(false);
      }
    },
    [buildSystemContext, makeId, mapErrorToUserMessage, messages, toToolkitMessages]
  );

  const retryLastMessage = useCallback(async () => {
    if (!lastMessageRef.current) return;
    await sendMessage(lastMessageRef.current);
  }, [sendMessage]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  useEffect(() => {
    console.log('[ChatStore] State update - Messages:', messages.length, 'Loading:', isSending, 'Error:', !!error);
  }, [messages.length, isSending, error]);

  return useMemo(
    () => ({
      messages,
      isLoading: isSending,
      error,
      sendMessage,
      clearChat,
      retryLastMessage: lastMessageRef.current ? retryLastMessage : undefined,
    }),
    [messages, isSending, error, sendMessage, clearChat, retryLastMessage]
  );
});
