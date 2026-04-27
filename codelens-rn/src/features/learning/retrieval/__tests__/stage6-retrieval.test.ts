import { describe, expect, it, vi } from 'vitest';
import type { DB } from '@op-engineering/op-sqlite';
import { unsafeConceptId, unsafeLearningCaptureId } from '../../types/ids';
import type { LearningCapture } from '../../types/learning';

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

vi.mock('../../data/captureRepo', () => ({
  getCaptureById: vi.fn(),
}));

import { formatMemoriesForInjection } from '../services/formatMemoriesForInjection';
import { retrieveRelevantMemories } from '../services/retrieveRelevantMemories';
import { computeRrfScore, rankComparator } from '../services/rrf';
import { computeRecencyFactor, computeStrengthFactor } from '../services/secondaryFactors';
import { sanitizeFtsQuery } from '../services/ftsSearch';
import { matchesFilters } from '../data/ftsRepo';
import { runHotColdGc } from '../services/runHotColdGc';
import { ensureEmbedded } from '../services/ensureEmbedded';
import { getCaptureById } from '../../data/captureRepo';
import type {
  RankedSearchHit,
  RetrievedCaptureMemory,
  RetrievedConceptMemory,
  RetrievedMemory,
} from '../types/retrieval';

const captureId = unsafeLearningCaptureId('lc_111111111111111111111');
const conceptId = unsafeConceptId('c_222222222222222222222');

function captureMemory(overrides: Partial<RetrievedCaptureMemory> = {}): RetrievedCaptureMemory {
  return {
    kind: 'capture',
    id: captureId,
    score: 0.2,
    rrfScore: 0.2,
    vecScore: null,
    ftsScore: 0.8,
    recencyFactor: 1,
    strengthFactor: 1,
    tier: 'cold',
    payload: {
      id: captureId,
      title: 'Closure captures lexical scope',
      whatClicked: 'The inner function keeps access to outer variables.',
      whyItMattered: null,
      rawSnippet: 'function outer() { const x = 1; return () => x; }',
      snippetLang: 'typescript',
      snippetSourcePath: 'src/closure.ts',
      snippetStartLine: 1,
      snippetEndLine: 1,
      state: 'unresolved',
      linkedConceptId: null,
      linkedConceptName: null,
      sessionId: 'session-a',
      createdAt: 100,
      lastAccessedAt: null,
      embeddingStatus: 'ready',
    },
    ...overrides,
  };
}

function conceptMemory(overrides: Partial<RetrievedConceptMemory> = {}): RetrievedConceptMemory {
  return {
    kind: 'concept',
    id: conceptId,
    score: 0.2,
    rrfScore: 0.2,
    vecScore: 0.9,
    ftsScore: null,
    recencyFactor: 1,
    strengthFactor: 1,
    tier: 'hot',
    payload: {
      id: conceptId,
      name: 'Closure',
      conceptType: 'mechanism',
      canonicalSummary: 'A function can retain access to variables from its creation scope.',
      coreConcept: 'lexical scope',
      languageOrRuntime: ['typescript'],
      surfaceFeatures: ['function scope'],
      familiarityScore: 0.3,
      importanceScore: 0.5,
      strength: 0.46,
      representativeCaptureIds: [captureId],
      createdAt: 90,
      lastAccessedAt: null,
    },
    ...overrides,
  };
}

