import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { insertMessage } from '../db/queries/chats';
import { enqueue } from '../ai/queue';
import { executeSendFlow } from './send-flow';
import { chatKeys } from './query-keys';
import { useCancelGeneration } from '../features/chat/hooks/useCancelGeneration';
import type { ChatMessageStatus } from '../features/chat/types/messageStatus';
import type { ChatId, ChatMessage, ChatModelOverride, ChatScope } from '../domain/types';

export interface UseSendMessageResult {
  send: (text: string) => Promise<void>;
  stopGenerating: () => void;
  status: ChatMessageStatus | 'idle';
  isGenerationInFlight: boolean;
  sending: boolean;
  error: string;
  clearError: () => void;
}

export function useSendMessage(
  chatId: ChatId | null,
  scope: ChatScope,
  buildSystemPrompt: () => string,
  messages: ChatMessage[],
  routingOverride?: ChatModelOverride,
): UseSendMessageResult {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<ChatMessageStatus | 'idle'>('idle');
  const queryClient = useQueryClient();
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const receivedTextRef = useRef('');
  const cancel = useCancelGeneration();
  const startGeneration = cancel.startGeneration;
  const clearGeneration = cancel.clearGeneration;

  const send = useCallback(
    async (text: string) => {
      if (!chatId) return;
      setSending(true);
      setError('');
      setStatus('sending');
      receivedTextRef.current = '';
      const signal = startGeneration();

      try {
        await executeSendFlow({
          chatId,
          text,
          scope,
          routingOverride,
          buildSystemPrompt,
          messages: messagesRef.current,
          insertMessage,
          enqueue,
          signal,
          receivedTextRef,
          onUserMessageInserted: () =>
            queryClient.invalidateQueries({ queryKey: chatKeys.detail(chatId) }),
          onAssistantStatus: setStatus,
        });
        queryClient.invalidateQueries({ queryKey: chatKeys.detail(chatId) });
        queryClient.invalidateQueries({ queryKey: chatKeys.recent });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to get response');
      } finally {
        clearGeneration();
        setSending(false);
      }
    },
    [chatId, scope, buildSystemPrompt, queryClient, routingOverride, startGeneration, clearGeneration],
  );

  return {
    send,
    stopGenerating: cancel.stopGenerating,
    status,
    isGenerationInFlight: cancel.isGenerationInFlight,
    sending,
    error,
    clearError: useCallback(() => setError(''), []),
  };
}
