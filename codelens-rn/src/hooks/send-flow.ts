import { messageId as makeMessageId } from '../domain/types';
import { uid } from '../lib/uid';
import {
  decidePartialResponse,
  isAbortError,
  type ChatMessageStatus,
} from '../features/chat/types/messageStatus';
import type { ChatId, ChatMessage, ChatModelOverride, ChatScope } from '../domain/types';

export interface SendFlowReceivedTextRef {
  current: string;
}

export interface SendFlowDeps {
  chatId: ChatId;
  text: string;
  scope: ChatScope;
  routingOverride?: ChatModelOverride | undefined;
  buildSystemPrompt: () => string;
  messages: ChatMessage[];
  insertMessage: (chatId: ChatId, msg: ChatMessage) => Promise<void>;
  enqueue: (
    scope: ChatScope,
    msgs: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    signal?: AbortSignal | undefined,
    options?: { routingOverride?: ChatModelOverride | undefined } | undefined,
  ) => Promise<string>;
  signal?: AbortSignal | undefined;
  receivedTextRef?: SendFlowReceivedTextRef | undefined;
  onUserMessageInserted?: (() => void) | undefined;
  onAssistantStatus?: ((status: ChatMessageStatus) => void) | undefined;
}

export async function executeSendFlow(deps: SendFlowDeps): Promise<void> {
  const userMsg: ChatMessage = {
    id: makeMessageId(uid()),
    role: 'user',
    content: deps.text,
    createdAt: new Date().toISOString(),
  };
  await deps.insertMessage(deps.chatId, userMsg);
  deps.onUserMessageInserted?.();

  const systemPrompt = deps.buildSystemPrompt();
  const aiMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...deps.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: deps.text },
  ];

  deps.onAssistantStatus?.('sending');

  let response: string;
  try {
    response = await deps.enqueue(deps.scope, aiMessages, deps.signal, {
      routingOverride: deps.routingOverride,
    });
  } catch (err) {
    const aborted = isAbortError(err) || Boolean(deps.signal?.aborted);
    if (aborted) {
      const partial = deps.receivedTextRef?.current ?? '';
      const decision = decidePartialResponse(partial.length, partial);
      if (decision.insertAssistant) {
        const assistantMsg: ChatMessage = {
          id: makeMessageId(uid()),
          role: 'assistant',
          content: decision.content,
          createdAt: new Date().toISOString(),
          status: decision.status,
        };
        await deps.insertMessage(deps.chatId, assistantMsg);
      }
      deps.onAssistantStatus?.('stopped');
      return;
    }
    deps.onAssistantStatus?.('failed');
    throw err;
  }

  const assistantMsg: ChatMessage = {
    id: makeMessageId(uid()),
    role: 'assistant',
    content: response,
    createdAt: new Date().toISOString(),
  };
  await deps.insertMessage(deps.chatId, assistantMsg);
  deps.onAssistantStatus?.('done');
}
