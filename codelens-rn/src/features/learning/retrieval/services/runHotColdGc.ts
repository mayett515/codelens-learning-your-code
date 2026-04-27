import { getRawDb } from '../../../../db/client';
import { waitForRetrievalQuiet, withGcActivity } from './activity';

export const HOT_TIER_LIMIT = 5000;
export const GC_BATCH_TARGET = 4500;
const EVICTION_MIN_AGE_MS = 90 * 86_400_000;
const EVICTION_MAX_STRENGTH = 0.3;

export interface HotColdGcResult {
  evicted: number;
  remaining: number;
  corrected: number;
}

let running = false;

export async function runHotColdGc(options: {
  hotTierLimit?: number;
  target?: number;
} = {}): Promise<HotColdGcResult> {
  if (running) return { evicted: 0, remaining: await countVectors(), corrected: 0 };
  running = true;
  try {
    return await withGcActivity(async () => {
    const quiet = await waitForRetrievalQuiet();
    if (!quiet) return { evicted: 0, remaining: await countVectors(), corrected: 0 };
    const corrected = await reconcileTierDrift();
    const hotTierLimit = options.hotTierLimit ?? HOT_TIER_LIMIT;
    const target = options.target ?? GC_BATCH_TARGET;
    const count = await countVectors();
    if (count <= hotTierLimit) return { evicted: 0, remaining: count, corrected };

    let active = count;
    const toEvict = Math.max(0, active - target);
    const candidates = await selectEvictionCandidates(toEvict);
    if (candidates.length === 0) return { evicted: 0, remaining: count, corrected };

    const raw = getRawDb();
    let evicted = 0;
    for (const candidate of candidates) {
      if (active <= target) break;
      await raw.transaction(async (tx) => {
        await tx.execute('DELETE FROM embeddings_vec WHERE concept_id = ?', [candidate.id]);
        await tx.execute('DELETE FROM embeddings_meta WHERE concept_id = ?', [candidate.id]);
        await tx.execute(
          candidate.kind === 'capture'
            ? `UPDATE learning_captures SET embedding_tier = 'cold' WHERE id = ?`
            : `UPDATE concepts SET embedding_tier = 'cold' WHERE id = ?`,
          [candidate.id],
        );
      });
      evicted += 1;
      active -= 1;
    }

    return { evicted, remaining: active, corrected };
    });
  } finally {
    running = false;
  }
}

async function countVectors(): Promise<number> {
  const result = await getRawDb().execute('SELECT COUNT(*) AS n FROM embeddings_vec');
  return Number(result.rows[0]?.n ?? 0);
}

async function reconcileTierDrift(): Promise<number> {
  const raw = getRawDb();
  const captureResult = await raw.execute(
    `SELECT lc.id
     FROM learning_captures lc
     LEFT JOIN embeddings_vec v ON v.concept_id = lc.id
     WHERE lc.embedding_tier = 'hot' AND v.concept_id IS NULL`,
  );
  const conceptResult = await raw.execute(
    `SELECT c.id
     FROM concepts c
     LEFT JOIN embeddings_vec v ON v.concept_id = c.id
     WHERE c.embedding_tier = 'hot' AND v.concept_id IS NULL`,
  );
  const captureIds = captureResult.rows.map((row) => String(row.id));
  const conceptIds = conceptResult.rows.map((row) => String(row.id));
  if (captureIds.length === 0 && conceptIds.length === 0) {
    return 0;
  }
  await raw.transaction(async (tx) => {
    for (const id of captureIds) {
      await tx.execute(`UPDATE learning_captures SET embedding_tier = 'cold' WHERE id = ?`, [id]);
    }
    for (const id of conceptIds) {
      await tx.execute(`UPDATE concepts SET embedding_tier = 'cold' WHERE id = ?`, [id]);
    }
  });
  return captureIds.length + conceptIds.length;
}

async function selectEvictionCandidates(limit: number): Promise<Array<{ kind: 'capture' | 'concept'; id: string }>> {
  const raw = getRawDb();
  const cutoffMs = Date.now() - EVICTION_MIN_AGE_MS;
  const conceptRows = await raw.execute(
    `SELECT c.id AS id,
            (0.7 * c.familiarity_score + 0.4 * c.importance_score) AS computed_strength,
            CAST(strftime('%s', c.created_at) AS INTEGER) * 1000 AS created_at_ms
     FROM concepts c
     INNER JOIN embeddings_vec v ON v.concept_id = c.id
     WHERE c.embedding_tier = 'hot'
       AND (0.7 * c.familiarity_score + 0.4 * c.importance_score) < ?
       AND COALESCE(c.last_accessed_at, CAST(strftime('%s', c.created_at) AS INTEGER) * 1000) < ?
     ORDER BY computed_strength ASC,
       COALESCE(c.last_accessed_at, CAST(strftime('%s', c.created_at) AS INTEGER) * 1000) ASC,
       c.created_at ASC
     LIMIT ?`,
    [EVICTION_MAX_STRENGTH, cutoffMs, limit],
  );
  const candidates = conceptRows.rows.map((row) => ({ kind: 'concept' as const, id: String(row.id) }));
  const remaining = limit - candidates.length;
  if (remaining <= 0) return candidates;
  const captureRows = await raw.execute(
    `SELECT lc.id AS id
     FROM learning_captures lc
     INNER JOIN embeddings_vec v ON v.concept_id = lc.id
     WHERE lc.embedding_tier = 'hot'
       AND lc.state = 'linked'
       AND COALESCE(lc.last_accessed_at, lc.created_at) < ?
     ORDER BY COALESCE(lc.last_accessed_at, lc.created_at) ASC, lc.created_at ASC
     LIMIT ?`,
    [cutoffMs, remaining],
  );
  return [
    ...candidates,
    ...captureRows.rows.map((row) => ({ kind: 'capture' as const, id: String(row.id) })),
  ];
}
