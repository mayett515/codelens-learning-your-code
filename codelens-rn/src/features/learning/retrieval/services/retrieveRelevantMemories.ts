import { getRawDb } from '../../../../db/client';
import { embedQuery } from './embedQuery';
import { ftsSearchCaptures, ftsSearchConcepts } from './ftsSearch';
import { vecSearchCaptures, vecSearchConcepts } from './vecSearch';
import { computeRrfScore, rankComparator } from './rrf';
import { computeRecencyFactor, computeStrengthFactor } from './secondaryFactors';
import { rehydrationQueue } from './rehydrationQueue';
import { withRetrievalActivity } from './activity';
import { parseRetrieveOptions } from '../codecs/retrieveOptions';
import type {
  RankedSearchHit,
  RetrieveDiagnostics,
  RetrieveOptions,
  RetrieveResult,
  RetrievedMemory,
  RetrievalSource,
} from '../types/retrieval';
import { RetrievalUnavailableError } from '../types/retrieval';

const DEFAULT_LIMIT = 8;
const SOURCE_TIMEOUT_MS = 1500;

export async function retrieveRelevantMemories(opts: RetrieveOptions): Promise<RetrieveResult> {
  return withRetrievalActivity(() => retrieveRelevantMemoriesInner(opts));
}

async function retrieveRelevantMemoriesInner(opts: RetrieveOptions): Promise<RetrieveResult> {
  opts = parseRetrieveOptions(opts);
  const startedAt = Date.now();
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const vecK = opts.vecK ?? Math.min(limit * 4, 200);
  const ftsK = opts.ftsK ?? Math.min(limit * 4, 200);
  const filters = opts.filters;
  const filterContext = await buildFilterContext(filters);

  if (opts.query.trim().length === 0) {
    return { memories: [], diagnostics: emptyDiagnostics(startedAt) };
  }

  const failedSources: RetrievalSource[] = [];
  const timedOutSources: RetrievalSource[] = [];
  const kinds = filters?.kinds ?? ['capture', 'concept'];
  const wantsCaptures = kinds.includes('capture');
  const wantsConcepts = kinds.includes('concept');

  let queryEmbedding: Float32Array | null = null;
  try {
    queryEmbedding = await embedQuery(opts.query);
  } catch {
    if (wantsCaptures) failedSources.push('vecCaptures');
    if (wantsConcepts) failedSources.push('vecConcepts');
  }

  const [vecCaps, vecCons, ftsCaps, ftsCons] = await Promise.all([
    queryEmbedding && wantsCaptures
      ? guardedSearch('vecCaptures', () => vecSearchCaptures(queryEmbedding, vecK, filters, filterContext), failedSources, timedOutSources)
      : Promise.resolve([]),
    queryEmbedding && wantsConcepts
      ? guardedSearch('vecConcepts', () => vecSearchConcepts(queryEmbedding, vecK, filters, filterContext), failedSources, timedOutSources)
      : Promise.resolve([]),
    wantsCaptures
      ? guardedSearch('ftsCaptures', () => ftsSearchCaptures(opts.query, ftsK, filters, filterContext), failedSources, timedOutSources)
      : Promise.resolve([]),
    wantsConcepts
      ? guardedSearch('ftsConcepts', () => ftsSearchConcepts(opts.query, ftsK, filters, filterContext), failedSources, timedOutSources)
      : Promise.resolve([]),
  ]);

  const vecAvailable = (!wantsCaptures || !failedSources.includes('vecCaptures'))
    && (!wantsConcepts || !failedSources.includes('vecConcepts'))
    && (!wantsCaptures || !timedOutSources.includes('vecCaptures'))
    && (!wantsConcepts || !timedOutSources.includes('vecConcepts'));
  const ftsAvailable = (!wantsCaptures || !failedSources.includes('ftsCaptures'))
    && (!wantsConcepts || !failedSources.includes('ftsConcepts'))
    && (!wantsCaptures || !timedOutSources.includes('ftsCaptures'))
    && (!wantsConcepts || !timedOutSources.includes('ftsConcepts'));

  if (!vecAvailable && !ftsAvailable) {
    throw new RetrievalUnavailableError('All retrieval backends unavailable', {
      failedSources: [...new Set([...failedSources, ...timedOutSources])],
    });
  }

  const lists = { vecCaptures: vecCaps, vecConcepts: vecCons, ftsCaptures: ftsCaps, ftsConcepts: ftsCons };
  const candidates = mergeAndDedup(lists);
  const ranked: RetrievedMemory[] = candidates.map((candidate) => {
    const rrfScore = computeRrfScore(candidate, lists);
    const recencyFactor = computeRecencyFactor(candidate);
    const strengthFactor = computeStrengthFactor(candidate);
    const score = rrfScore * recencyFactor * strengthFactor;
    if (candidate.kind === 'capture') {
      const memory: RetrievedMemory = {
        kind: 'capture',
        id: candidate.id,
        score,
        rrfScore,
        vecScore: candidate.vecScore,
        ftsScore: candidate.ftsScore,
        recencyFactor,
        strengthFactor,
        tier: candidate.tier,
        payload: candidate.payload,
      };
      return memory;
    }
    const memory: RetrievedMemory = {
      kind: 'concept',
      id: candidate.id,
      score,
      rrfScore,
      vecScore: candidate.vecScore,
      ftsScore: candidate.ftsScore,
      recencyFactor,
      strengthFactor,
      tier: candidate.tier,
      payload: candidate.payload,
    };
    return memory;
  }).sort(rankComparator);

  const top = ranked.slice(0, limit);
  let lastAccessedBumpFailed = false;
  if (opts.bumpLastAccessed !== false && top.length > 0) {
    try {
      await bumpLastAccessed(top.map((item) => ({ kind: item.kind, id: String(item.id) })));
    } catch {
      lastAccessedBumpFailed = true;
    }
  }

  let rehydrationEnqueued = 0;
  if (opts.enableJitRehydration !== false) {
    const cold = top
      .filter((item) => item.tier === 'cold')
      .map((item) => ({ kind: item.kind, id: item.id }));
    rehydrationQueue.enqueueMany(cold);
    rehydrationEnqueued = cold.length;
  }

  const status: RetrieveDiagnostics['status'] =
    failedSources.length === 0 && timedOutSources.length === 0 ? 'ok' : 'partial';

  return {
    memories: top,
    diagnostics: {
      status,
      vecAvailable,
      ftsAvailable,
      failedSources: [...new Set(failedSources)],
      timedOutSources: [...new Set(timedOutSources)],
      partialReason: status === 'partial' ? buildPartialReason(failedSources, timedOutSources) : null,
      vecCaptureHits: vecCaps.length,
      vecConceptHits: vecCons.length,
      ftsCaptureHits: ftsCaps.length,
      ftsConceptHits: ftsCons.length,
      totalCandidates: candidates.length,
      rehydrationEnqueued,
      lastAccessedBumpFailed,
      durationMs: Date.now() - startedAt,
    },
  };
}

