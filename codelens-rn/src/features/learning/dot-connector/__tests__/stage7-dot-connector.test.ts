import { describe, expect, it, vi } from 'vitest';
import { unsafeConceptId, unsafeLearningCaptureId } from '../../types/ids';
import { getInjectionModeConfig, runSendInjection, runTypingRetrieval, sortPreviewMemories } from '../services';
import type { DotConnectorSettings } from '../types/dotConnector';
import type { RetrieveResult, RetrievedCaptureMemory, RetrievedConceptMemory } from '../../retrieval/types/retrieval';

vi.mock('../../../../db/client', () => ({
  getRawDb: vi.fn(() => ({
    execute: vi.fn(async () => ({ rows: [] })),
    transaction: vi.fn(async (fn: (tx: { execute: (sql: string, params?: unknown[]) => Promise<unknown> }) => Promise<unknown>) =>
      fn({ execute: vi.fn(async () => ({ rows: [] })) }),
    ),
  })),
}));

vi.mock('../../../../ai/embed', () => ({
  enqueueEmbed: vi.fn(async () => new Float32Array([1, 0, 0])),
}));

vi.mock('../../../../ai/scopes', () => ({
  getEmbedConfig: () => ({ provider: 'siliconflow', model: 'test-embed' }),
}));

const conceptId = unsafeConceptId('c_111111111111111111111');
const captureId = unsafeLearningCaptureId('lc_222222222222222222222');

const settings: DotConnectorSettings = {
  enableDotConnector: true,
  injectionMode: 'standard',
  dotConnectorPerTurnDefault: 'on',
};

function conceptMemory(score = 0.5): RetrievedConceptMemory {
  return {
    kind: 'concept',
    id: conceptId,
    score,
    rrfScore: score,
    vecScore: null,
    ftsScore: 0.8,
    recencyFactor: 1,
    strengthFactor: 1,
    tier: 'cold',
    payload: {
      id: conceptId,
      name: 'Closure',
      conceptType: 'mechanism',
      canonicalSummary: 'A function keeps access to its creation scope.',
      coreConcept: 'lexical scope',
      languageOrRuntime: ['typescript'],
      surfaceFeatures: ['inner function'],
      familiarityScore: 0.5,
      importanceScore: 0.5,
      strength: 0.5,
      representativeCaptureIds: [captureId],
      createdAt: 1,
      lastAccessedAt: null,
    },
  };
}

function captureMemory(score = 0.4): RetrievedCaptureMemory {
  return {
    kind: 'capture',
    id: captureId,
    score,
    rrfScore: score,
    vecScore: null,
    ftsScore: 0.7,
    recencyFactor: 1,
    strengthFactor: 1,
    tier: 'cold',
    payload: {
      id: captureId,
      title: 'Closure moment',
      whatClicked: 'The returned function reads outer state.',
      whyItMattered: null,
      rawSnippet: 'const make = () => { let x = 1; return () => x; }',
      snippetLang: 'typescript',
      snippetSourcePath: 'closure.ts',
      snippetStartLine: 1,
      snippetEndLine: 1,
      state: 'unresolved',
      linkedConceptId: null,
      linkedConceptName: null,
      sessionId: 's1',
      createdAt: 1,
      lastAccessedAt: null,
      embeddingStatus: 'ready',
    },
  };
}

function result(memories = [conceptMemory(), captureMemory()]): RetrieveResult {
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
      ftsCaptureHits: 1,
      ftsConceptHits: 1,
      totalCandidates: memories.length,
      rehydrationEnqueued: 0,
      lastAccessedBumpFailed: false,
      durationMs: 1,
    },
  };
}

describe('Stage 7 Dot Connector contracts', () => {
  it('maps injection modes to locked limits and token budgets', () => {
    expect(getInjectionModeConfig('conservative')).toEqual({ limit: 3, tokenBudget: 800 });
    expect(getInjectionModeConfig('standard')).toEqual({ limit: 5, tokenBudget: 1500 });
    expect(getInjectionModeConfig('aggressive')).toEqual({ limit: 8, tokenBudget: 2000 });
  });

  it('gates typing retrieval below three trimmed characters', async () => {
    const retrieve = vi.fn(async () => result());
    await expect(runTypingRetrieval({ query: 'ab ', settings, retrieve })).resolves.toBeNull();
    expect(retrieve).not.toHaveBeenCalled();
  });

  it('typing retrieval uses Stage 7 retrieval options and post-budget count', async () => {
    const retrieve = vi.fn(async () => result());
    const snapshot = await runTypingRetrieval({ query: 'closure', settings, retrieve, now: () => 10 });
    expect(retrieve).toHaveBeenCalledWith(expect.objectContaining({
      query: 'closure',
      limit: 5,
      tokenBudget: 1500,
      filters: { kinds: ['capture', 'concept'] },
      enableJitRehydration: true,
      bumpLastAccessed: false,
    }));
    expect(snapshot?.injection.includedCount).toBe(2);
  });

  it('send skips retrieval when the per-turn toggle is off', async () => {
    const retrieve = vi.fn(async () => result());
    const send = await runSendInjection({
      query: 'closure',
      settings,
      perTurnEnabled: false,
      retrieve,
    });
    expect(retrieve).not.toHaveBeenCalled();
    expect(send.outboundText).toBe('closure');
  });

  it('send reuses a fresh identical typing result', async () => {
    const retrieve = vi.fn(async () => result([captureMemory()]));
    const typingSnapshot = {
      query: 'closure',
      result: result([conceptMemory()]),
      injection: { text: 'cached', includedIds: [{ kind: 'concept' as const, id: conceptId }], includedCount: 1, droppedCount: 0, totalTokensApprox: 2 },
      createdAt: 1_000,
    };
    const send = await runSendInjection({
      query: 'closure',
      settings,
      perTurnEnabled: true,
      retrieve,
      typingSnapshot,
      now: () => 5_000,
    });
    expect(retrieve).not.toHaveBeenCalled();
    expect(send.reusedTypingResult).toBe(true);
    expect(send.outboundText).toContain('<codelens_memory_context>');
    expect(send.outboundText).toContain('Closure');
  });

  it('removing a memory excludes it from this turn without deleting source data', async () => {
    const retrieve = vi.fn(async () => result());
    const send = await runSendInjection({
      query: 'closure',
      settings,
      perTurnEnabled: true,
      retrieve,
      removedMemoryIds: [String(conceptId)],
    });
    expect(send.injection?.includedIds).toEqual([{ kind: 'capture', id: captureId }]);
  });

  it('preview sorting follows score, concept tie-break, then id', () => {
    const sorted = sortPreviewMemories([captureMemory(0.3), conceptMemory(0.3)]);
    expect(sorted[0].kind).toBe('concept');
  });
});
