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

  it('throws when enqueue fails with non-abort error', async () => {
    const deps = makeDeps({
      enqueue: vi.fn().mockRejectedValue(new Error('API timeout')),
    });

    await expect(executeSendFlow(deps)).rejects.toThrow('API timeout');
    expect(deps.insertMessage).toHaveBeenCalledTimes(1);
  });

  it('reports failed status when enqueue rejects without abort', async () => {
    const onStatus = vi.fn();
    const deps = makeDeps({
      enqueue: vi.fn().mockRejectedValue(new Error('upstream 500')),
      onAssistantStatus: onStatus,
    });

    await expect(executeSendFlow(deps)).rejects.toThrow('upstream 500');
    expect(onStatus).toHaveBeenCalledWith('failed');
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

  it('forwards AbortSignal to enqueue when provided', async () => {
    const controller = new AbortController();
    const deps = makeDeps({ signal: controller.signal });

    await executeSendFlow(deps);

    expect(deps.enqueue).toHaveBeenCalledWith(
      'general',
      expect.any(Array),
      controller.signal,
      { routingOverride: undefined },
    );
  });

  it('stays in sending status until request-response completion reports done', async () => {
    const onStatus = vi.fn();
    const deps = makeDeps({ onAssistantStatus: onStatus });

    await executeSendFlow(deps);

    const calls = onStatus.mock.calls.map((c) => c[0]);
    expect(calls).toContain('sending');
    expect(calls).not.toContain('streaming');
    expect(calls[calls.length - 1]).toBe('done');
  });

  it('on abort with 0 received chars: keeps user message, inserts no assistant message, status stopped', async () => {
    const onStatus = vi.fn();
    const insert = vi.fn().mockResolvedValue(undefined);
    const enqueueAbort = vi.fn().mockImplementation(async () => {
      throw new Error('Aborted');
    });
    const deps = makeDeps({
      insertMessage: insert,
      enqueue: enqueueAbort,
      receivedTextRef: { current: '' },
      onAssistantStatus: onStatus,
    });

    await executeSendFlow(deps);

    expect(insert).toHaveBeenCalledTimes(1);
    expect(onStatus).toHaveBeenCalledWith('stopped');
  });

  it('on abort with 1-99 partial chars: assistant message content is [Generation stopped]', async () => {
    const insert = vi.fn().mockResolvedValue(undefined);
    const enqueueAbort = vi.fn().mockRejectedValue(new Error('Aborted'));
    const partial = 'short partial reply';
    const deps = makeDeps({
      insertMessage: insert,
      enqueue: enqueueAbort,
      receivedTextRef: { current: partial },
    });

    await executeSendFlow(deps);

    expect(insert).toHaveBeenCalledTimes(2);
    const second = insert.mock.calls[1]![1];
    expect(second.content).toBe('[Generation stopped]');
    expect(second.role).toBe('assistant');
  });

  it('on abort with 100+ partial chars: assistant content keeps partial + suffix', async () => {
    const insert = vi.fn().mockResolvedValue(undefined);
    const enqueueAbort = vi.fn().mockRejectedValue(new Error('Aborted'));
    const partial = 'x'.repeat(120);
    const deps = makeDeps({
      insertMessage: insert,
      enqueue: enqueueAbort,
      receivedTextRef: { current: partial },
    });

    await executeSendFlow(deps);

    expect(insert).toHaveBeenCalledTimes(2);
    const second = insert.mock.calls[1]![1];
    expect(second.content).toBe(`${partial}\n\n[Generation stopped]`);
    expect(second.role).toBe('assistant');
  });

  it('detects abort via signal.aborted even when enqueue rejects with a non-AbortError shape', async () => {
    const controller = new AbortController();
    controller.abort();
    const insert = vi.fn().mockResolvedValue(undefined);
    const enqueueRejects = vi.fn().mockRejectedValue(new Error('totally unrelated'));
    const onStatus = vi.fn();
    const deps = makeDeps({
      signal: controller.signal,
      insertMessage: insert,
      enqueue: enqueueRejects,
      receivedTextRef: { current: '' },
      onAssistantStatus: onStatus,
    });

    await executeSendFlow(deps);

    expect(onStatus).toHaveBeenCalledWith('stopped');
    expect(insert).toHaveBeenCalledTimes(1);
  });
});