async function guardedSearch(
  source: RetrievalSource,
  fn: () => Promise<RankedSearchHit[]>,
  failedSources: RetrievalSource[],
  timedOutSources: RetrievalSource[],
): Promise<RankedSearchHit[]> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fn(),
      new Promise<RankedSearchHit[]>((resolve) => {
        timeoutId = setTimeout(() => {
          timedOutSources.push(source);
          resolve([]);
        }, SOURCE_TIMEOUT_MS);
      }),
    ]);
  } catch {
    failedSources.push(source);
    return [];
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function mergeAndDedup(lists: Record<RetrievalSource, RankedSearchHit[]>): RankedSearchHit[] {
  const byKey = new Map<string, RankedSearchHit>();
  for (const list of Object.values(lists)) {
    for (const hit of list) {
      const key = `${hit.kind}:${hit.id}`;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, hit);
        continue;
      }
      byKey.set(key, {
        ...existing,
        vecScore: existing.vecScore ?? hit.vecScore,
        ftsScore: existing.ftsScore ?? hit.ftsScore,
        tier: existing.tier === 'hot' || hit.tier === 'hot' ? 'hot' : 'cold',
      });
    }
  }
  return [...byKey.values()];
}

async function bumpLastAccessed(items: Array<{ kind: string; id: string }>): Promise<void> {
  const now = Date.now();
  const captureIds = items.filter((item) => item.kind === 'capture').map((item) => item.id);
  const conceptIds = items.filter((item) => item.kind === 'concept').map((item) => item.id);
  const raw = getRawDb();
  await raw.transaction(async (tx) => {
    if (captureIds.length > 0) {
      await tx.execute(
        `UPDATE learning_captures SET last_accessed_at = ? WHERE id IN (${captureIds.map(() => '?').join(',')})`,
        [now, ...captureIds],
      );
    }
    if (conceptIds.length > 0) {
      await tx.execute(
        `UPDATE concepts SET last_accessed_at = ? WHERE id IN (${conceptIds.map(() => '?').join(',')})`,
        [now, ...conceptIds],
      );
    }
  });
}

function emptyDiagnostics(startedAt: number): RetrieveDiagnostics {
  return {
    status: 'ok',
    vecAvailable: true,
    ftsAvailable: true,
    failedSources: [],
    timedOutSources: [],
    partialReason: null,
    vecCaptureHits: 0,
    vecConceptHits: 0,
    ftsCaptureHits: 0,
    ftsConceptHits: 0,
    totalCandidates: 0,
    rehydrationEnqueued: 0,
    lastAccessedBumpFailed: false,
    durationMs: Date.now() - startedAt,
  };
}

function buildPartialReason(failedSources: RetrievalSource[], timedOutSources: RetrievalSource[]): string {
  const failed = failedSources.length > 0 ? `failed: ${[...new Set(failedSources)].join(', ')}` : null;
  const timedOut = timedOutSources.length > 0 ? `timed out: ${[...new Set(timedOutSources)].join(', ')}` : null;
  return [failed, timedOut].filter(Boolean).join('; ');
}

async function buildFilterContext(filters: RetrieveOptions['filters']): Promise<{ derivedChainIds?: ReadonlySet<string> }> {
  if (!filters?.derivedChainRoot) return {};
  const result = await getRawDb().execute(
    `WITH RECURSIVE chain(id) AS (
       SELECT id FROM learning_captures WHERE id = ?
       UNION ALL
       SELECT lc.id FROM learning_captures lc
       INNER JOIN chain ON lc.derived_from_capture_id = chain.id
     )
     SELECT id FROM chain`,
    [filters.derivedChainRoot],
  );
  return {
    derivedChainIds: new Set(result.rows.map((row) => String(row.id))),
  };
}
