import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { enqueue } from '../../../ai/queue';
import { uid } from '../../../lib/uid';
import { MINI_CHAT_MAX_EXCHANGES } from '../promptComposition/constants';
import { useCancelGeneration } from '../hooks/useCancelGeneration';
import { buildMiniChatSystemPrompt } from './buildMiniChatSystemPrompt';
import { isAbortError } from '../types/messageStatus';
import type { ChatCodeContext } from '../promptComposition/types';
import type { MiniChatMessage } from './types';

export interface UseMiniChatResult {
  messages: MiniChatMessage[];
  send: (text: string) => Promise<void>;
  stopGenerating: () => void;
  sending: boolean;
  isGenerationInFlight: boolean;
  error: string | null;
  exchangeCount: number;
  isAtLimit: boolean;
  clearError: () => void;
}

export function useMiniChat(lineRef: ChatCodeContext): UseMiniChatResult {
  const [messages, setMessages] = useState<MiniChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesRef = useRef(messages);
  const sendingRef = useRef(false);
  const cancel = useCancelGeneration();
  const startGeneration = cancel.startGeneration;
  const stopGenerating = cancel.stopGenerating;
  const clearGeneration = cancel.clearGeneration;
  messagesRef.current = messages;
  sendingRef.current = sending;

  const exchangeCount = useMemo(
    () => messages.filter((message) => message.role === 'assistant' && !message.isError).length,
    [messages],
  );
  const isAtLimit = exchangeCount >= MINI_CHAT_MAX_EXCHANGES;
  const isAtLimitRef = useRef(isAtLimit);
  isAtLimitRef.current = isAtLimit;

  useEffect(() => () => {
    stopGenerating();
  }, [stopGenerating]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sendingRef.current || isAtLimitRef.current) return;

      const userMessage = createMiniChatMessage('user', trimmed);
      const nextMessages = [...messagesRef.current, userMessage];
      const signal = startGeneration();
      setMessages(nextMessages);
      setSending(true);
      setError(null);

      try {
        const response = await enqueue('section', [
          { role: 'system', content: buildMiniChatSystemPrompt(lineRef) },
          ...nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        ], signal);
        setMessages((current) => [
          ...current,
          createMiniChatMessage('assistant', response.trim() || 'I could not generate a useful answer.'),
        ]);
      } catch (err) {
        if (isAbortError(err) || signal.aborted) {
          setError(null);
          return;
        }
        const message = err instanceof Error ? err.message : 'Mini chat failed';
        setError(message);
        setMessages((current) => [
          ...current,
          createMiniChatMessage('assistant', `Mini chat failed: ${message}`, true),
        ]);
      } finally {
        clearGeneration();
        setSending(false);
      }
    },
    [clearGeneration, lineRef, startGeneration],
  );

  return {
    messages,
    send,
    stopGenerating,
    sending,
    isGenerationInFlight: cancel.isGenerationInFlight,
    error,
    exchangeCount,
    isAtLimit,
    clearError: useCallback(() => setError(null), []),
  };
}

function createMiniChatMessage(
  role: MiniChatMessage['role'],
  content: string,
  isError = false,
): MiniChatMessage {
  return {
    id: uid(),
    role,
    content,
    createdAt: Date.now(),
    isError: isError || undefined,
  };
}
