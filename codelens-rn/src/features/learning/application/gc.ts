import { getRawDb } from '../../../db/client';

/** Soft cap on active vectors in embeddings_vec. Above this, GC runs. */
export const HOT_TIER_LIMIT = 5000;
/** After GC, vectors are trimmed down to this count. */
export const GC_BATCH_TARGET = 4500;
/** Concepts younger than this are never evicted. */
const EVICTION_MIN_AGE_DAYS = 90;
/** Concepts stronger than this are never evicted. */
const EVICTION_MAX_STRENGTH = 0.3;

export interface GcResult {
  evicted: number;
  remaining: number;
}

/**
 * Cold-tier eviction — removes vectors for weak + old concepts from
 * embeddings_vec when the hot tier exceeds its size limit. Concepts
 * themselves stay intact in the concepts table; they remain searchable
 * via concepts_fts and will be rehydrated via ensureEmbedded on next
 * access (see retrieve.ts JIT rehydration).
 *
 * Safe to call on app boot — fast no-op when count is below the limit.
 */
export async function runVectorGC(options?: {
  hotTierLimit?: number;
  target?: number;
}): Promise<GcResult> {
  const limit = options?.hotTierLimit ?? HOT_TIER_LIMIT;
  const target = options?.target ?? GC_BATCH_TARGET;
  const db = getRawDb();

  const countResult = db.executeSync(
    'SELECT COUNT(*) AS n FROM embeddings_vec',
  );
  const count = (countResult.rows[0]?.['n'] as number | undefined) ?? 0;

  if (count <= limit) {
    return { evicted: 0, remaining: count };
  }

  const toEvict = count - target;
  const cutoffIso = new Date(
    Date.now() - EVICTION_MIN_AGE_DAYS * 86_400_000,
  ).toISOString();

  // Find eviction candidates — weakest + oldest first.
  const candidateResult = db.executeSync(
    `SELECT c.id AS id
     FROM concepts c
     INNER JOIN embeddings_vec v ON v.concept_id = c.id
     WHERE c.strength < ? AND c.updated_at < ?
     ORDER BY c.strength ASC, c.updated_at ASC
     LIMIT ?`,
    [EVICTION_MAX_STRENGTH, cutoffIso, toEvict],
  );

  const ids = (candidateResult.rows ?? [])
    .map((r) => r['id'] as string | undefined)
    .filter((id): id is string => typeof id === 'string');

  if (ids.length === 0) {
    return { evicted: 0, remaining: count };
  }

  const placeholders = ids.map(() => '?').join(',');
  db.executeSync(
    `DELETE FROM embeddings_vec WHERE concept_id IN (${placeholders})`,
    ids,
  );
  db.executeSync(
    `DELETE FROM embeddings_meta WHERE concept_id IN (${placeholders})`,
    ids,
  );

  return { evicted: ids.length, remaining: count - ids.length };
}
