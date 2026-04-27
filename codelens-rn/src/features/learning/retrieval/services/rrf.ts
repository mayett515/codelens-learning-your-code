import type { RankedSearchHit, RetrievedMemory, RetrievalSource } from '../types/retrieval';

const RRF_K = 60;

export function computeRrfScore(
  hit: { kind: string; id: string },
  lists: Record<RetrievalSource, RankedSearchHit[]>,
): number {
  let score = 0;
  for (const list of Object.values(lists)) {
    const rank = list.findIndex((item) => item.kind === hit.kind && item.id === hit.id);
    if (rank >= 0) score += 1 / (RRF_K + rank + 1);
  }
  return score;
}

export function rankComparator(left: RetrievedMemory, right: RetrievedMemory): number {
  const byScore = right.score - left.score;
  if (byScore !== 0) return byScore;
  const byRrf = right.rrfScore - left.rrfScore;
  if (byRrf !== 0) return byRrf;
  if (left.kind !== right.kind) return left.kind === 'concept' ? -1 : 1;
  const leftAccessed = left.payload.lastAccessedAt ?? left.payload.createdAt;
  const rightAccessed = right.payload.lastAccessedAt ?? right.payload.createdAt;
  if (leftAccessed !== rightAccessed) return rightAccessed - leftAccessed;
  return String(left.id).localeCompare(String(right.id));
}
