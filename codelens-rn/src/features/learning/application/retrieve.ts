import { getEmbedConfig } from '../../../ai/scopes';
import { enqueueEmbed } from '../../../ai/embed';
import { l2Normalize } from '../lib/l2';
import { buildEmbeddingInput } from '../lib/embedding-input';
import { vectorStore } from '../../../composition';
import { getConceptById } from '../data/concepts';
import { searchConceptsByText } from '../data/fts';
import { ensureEmbedded } from './sync';
import type { Concept, ConceptId } from '../../../domain/types';

export interface RetrievalResult {
  concept: Concept;
  cosine: number;
  score: number;
  /** 'vec' = matched by active vector; 'fts' = keyword-only (cold tier). */
  source: 'vec' | 'fts';
}

export async function retrieveRelatedConcepts(
  queryText: string,
  options?: {
    limit?: number | undefined;
    excludeIds?: ConceptId[] | undefined;
  },
): Promise<RetrievalResult[]> {
  const limit = options?.limit ?? 5;
  const excludeSet = options?.excludeIds
    ? new Set<string>(options.excludeIds)
    : null;
  const fetchLimit = options?.excludeIds ? limit + options.excludeIds.length : limit;

  // --- Hot tier: semantic vector search ---
  const embedConfig = getEmbedConfig();
  const raw = await enqueueEmbed(queryText, embedConfig.provider, embedConfig.model);
  const normalized = l2Normalize(raw);

  const vecMatches = await vectorStore.topMatches({
    vector: normalized,
    limit: fetchLimit,
  });

  // --- Cold tier: FTS5 keyword search (covers evicted concepts) ---
  const ftsMatches = searchConceptsByText(queryText, fetchLimit);

  // Merge: vec matches win on score; FTS-only concepts get a synthetic score
  // strictly below the worst vec match so vec always ranks first.
  type MergedCandidate = { id: ConceptId; cosine: number; score: number; source: 'vec' | 'fts' };
  const byId = new Map<string, MergedCandidate>();

  for (const m of vecMatches) {
    byId.set(m.id, { id: m.id as ConceptId, cosine: m.cosine, score: m.score, source: 'vec' });
  }

  const worstVecScore = vecMatches.length > 0
    ? Math.min(...vecMatches.map((m) => m.score))
    : 1;

  ftsMatches.forEach((m, idx) => {
    if (byId.has(m.id)) return; // vec already has it — vec wins
    // Rank-based synthetic score, clamped below worst vec.
    const syntheticScore = Math.min(worstVecScore - 0.01, 1 / (idx + 2));
    byId.set(m.id, { id: m.id, cosine: 0, score: syntheticScore, source: 'fts' });
  });

  const ranked = [...byId.values()].sort((a, b) => b.score - a.score);
  const results: RetrievalResult[] = [];

  for (const match of ranked) {
    if (excludeSet?.has(match.id)) continue;
    if (results.length >= limit) break;

    const concept = await getConceptById(match.id);
    if (!concept) continue;

    results.push({
      concept,
      cosine: match.cosine,
      score: match.score,
      source: match.source,
    });

    // JIT rehydration: cold concept surfaced via FTS — promote it back to
    // the hot tier so future searches are faster and ranking is accurate.
    if (match.source === 'fts') {
      ensureEmbedded(match.id).catch(() => undefined);
    }
  }

  return results;
}

export async function findMergeCandidates(
  name: string,
  summary: string,
  excludeIds?: ConceptId[],
): Promise<RetrievalResult[]> {
  const embedConfig = getEmbedConfig();
  const text = buildEmbeddingInput(name, summary);
  const raw = await enqueueEmbed(text, embedConfig.provider, embedConfig.model);
  const normalized = l2Normalize(raw);

  const matches = await vectorStore.topMatches({
    vector: normalized,
    limit: 10,
  });

  const excludeSet = excludeIds ? new Set<string>(excludeIds) : null;
  const results: RetrievalResult[] = [];

  for (const match of matches) {
    if (excludeSet?.has(match.id)) continue;
    if (match.cosine < 0.85) continue;

    const concept = await getConceptById(match.id);
    if (!concept) continue;

    results.push({
      concept,
      cosine: match.cosine,
      score: match.score,
      source: 'vec',
    });
  }

  return results;
}
