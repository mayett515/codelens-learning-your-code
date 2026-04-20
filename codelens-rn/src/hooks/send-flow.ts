import { messageId as makeMessageId } from '../domain/types';
import { uid } from '../lib/uid';
import type { ChatId, ChatMessage, ChatModelOverride, ChatScope } from '../domain/types';

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
  onUserMessageInserted?: (() => void) | undefined;
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

  const response = await deps.enqueue(deps.scope, aiMessages, undefined, {
    routingOverride: deps.routingOverride,
  });

  const assistantMsg: ChatMessage = {
    id: makeMessageId(uid()),
    role: 'assistant',
    content: response,
    createdAt: new Date().toISOString(),
  };
  await deps.insertMessage(deps.chatId, assistantMsg);
}
