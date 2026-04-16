import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { insertMessage } from '../db/queries/chats';
import { enqueue } from '../ai/queue';
import { executeSendFlow } from './send-flow';
import { chatKeys } from './query-keys';
import type { ChatId, ChatMessage, ChatScope } from '../domain/types';

interface UseSendMessageResult {
  send: (text: string) => Promise<void>;
  sending: boolean;
  error: string;
  clearError: () => void;
}

export function useSendMessage(
  chatId: ChatId | null,
  scope: ChatScope,
  buildSystemPrompt: () => string,
  messages: ChatMessage[],
): UseSendMessageResult {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const send = useCallback(
    async (text: string) => {
      if (!chatId) return;
      setSending(true);
      setError('');

      try {
        await executeSendFlow({
          chatId,
          text,
          scope,
          buildSystemPrompt,
          messages: messagesRef.current,
          insertMessage,
          enqueue,
          onUserMessageInserted: () =>
            queryClient.invalidateQueries({ queryKey: chatKeys.detail(chatId) }),
        });
        queryClient.invalidateQueries({ queryKey: chatKeys.detail(chatId) });
        queryClient.invalidateQueries({ queryKey: chatKeys.recent });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to get response');
      } finally {
        setSending(false);
      }
    },
    [chatId, scope, buildSystemPrompt, queryClient],
  );

  return { send, sending, error, clearError: useCallback(() => setError(''), []) };
}
