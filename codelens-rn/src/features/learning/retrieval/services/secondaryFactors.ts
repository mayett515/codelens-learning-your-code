import type { RankedSearchHit } from '../types/retrieval';

const DAY_MS = 86_400_000;
const HALF_LIFE_DAYS = 30;

export function computeRecencyFactor(hit: RankedSearchHit, now = Date.now()): number {
  const referenceAt = hit.payload.lastAccessedAt ?? hit.payload.createdAt;
  const days = Math.max(0, (now - referenceAt) / DAY_MS);
  return Math.max(0.5, Math.min(1.5, 1 + 0.5 * Math.exp(-days / HALF_LIFE_DAYS)));
}

export function computeStrengthFactor(hit: RankedSearchHit): number {
  if (hit.kind === 'capture') return 1;
  return 1 + 0.25 * hit.payload.strength;
}
