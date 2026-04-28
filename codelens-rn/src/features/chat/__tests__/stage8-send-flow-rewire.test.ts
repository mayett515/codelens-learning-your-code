import { describe, expect, it, vi } from 'vitest';
import { executeSendFlow } from '../../../hooks/send-flow';
import { unsafeLearningCaptureId } from '../../learning/types/ids';
import { buildChatSystemPrompt } from '../promptComposition/buildChatSystemPrompt';
import { CHAT_PROMPT_LAYER_SEPARATOR } from '../promptComposition/constants';
import { runSendInjection } from '../../learning/dot-connector/services/runSendInjection';
import type { ChatId, ChatScope } from '../../../domain/types';
import type { DotConnectorSettings } from '../../learning/dot-connector/types/dotConnector';
import type { RetrieveResult, RetrievedCaptureMemory } from '../../learning/retrieval/types/retrieval';

vi.mock('../../../db/client', () => ({
  getRawDb: vi.fn(() => ({
    transaction: vi.fn(async () => undefined),
  })),
}));

vi.mock('../../learning/retrieval/services/retrieveRelevantMemories', () => ({
  retrieveRelevantMemories: vi.fn(),
}));

const captureId = unsafeLearningCaptureId('lc_333333333333333333333');
const settings: DotConnectorSettings = {
  enableDotConnector: true,
  injectionMode: 'standard',
  dotConnectorPerTurnDefault: 'on',
};

function captureMemory(): RetrievedCaptureMemory {
  return {
    kind: 'capture',
    id: captureId,
    score: 1,
    rrfScore: 1,
    vecScore: null,
    ftsScore: 0.9,
    recencyFactor: 1,
    strengthFactor: 0,
    tier: 'hot',
    payload: {
      id: captureId,
      title: 'Callback capture',
      whatClicked: 'The callback keeps access to outer state.',
      whyItMattered: null,
      rawSnippet: 'const fn = () => value;',
      snippetLang: 'ts',
      snippetSourcePath: 'callback.ts',
      snippetStartLine: 1,
      snippetEndLine: 1,
      state: 'unresolved',
      linkedConceptId: null,
      linkedConceptName: null,
      sessionId: null,
      createdAt: 1,
      lastAccessedAt: null,
      embeddingStatus: 'ready',
    },
  };
}

function retrieveResult(memories = [captureMemory()]): RetrieveResult {
  return {
    memories,
    diagnostics: {
      status: 'ok',
      vecAvailable: true,
      ftsAvailable: true,
      failedSources: [],
      timedOutSources: [],
      partialReason: null,
      vecCaptureHits: 0,
      vecConceptHits: 0,
      ftsCaptureHits: memories.length,
      ftsConceptHits: 0,
      totalCandidates: memories.length,
      rehydrationEnqueued: 0,
      lastAccessedBumpFailed: false,
      durationMs: 1,
    },
  };
}

describe('Stage 8 send-flow rewire', () => {
  it('runSendInjection returns memories and no outboundText wrapper', async () => {
    const send = await runSendInjection({
      query: 'explain callback',
      settings,
      perTurnEnabled: true,
      retrieve: vi.fn(async () => retrieveResult()),
    });

    expect(send.memories).toHaveLength(1);
    expect(send.injection?.includedCount).toBe(1);
    expect(send.diagnostics?.status).toBe('ok');
    expect('outboundText' in send).toBe(false);
  });

  it('buildChatSystemPrompt keeps persona, memories, and code context in locked order', () => {
    const prompt = buildChatSystemPrompt({
      persona: { systemPromptLayer: 'Persona layer' },
      memories: [captureMemory()],
      codeContext: {
        kind: 'selected_code',
        text: 'const local = true;',
        filePath: 'local.ts',
        startLine: 4,
        endLine: 4,
      },
    });

    const personaIndex = prompt.indexOf('Persona layer');
    const memoryIndex = prompt.indexOf('Capture: Callback capture');
    const codeIndex = prompt.indexOf('Selected code from the file the user is reading:');
    expect(personaIndex).toBeGreaterThan(-1);
    expect(personaIndex).toBeLessThan(memoryIndex);
    expect(memoryIndex).toBeLessThan(codeIndex);
    expect(prompt).toContain(CHAT_PROMPT_LAYER_SEPARATOR);
    expect(prompt).not.toContain('<codelens_memory_context>');
  });

  it('executeSendFlow sends outbound user content verbatim without memory tags', async () => {
    const enqueue = vi.fn(async () => 'assistant');

    await executeSendFlow({
      chatId: 'chat-1' as ChatId,
      text: 'show me why this closes over state',
      scope: 'general' as ChatScope,
      buildSystemPrompt: () => 'system prompt with Capture: Callback capture',
      messages: [],
      insertMessage: vi.fn(async () => undefined),
      enqueue,
    });

    const sentMessages = (enqueue.mock.calls[0] as unknown[])[1] as Array<{
      role: string;
      content: string;
    }>;
    expect(sentMessages.at(-1)?.content).toBe('show me why this closes over state');
    expect(sentMessages.at(-1)?.content).not.toContain('<codelens_memory_context>');
  });

  it('executeSendFlow works with persona null and empty memories behavior', async () => {
    const enqueue = vi.fn(async () => 'assistant');

    await executeSendFlow({
      chatId: 'chat-1' as ChatId,
      text: 'hello',
      scope: 'general' as ChatScope,
      buildSystemPrompt: () => buildChatSystemPrompt({ persona: null, memories: [] }),
      messages: [],
      insertMessage: vi.fn(async () => undefined),
      enqueue,
    });

    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(((enqueue.mock.calls[0] as unknown[])[1] as Array<{ content: string }>)[0]?.content).not.toContain(
      '<codelens_memory_context>',
    );
  });
});