describe('Stage 6 retrieval contracts', () => {
  it('sanitizes FTS operators from plain user text', () => {
    const sanitized = sanitizeFtsQuery('closure:"scope"* ^foo ~bar');
    expect(sanitized).toContain('"closure"*');
    expect(sanitized).toContain('"scope"*');
    expect(sanitized).not.toContain(':');
    expect(sanitized).not.toContain('^');
    expect(sanitized).not.toContain('~');
  });

  it('keeps single-character FTS tokens after escaping operators', () => {
    expect(sanitizeFtsQuery('x *')).toBe('"x"*');
  });

  it('computes RRF from ranks across sources', () => {
    const hit: RankedSearchHit = {
      kind: 'capture',
      id: captureId,
      source: 'vecCaptures',
      rank: 1,
      vecScore: 0.9,
      ftsScore: null,
      tier: 'hot',
      payload: captureMemory().payload,
    };
    const score = computeRrfScore(hit, {
      vecCaptures: [hit],
      vecConcepts: [],
      ftsCaptures: [{ ...hit, source: 'ftsCaptures', rank: 1, vecScore: null, ftsScore: 0.8 }],
      ftsConcepts: [],
    });
    expect(score).toBeCloseTo(2 / 61, 6);
  });

  it('rank comparator prefers concepts when score and RRF tie', () => {
    const sorted = [captureMemory(), conceptMemory()].sort(rankComparator);
    expect(sorted[0].kind).toBe('concept');
  });

  it('rank comparator falls back to created_at when last_accessed_at is absent', () => {
    const oldCapture = captureMemory({ id: captureId, score: 0.2, rrfScore: 0.2 });
    const newCapture = captureMemory({
      id: unsafeLearningCaptureId('lc_333333333333333333333'),
      score: 0.2,
      rrfScore: 0.2,
      payload: {
        ...captureMemory().payload,
        id: unsafeLearningCaptureId('lc_333333333333333333333'),
        createdAt: 200,
      },
    });
    expect([oldCapture, newCapture].sort(rankComparator)[0].id).toBe(newCapture.id);
  });

  it('uses last_accessed_at exponential recency and neutral-plus concept strength', () => {
    const now = 100 * 86_400_000;
    const hit: RankedSearchHit = {
      kind: 'concept',
      id: conceptId,
      source: 'vecConcepts',
      rank: 1,
      vecScore: 0.9,
      ftsScore: null,
      tier: 'hot',
      payload: {
        ...conceptMemory().payload,
        createdAt: now - 90 * 86_400_000,
        lastAccessedAt: now - 30 * 86_400_000,
        strength: 0.8,
      },
    };
    expect(computeRecencyFactor(hit, now)).toBeCloseTo(1 + 0.5 * Math.exp(-1), 6);
    expect(computeStrengthFactor(hit)).toBeCloseTo(1.2, 6);
  });

  it('uses a precomputed derived-chain set for capture filtering', () => {
    const rootId = unsafeLearningCaptureId('lc_444444444444444444444');
    const hit: RankedSearchHit = {
      kind: 'capture',
      id: captureId,
      source: 'ftsCaptures',
      rank: 1,
      vecScore: null,
      ftsScore: 1,
      tier: 'cold',
      payload: captureMemory().payload,
    };
    expect(matchesFilters(hit, { derivedChainRoot: rootId }, { derivedChainIds: new Set([captureId]) })).toBe(true);
    expect(matchesFilters(hit, { derivedChainRoot: rootId }, { derivedChainIds: new Set() })).toBe(false);
  });

  it('empty query short-circuits with diagnostics and no memories', async () => {
    const result = await retrieveRelevantMemories({ query: '   ' });
    expect(result.memories).toEqual([]);
    expect(result.diagnostics).toMatchObject({
      status: 'ok',
      vecCaptureHits: 0,
      ftsConceptHits: 0,
      totalCandidates: 0,
    });
  });

  it('formats injection deterministically with parseable memory ids and no numeric scores', () => {
    const memories = [conceptMemory(), captureMemory()];
    const first = formatMemoriesForInjection(memories, { tokenBudget: 1500, maxItems: 8 });
    const second = formatMemoriesForInjection(memories, { tokenBudget: 1500, maxItems: 8 });
    expect(first).toEqual(second);
    expect(first.text).toContain('[memoryIds: c_222222222222222222222, lc_111111111111111111111]');
    expect(first.text).not.toContain('familiarity');
    expect(first.text).not.toContain('importance');
    expect(first.text).not.toContain('0.46');
  });

  it('drops oversize injection items instead of truncating snippets', () => {
    const huge = captureMemory({
      payload: {
        ...captureMemory().payload,
        rawSnippet: 'x'.repeat(2000),
      },
    });
    const result = formatMemoriesForInjection([huge, conceptMemory()], {
      tokenBudget: 80,
      maxItems: 8,
    });
    expect(result.includedIds).toEqual([{ kind: 'concept', id: conceptId }]);
    expect(result.droppedCount).toBe(1);
    expect(result.text).not.toContain('x'.repeat(100));
  });

  it('respects maxItems before adding extra memories', () => {
    const result = formatMemoriesForInjection([conceptMemory(), captureMemory()], {
      tokenBudget: 1500,
      maxItems: 1,
    });
    expect(result.includedCount).toBe(1);
    expect(result.droppedCount).toBe(1);
  });

  it('GC eviction filters by strength, age, and state', async () => {
    const executedSql: string[] = [];
    const { getRawDb } = await import('../../../../db/client');
    
    const mockTx = {
      execute: vi.fn(async (sql: string, params: unknown[]) => {
        executedSql.push(sql);
        return { rows: [] };
      }),
    };
    
    vi.mocked(getRawDb).mockReturnValue({
      execute: vi.fn(async (sql: string, params?: unknown[]) => {
        executedSql.push(sql);
        if (sql.includes('SELECT c.id') && sql.includes('ORDER BY computed_strength ASC')) {
          expect(params?.[0]).toBe(0.3); // threshold parameter 0.3 for concept strength
          const cutoff = params?.[1] as number;
          expect(cutoff).toBeLessThan(Date.now() - 89 * 86_400_000); // ≈ now - 90 * 86_400_000
          
          return {
            rows: [
              { id: 'c_weak_old' } // assert only the weak old concept is selected
            ]
          };
        }
        if (sql.includes('SELECT lc.id') && sql.includes('ORDER BY COALESCE(lc.last_accessed_at')) {
          const cutoff = params?.[0] as number;
          expect(cutoff).toBeLessThan(Date.now() - 89 * 86_400_000); // ≈ now - 90 * 86_400_000
          
          return {
            rows: [
              { id: 'lc_old_linked' } // assert only the old linked capture is selected
            ]
          };
        }
        if (sql.includes('COUNT(*)')) {
          return { rows: [{ n: 6000 }] };
        }
        return { rows: [] };
      }),
      transaction: vi.fn(async (fn: (tx: typeof mockTx) => Promise<void>) => fn(mockTx)),
    } as unknown as DB);

    await runHotColdGc();

    const captureSelect = executedSql.find(s => s.includes('SELECT lc.id') && s.includes('ORDER BY COALESCE(lc.last_accessed_at'));
    expect(captureSelect).toContain("state = 'linked'");
    
    const updates = executedSql.filter(s => s.includes('UPDATE'));
    const deletes = executedSql.filter(s => s.includes('DELETE'));

    expect(updates.some(s => s.includes("UPDATE concepts SET embedding_tier = 'cold' WHERE id = ?"))).toBe(true);
    expect(updates.some(s => s.includes("UPDATE learning_captures SET embedding_tier = 'cold' WHERE id = ?"))).toBe(true);
    expect(deletes.some(s => s.includes("DELETE FROM embeddings_vec"))).toBe(true);
    expect(deletes.some(s => s.includes("DELETE FROM embeddings_meta"))).toBe(true);
    
    // Check that we only execute for the selected rows
    expect(mockTx.execute).toHaveBeenCalledWith(expect.stringContaining('embeddings_vec'), ['c_weak_old']);
    expect(mockTx.execute).toHaveBeenCalledWith(expect.stringContaining('embeddings_vec'), ['lc_old_linked']);
  });

  it('enforces content-immutability invariant under retrieval and rehydration', async () => {
    const executedSql: string[] = [];
    const { getRawDb } = await import('../../../../db/client');
    
    const mockTx = {
      execute: vi.fn(async (sql: string, params: unknown[]) => {
        executedSql.push(sql);
        return { rows: [] };
      }),
    };
    
    vi.mocked(getRawDb).mockReturnValue({
      execute: vi.fn(async (sql: string, params?: unknown[]) => {
        executedSql.push(sql);
        if (sql.includes('SELECT embedding_tier')) {
          return { rows: [{ embedding_tier: 'cold' }] };
        }
        return { rows: [] };
      }),
      transaction: vi.fn(async (fn: (tx: typeof mockTx) => Promise<void>) => fn(mockTx)),
    } as unknown as DB);

    const fullCapture: LearningCapture = {
      id: captureId,
      title: 'test',
      whatClicked: 'test clicked',
      whyItMattered: null,
      rawSnippet: 'test snippet',
      snippetLang: 'typescript',
      snippetSource: null,
      chatMessageId: null,
      sessionId: 'session-a',
      state: 'unresolved',
      linkedConceptId: null,
      editableUntil: 0,
      extractionConfidence: null,
      derivedFromCaptureId: null,
      embeddingStatus: 'ready',
      embeddingRetryCount: 0,
      conceptHint: null,
      keywords: [],
      createdAt: 100,
      updatedAt: 100,
    };
    vi.mocked(getCaptureById).mockResolvedValue(fullCapture);

    await retrieveRelevantMemories({ query: 'closure' });
    await ensureEmbedded({ kind: 'capture', id: captureId });

    const updates = executedSql.filter(s => s.includes('UPDATE'));
    
    // The only UPDATEs touching learning_captures / concepts name columns from this allowlist:
    // embedding_tier, last_accessed_at, embedding_status, embedding_retry_count
    for (const update of updates) {
      expect(update).not.toMatch(/raw_snippet|what_clicked|why_it_mattered|concept_hint_json|familiarity_score|importance_score/);
      
      const isAllowed = /embedding_tier|last_accessed_at|embedding_status|embedding_retry_count/.test(update);
      expect(isAllowed).toBe(true);
    }
  });

  it('covers all matchesFilters filter paths', () => {
    const cap: RankedSearchHit = {
      kind: 'capture',
      id: captureId,
      source: 'ftsCaptures',
      rank: 1,
      vecScore: null,
      ftsScore: 1,
      tier: 'cold',
      payload: captureMemory().payload,
    };
    const con: RankedSearchHit = {
      kind: 'concept',
      id: conceptId,
      source: 'ftsConcepts',
      rank: 1,
      vecScore: null,
      ftsScore: 1,
      tier: 'cold',
      payload: conceptMemory().payload,
    };
    
    // states
    expect(matchesFilters(cap, { states: ['unresolved'] })).toBe(true);
    expect(matchesFilters(cap, { states: ['linked'] })).toBe(false);
    
    // conceptTypes
    expect(matchesFilters(con, { conceptTypes: ['mechanism'] })).toBe(true);
    expect(matchesFilters(con, { conceptTypes: ['pattern'] })).toBe(false);
    
    // sessionIds
    expect(matchesFilters(cap, { sessionIds: ['session-a'] })).toBe(true);
    expect(matchesFilters(cap, { sessionIds: ['session-b'] })).toBe(false);
    
    // languages (capture)
    expect(matchesFilters(cap, { languages: ['typescript'] })).toBe(true);
    expect(matchesFilters(cap, { languages: ['python'] })).toBe(false);
    
    // languages (concept)
    expect(matchesFilters(con, { languages: ['typescript'] })).toBe(true);
    expect(matchesFilters(con, { languages: ['python'] })).toBe(false);
    
    // minCreatedAt
    expect(matchesFilters(cap, { minCreatedAt: 50 })).toBe(true);
    expect(matchesFilters(cap, { minCreatedAt: 150 })).toBe(false);
    
    // maxCreatedAt
    expect(matchesFilters(con, { maxCreatedAt: 100 })).toBe(true);
    expect(matchesFilters(con, { maxCreatedAt: 50 })).toBe(false);
    
    // excludeIds
    expect(matchesFilters(cap, { excludeIds: [captureId] })).toBe(false);
    expect(matchesFilters(cap, { excludeIds: [conceptId] })).toBe(true);
    
    // kinds
    expect(matchesFilters(cap, { kinds: ['capture'] })).toBe(true);
    expect(matchesFilters(con, { kinds: ['capture'] })).toBe(false);
  });
});
