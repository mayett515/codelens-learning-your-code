import { unsafeConceptId, unsafeLearningCaptureId } from '../../types/ids';
import { knnSearch } from '../data/embeddingsVecRepo';
import { matchesFilters } from '../data/ftsRepo';
import { captureRowToRetrievedPayload, conceptRowToRetrievedPayload } from '../data/rowMappers';
import { getRawDb } from '../../../../db/client';
import type { RankedSearchHit, RetrieveFilters } from '../types/retrieval';
import type { RetrievalFilterContext } from '../data/ftsRepo';

function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(',');
}

export async function vecSearchCaptures(
  vector: Float32Array,
  k: number,
  filters?: RetrieveFilters,
  context?: RetrievalFilterContext,
): Promise<RankedSearchHit[]> {
  // embeddings_vec intentionally stores both capture (lc_) and concept (c_) owners.
  // The locked ID prefixes keep the shared vec table unambiguous.
  const hits = (await knnSearch(vector, k)).filter((hit) => hit.id.startsWith('lc_'));
  if (hits.length === 0) return [];
  const byId = new Map(hits.map((hit, index) => [hit.id, { ...hit, rank: index + 1 }]));
  const result = await getRawDb().execute(
    `SELECT lc.*, linked.name AS linked_concept_name
     FROM learning_captures lc
     LEFT JOIN concepts linked ON linked.id = lc.linked_concept_id
     WHERE lc.id IN (${placeholders(hits.length)})
       AND lc.embedding_tier = 'hot'
       AND lc.embedding_status = 'ready'`,
    hits.map((hit) => hit.id),
  );
  const mapped: RankedSearchHit[] = [];
  for (const row of result.rows) {
      const hit = byId.get(String(row.id));
      if (!hit) continue;
      const payload = captureRowToRetrievedPayload(row);
      mapped.push({
        kind: 'capture' as const,
        id: unsafeLearningCaptureId(String(row.id)),
        source: 'vecCaptures' as const,
        rank: hit.rank,
        vecScore: hit.score,
        ftsScore: null,
        tier: 'hot' as const,
        payload,
      });
  }
  return mapped
    .filter((hit) => matchesFilters(hit, filters, context))
    .sort((left, right) => left.rank - right.rank);
}

export async function vecSearchConcepts(
  vector: Float32Array,
  k: number,
  filters?: RetrieveFilters,
  context?: RetrievalFilterContext,
): Promise<RankedSearchHit[]> {
  // embeddings_vec intentionally stores both capture (lc_) and concept (c_) owners.
  // The locked ID prefixes keep the shared vec table unambiguous.
  const hits = (await knnSearch(vector, k)).filter((hit) => hit.id.startsWith('c_'));
  if (hits.length === 0) return [];
  const byId = new Map(hits.map((hit, index) => [hit.id, { ...hit, rank: index + 1 }]));
  const result = await getRawDb().execute(
    `SELECT *
     FROM concepts
     WHERE id IN (${placeholders(hits.length)})
       AND embedding_tier = 'hot'`,
    hits.map((hit) => hit.id),
  );
  const mapped: RankedSearchHit[] = [];
  for (const row of result.rows) {
      const hit = byId.get(String(row.id));
      if (!hit) continue;
      const payload = conceptRowToRetrievedPayload(row);
      mapped.push({
        kind: 'concept' as const,
        id: unsafeConceptId(String(row.id)),
        source: 'vecConcepts' as const,
        rank: hit.rank,
        vecScore: hit.score,
        ftsScore: null,
        tier: 'hot' as const,
        payload,
      });
  }
  return mapped
    .filter((hit) => matchesFilters(hit, filters, context))
    .sort((left, right) => left.rank - right.rank);
}
