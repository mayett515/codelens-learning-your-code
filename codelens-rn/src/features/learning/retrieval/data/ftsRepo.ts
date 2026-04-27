import { getRawDb } from '../../../../db/client';
import { unsafeConceptId, unsafeLearningCaptureId } from '../../types/ids';
import { captureRowToRetrievedPayload, conceptRowToRetrievedPayload } from './rowMappers';
import type { RankedSearchHit, RetrieveFilters } from '../types/retrieval';

export interface RetrievalFilterContext {
  derivedChainIds?: ReadonlySet<string>;
}

export function sanitizeFtsQuery(query: string): string {
  const tokens = query
    .toLowerCase()
    .split(/[^\p{L}\p{N}_#+-]+/u)
    .map((token) => token.replace(/["*^~:]/g, '').trim())
    .filter((token) => token.length >= 1)
    .slice(0, 12);
  return [...new Set(tokens)].map((token) => `"${token}"*`).join(' OR ');
}

export async function ftsSearchCaptureRows(
  query: string,
  limit: number,
  filters?: RetrieveFilters,
  context?: RetrievalFilterContext,
): Promise<RankedSearchHit[]> {
  const match = sanitizeFtsQuery(query);
  if (!match) return [];
  const rows = await getRawDb().execute(
    `SELECT lc.*, linked.name AS linked_concept_name, bm25(captures_fts) AS rank
     FROM captures_fts
     JOIN learning_captures lc ON lc.id = captures_fts.capture_id
     LEFT JOIN concepts linked ON linked.id = lc.linked_concept_id
     WHERE captures_fts MATCH ?
     ORDER BY rank
     LIMIT ?`,
    [match, Math.max(1, limit)],
  );
  return rows.rows
    .map((row, index) => {
      const payload = captureRowToRetrievedPayload(row);
      return {
        kind: 'capture' as const,
        id: unsafeLearningCaptureId(String(row.id)),
        source: 'ftsCaptures' as const,
        rank: index + 1,
        vecScore: null,
        ftsScore: 1 / (index + 1),
        tier: row.embedding_tier === 'hot' ? 'hot' as const : 'cold' as const,
        payload,
      };
    })
    .filter((hit) => matchesFilters(hit, filters, context));
}

export async function ftsSearchConceptRows(
  query: string,
  limit: number,
  filters?: RetrieveFilters,
  context?: RetrievalFilterContext,
): Promise<RankedSearchHit[]> {
  const match = sanitizeFtsQuery(query);
  if (!match) return [];
  const rows = await getRawDb().execute(
    `SELECT c.*, bm25(concepts_fts) AS rank
     FROM concepts_fts
     JOIN concepts c ON c.id = concepts_fts.concept_id
     WHERE concepts_fts MATCH ?
     ORDER BY rank
     LIMIT ?`,
    [match, Math.max(1, limit)],
  );
  return rows.rows
    .filter((row) => String(row.id).startsWith('c_'))
    .map((row, index) => {
      const payload = conceptRowToRetrievedPayload(row);
      return {
        kind: 'concept' as const,
        id: unsafeConceptId(String(row.id)),
        source: 'ftsConcepts' as const,
        rank: index + 1,
        vecScore: null,
        ftsScore: 1 / (index + 1),
        tier: row.embedding_tier === 'hot' ? 'hot' as const : 'cold' as const,
        payload,
      };
    })
    .filter((hit) => matchesFilters(hit, filters, context));
}

export function matchesFilters(
  hit: RankedSearchHit,
  filters?: RetrieveFilters,
  context?: RetrievalFilterContext,
): boolean {
  if (!filters) return true;
  if (filters.excludeIds?.some((id) => id === hit.id)) return false;
  if (filters.kinds && !filters.kinds.includes(hit.kind)) return false;

  const createdAt = hit.payload.createdAt;
  if (filters.minCreatedAt !== undefined && createdAt < filters.minCreatedAt) return false;
  if (filters.maxCreatedAt !== undefined && createdAt > filters.maxCreatedAt) return false;

  if (hit.kind === 'capture') {
    const payload = hit.payload;
    if (filters.states && !filters.states.includes(payload.state)) return false;
    if (filters.sessionIds && (!payload.sessionId || !filters.sessionIds.includes(payload.sessionId))) return false;
    if (filters.languages && (!payload.snippetLang || !filters.languages.some((lang) => lang.toLowerCase() === payload.snippetLang?.toLowerCase()))) return false;
    if (filters.derivedChainRoot && !context?.derivedChainIds?.has(payload.id)) return false;
    return true;
  }

  const payload = hit.payload;
  if (filters.conceptTypes && !filters.conceptTypes.includes(payload.conceptType)) return false;
  if (filters.languages) {
    const conceptLanguages = new Set(payload.languageOrRuntime.map((value) => value.toLowerCase()));
    if (!filters.languages.some((lang) => conceptLanguages.has(lang.toLowerCase()))) return false;
  }
  return true;
}
