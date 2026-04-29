import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { executeSendFlow } from '../../../hooks/send-flow';
import { createCancelGenerationController } from '../hooks/useCancelGeneration';
import {
  CODE_CONTEXT_INJECTION_CAP,
  expandRange,
  sliceCodeFromLines,
} from '../services/sliceCodeContext';
import type { ChatId, ChatScope } from '../../../domain/types';

const testDir = dirname(fileURLToPath(import.meta.url));

function makeDeps(overrides: Partial<Parameters<typeof executeSendFlow>[0]> = {}) {
  return {
    chatId: 'chat-stage8' as ChatId,
    text: 'explain this',
    scope: 'section' as ChatScope,
    buildSystemPrompt: () => 'system',
    messages: [],
    insertMessage: vi.fn().mockResolvedValue(undefined),
    enqueue: vi.fn().mockResolvedValue('assistant response'),
    ...overrides,
  };
}

describe('Stage 8 cancel and selected-code preview guards', () => {
  it('cancel controller creates fresh signals, aborts stop, and clears the active ref', () => {
    const states: boolean[] = [];
    const controller = createCancelGenerationController((state) => states.push(state));

    const first = controller.startGeneration();
    const second = controller.startGeneration();

    expect(first).not.toBe(second);
    expect(first.aborted).toBe(true);
    expect(second.aborted).toBe(false);
    expect(controller.getCurrentSignal()).toBe(second);

    controller.stopGenerating();
    expect(second.aborted).toBe(true);
    expect(controller.getCurrentSignal()).toBeNull();

    const third = controller.startGeneration();
    controller.clearGeneration();
    expect(third.aborted).toBe(false);
    expect(controller.getCurrentSignal()).toBeNull();
    expect(states).toEqual([true, true, false, true, false]);
  });

  it('executeSendFlow forwards AbortSignal to the AI queue', async () => {
    const signal = new AbortController().signal;
    const deps = makeDeps({ signal });

    await executeSendFlow(deps);

    expect(deps.enqueue).toHaveBeenCalledWith(
      'section',
      expect.any(Array),
      signal,
      { routingOverride: undefined },
    );
  });

  it('cancel with 0 received chars inserts no assistant row', async () => {
    const insertMessage = vi.fn().mockResolvedValue(undefined);
    const deps = makeDeps({
      insertMessage,
      enqueue: vi.fn().mockRejectedValue(new Error('Aborted')),
      receivedTextRef: { current: '' },
    });

    await executeSendFlow(deps);

    expect(insertMessage).toHaveBeenCalledTimes(1);
  });

  it('cancel with 1-99 chars inserts the stopped label', async () => {
    const insertMessage = vi.fn().mockResolvedValue(undefined);
    const deps = makeDeps({
      insertMessage,
      enqueue: vi.fn().mockRejectedValue(new Error('Aborted')),
      receivedTextRef: { current: 'partial' },
    });

    await executeSendFlow(deps);

    expect(insertMessage).toHaveBeenCalledTimes(2);
    expect(insertMessage.mock.calls[1]![1].content).toBe('[Generation stopped]');
  });

  it('cancel with 100+ chars keeps the partial and appends the stopped label', async () => {
    const insertMessage = vi.fn().mockResolvedValue(undefined);
    const partial = 'x'.repeat(100);
    const deps = makeDeps({
      insertMessage,
      enqueue: vi.fn().mockRejectedValue(new Error('Aborted')),
      receivedTextRef: { current: partial },
    });

    await executeSendFlow(deps);

    expect(insertMessage.mock.calls[1]![1].content).toBe(`${partial}\n\n[Generation stopped]`);
  });

  it('SelectedCodePreview has no save action and gates truncated text on the injection cap prop', () => {
    const source = readFileSync(join(testDir, '../ui/SelectedCodePreview.tsx'), 'utf8');

    expect(source).not.toMatch(/>\s*Save\s*</);
    expect(source).toContain('{truncated ? (');
    expect(source).not.toContain('body.charTruncated');
  });

  it('adjust math clamps to file bounds and recomputes the capped text slice', () => {
    const lines = Array.from({ length: 10 }, (_, idx) => `line ${idx + 1}`);
    const expanded = expandRange({
      startLine: 2,
      endLine: 9,
      fileLineCount: lines.length,
      before: 2,
      after: 4,
    });
    const slice = sliceCodeFromLines({
      fileLines: lines,
      startLine: expanded.startLine,
      endLine: expanded.endLine,
    });

    expect(expanded).toEqual({ startLine: 1, endLine: 10 });
    expect(slice.text).toBe(lines.join('\n'));

    const longSlice = sliceCodeFromLines({
      fileLines: ['x'.repeat(CODE_CONTEXT_INJECTION_CAP + 1)],
      startLine: 1,
      endLine: 1,
    });
    expect(longSlice.text).toHaveLength(CODE_CONTEXT_INJECTION_CAP);
    expect(longSlice.truncated).toBe(true);
  });
});
