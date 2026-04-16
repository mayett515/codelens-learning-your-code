import { getRawDb } from '../../../db/client';
import type { ConceptId } from '../../../domain/types';

export interface FtsMatch {
  id: ConceptId;
  /** FTS5 bm25 rank — lower is better. */
  rank: number;
}

/**
 * Keyword search against the concepts_fts virtual table.
 *
 * Works on ALL concepts (hot + cold), not just those with active vectors.
 * Used as the "cold tier" safety net when a vector has been evicted.
 */
export function searchConceptsByText(
  query: string,
  limit: number,
): FtsMatch[] {
  const sanitized = sanitizeFtsQuery(query);
  if (!sanitized) return [];

  const db = getRawDb();
  try {
    const result = db.executeSync(
      `SELECT id, rank FROM concepts_fts WHERE concepts_fts MATCH ? ORDER BY rank LIMIT ?`,
      [sanitized, limit],
    );
    const rows = (result.rows ?? []) as Array<{ id: string; rank: number }>;
    return rows.map((r) => ({ id: r.id as ConceptId, rank: r.rank }));
  } catch {
    // Malformed FTS expression — treat as no matches rather than crashing.
    return [];
  }
}

/**
 * Turns arbitrary text into a safe FTS5 MATCH expression.
 * Strips punctuation, drops short tokens, and applies prefix-search + OR.
 */
function sanitizeFtsQuery(query: string): string {
  const tokens = query
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length >= 2)
    .slice(0, 12); // cap for performance
  if (tokens.length === 0) return '';
  return tokens.map((t) => `${t}*`).join(' OR ');
}
