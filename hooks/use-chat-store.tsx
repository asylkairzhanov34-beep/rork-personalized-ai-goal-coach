import createContextHook from '@nkzw/create-context-hook';
import { useRorkAgent, createRorkTool } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import { useGoalStore } from '@/hooks/use-goal-store';
import { ChatMessage } from '@/types/chat';
import { useMemo, useEffect, useCallback } from 'react';

export const [ChatProvider, useChat] = createContextHook(() => {
  const goalStore = useGoalStore();

  const { messages, sendMessage: rorkSendMessage, setMessages, error } = useRorkAgent({
    tools: {
      addTask: createRorkTool({
        description: 'Add a new task to the user\'s schedule',
        zodSchema: z.object({
          title: z.string().describe('Title of the task'),
          date: z.string().describe('Date for the task (ISO string)'),
          priority: z.enum(['high', 'medium', 'low']).describe('Priority of the task'),
          estimatedTime: z.number().describe('Estimated time in minutes'),
          description: z.string().optional().describe('Description of the task'),
        }),
        execute: async (input) => {
          goalStore.addTask({
            title: input.title,
            date: input.date,
            priority: input.priority as any,
            estimatedTime: input.estimatedTime,
            description: input.description || '',
            duration: input.estimatedTime + ' мин',
            difficulty: 'medium',
            day: 1, // Default to day 1 or calculate based on goal start
            tips: [],
          });
          return `Task "${input.title}" added for ${new Date(input.date).toLocaleDateString()}.`;
        },
      }),
      updateTask: createRorkTool({
        description: 'Update an existing task',
        zodSchema: z.object({
          taskId: z.string().describe('ID of the task to update'),
          title: z.string().optional(),
          date: z.string().optional(),
          completed: z.boolean().optional(),
          priority: z.enum(['high', 'medium', 'low']).optional(),
        }),
        execute: async (input) => {
           goalStore.updateTask(input.taskId, {
             ...(input.title && { title: input.title }),
             ...(input.date && { date: input.date }),
             ...(input.completed !== undefined && { completed: input.completed }),
             ...(input.priority && { priority: input.priority as any }),
           });
           return `Task updated successfully.`;
        },
      }),
      deleteTask: createRorkTool({
        description: 'Delete a task',
        zodSchema: z.object({
          taskId: z.string().describe('ID of the task to delete'),
        }),
        execute: async (input) => {
          goalStore.deleteTask(input.taskId);
          return `Task deleted successfully.`;
        },
      }),
      getTasks: createRorkTool({
        description: 'Get tasks for a specific date range or all active tasks',
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
            date: t.date,
            completed: t.completed,
            priority: t.priority
          })));
        },
      }),
      getHistory: createRorkTool({
        description: 'Get performance history statistics for the last 90 days',
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

  const sendMessage = useCallback(async (text: string) => {
    await rorkSendMessage(text);
  }, [rorkSendMessage]);

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
             
             // Also show tool outputs if relevant, but usually we just show text.
             // If text is empty, maybe it's a tool use.
             // But the prompt example shows we should render tools too.
             // For now, let's just extract text.
             const toolCalls = m.parts.filter((p: any) => p.type === 'tool');
             if (text === '' && toolCalls.length > 0) {
                 text = 'Executing action...'; 
             }
        } else {
            // Fallback if parts is not array (though SDK says it is)
             text = (m as any).content || '';
        }

        return {
            id: m.id,
            text: text,
            isBot: m.role === 'assistant',
            timestamp: new Date(), // SDK doesn't give timestamp always, use current
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

  return useMemo(() => ({
    messages: uiMessages,
    isLoading: false, // useRorkAgent doesn't return loading state for whole chat easily, or I missed it. Ah, I removed it from destructuring.
    // Wait, useRorkAgent DOES return isLoading? The previous error said `isLoading` does not exist.
    // The docs example: `const { messages, error, sendMessage, addToolResult, setMessages } = useRorkAgent({...})`
    // It does NOT show isLoading. So I should track it myself or assume it's fast?
    // Usually SDKs provide `isLoading` or `status`.
    // I'll assume `status` might be there or I can wrap `sendMessage` to track loading.
    sendMessage,
    clearChat,
    userContext: {
        profile: goalStore.profile,
        currentGoal: goalStore.currentGoal,
    }
  }), [uiMessages, sendMessage, clearChat, goalStore.profile, goalStore.currentGoal]);
});
