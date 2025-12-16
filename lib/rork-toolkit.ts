import { useCallback, useMemo, useRef, useState } from 'react';
import { z } from 'zod';

export type RorkAgentMessagePart =
  | { type: 'text'; text: string }
  | {
      type: 'tool';
      toolName: string;
      state:
        | 'input-streaming'
        | 'input-available'
        | 'output-available'
        | 'output-error';
      input?: unknown;
      output?: unknown;
      errorText?: string;
    };

export type RorkAgentMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  parts: RorkAgentMessagePart[];
};

export type CreateRorkToolParams<TSchema extends z.ZodTypeAny> = {
  description: string;
  zodSchema: TSchema;
  execute?: (input: z.infer<TSchema>) => Promise<unknown> | unknown;
};

export type RorkTool<TSchema extends z.ZodTypeAny = z.ZodTypeAny> = {
  description: string;
  zodSchema: TSchema;
  execute?: (input: z.infer<TSchema>) => Promise<unknown> | unknown;
};

export function createRorkTool<TSchema extends z.ZodTypeAny>(
  params: CreateRorkToolParams<TSchema>,
): RorkTool<TSchema> {
  return params;
}

type UseRorkAgentParams = {
  tools?: Record<string, RorkTool>;
};

type UseRorkAgentResult = {
  messages: RorkAgentMessage[];
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
  setMessages: (messages: RorkAgentMessage[]) => void;
};

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useRorkAgent(params: UseRorkAgentParams = {}): UseRorkAgentResult {
  const [messages, _setMessages] = useState<RorkAgentMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const toolsRef = useRef(params.tools ?? {});
  toolsRef.current = params.tools ?? {};

  const setMessages = useCallback((next: RorkAgentMessage[]) => {
    _setMessages(next);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const toolkitUrl = process.env.EXPO_PUBLIC_TOOLKIT_URL;
    if (!toolkitUrl) {
      const msg = 'EXPO_PUBLIC_TOOLKIT_URL is not configured.';
      console.log('[useRorkAgent] Missing toolkit url');
      setError(msg);
      throw new Error(msg);
    }

    setError(null);

    const nextMessages: RorkAgentMessage[] = [
      ...messages,
      {
        id: makeId(),
        role: 'user',
        parts: [{ type: 'text', text }],
      },
    ];

    _setMessages(nextMessages);

    const url = new URL('/agent/chat', toolkitUrl).toString();
    console.log('[useRorkAgent] POST', url);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);

    try {
      const toolsForApi = Object.fromEntries(
        Object.entries(toolsRef.current).map(([name, t]) => [
          name,
          {
            description: t.description,
            zodSchema: undefined,
          },
        ]),
      );

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: nextMessages,
          tools: toolsForApi,
        }),
        signal: controller.signal,
      });

      const raw = await res.text();
      if (!res.ok) {
        console.log('[useRorkAgent] Non-OK response', res.status, raw);
        throw new Error(raw || `Request failed (${res.status})`);
      }

      let data: any = null;
      try {
        data = JSON.parse(raw);
      } catch {
        data = raw;
      }

      const assistantText: string =
        typeof data === 'string'
          ? data
          : (data?.text as string) ??
            (data?.message as string) ??
            (data?.output as string) ??
            '';

      const assistantMsg: RorkAgentMessage = {
        id: makeId(),
        role: 'assistant',
        parts: [{ type: 'text', text: assistantText || '...' }],
      };

      _setMessages((prev) => [...prev, assistantMsg]);
    } catch (e: any) {
      const msg = String(e?.message ?? e ?? 'Failed to send message');
      console.log('[useRorkAgent] sendMessage error', msg);
      setError(msg);
      throw e;
    } finally {
      clearTimeout(timeout);
    }
  }, [messages]);

  return useMemo(
    () => ({
      messages,
      error,
      sendMessage,
      setMessages,
    }),
    [messages, error, sendMessage, setMessages],
  );
}
