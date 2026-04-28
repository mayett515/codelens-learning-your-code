import { describe, it, expect, vi } from 'vitest';
import { executeSendFlow } from '../send-flow';
import type { ChatId, ChatScope } from '../../domain/types';

function makeDeps(overrides: Partial<Parameters<typeof executeSendFlow>[0]> = {}) {
  return {
    chatId: 'chat-1' as ChatId,
    text: 'hello',
    scope: 'general' as ChatScope,
    buildSystemPrompt: () => 'system prompt',
    messages: [],
    insertMessage: vi.fn().mockResolvedValue(undefined),
    enqueue: vi.fn().mockResolvedValue('AI response'),
    ...overrides,
  };
}

describe('executeSendFlow', () => {
  it('throws when first insertMessage (user message) fails', async () => {
    const deps = makeDeps({
      insertMessage: vi.fn().mockRejectedValue(new Error('DB write failed')),
    });

    await expect(executeSendFlow(deps)).rejects.toThrow('DB write failed');
    expect(deps.enqueue).not.toHaveBeenCalled();
  });

  it('throws when enqueue fails', async () => {
    const deps = makeDeps({
      enqueue: vi.fn().mockRejectedValue(new Error('API timeout')),
    });

    await expect(executeSendFlow(deps)).rejects.toThrow('API timeout');
    expect(deps.insertMessage).toHaveBeenCalledTimes(1);
  });

  it('throws when second insertMessage (assistant message) fails', async () => {
    const insert = vi.fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Disk full'));

    const deps = makeDeps({ insertMessage: insert });

    await expect(executeSendFlow(deps)).rejects.toThrow('Disk full');
    expect(deps.enqueue).toHaveBeenCalledTimes(1);
  });

  it('calls onUserMessageInserted after first insert', async () => {
    const onInserted = vi.fn();
    const deps = makeDeps({ onUserMessageInserted: onInserted });

    await executeSendFlow(deps);

    expect(onInserted).toHaveBeenCalledTimes(1);
    expect(deps.insertMessage).toHaveBeenCalledTimes(2);
  });

  it('sends the user message verbatim to the LLM', async () => {
    const deps = makeDeps({ text: 'plain user text' });

    await executeSendFlow(deps);

    expect(deps.enqueue).toHaveBeenCalledWith(
      'general',
      [
        { role: 'system', content: 'system prompt' },
        { role: 'user', content: 'plain user text' },
      ],
      undefined,
      { routingOverride: undefined },
    );
  });
});
