import { asc, desc, eq, inArray } from 'drizzle-orm';
import { db, type DbOrTx } from '../../../../db/client';
import { promotionSuggestionsCache } from './schema';
import { suggestionRowToDomain, validateSuggestionForWrite } from '../codecs/cluster';
import type { LearningCaptureId } from '../../types/ids';
import type { PromotionSuggestion } from '../types/promotion';

export async function replaceSuggestionsCache(
  suggestions: PromotionSuggestion[],
  computedAt: number,
  executor: DbOrTx = db,
): Promise<void> {
  await executor.delete(promotionSuggestionsCache);
  for (const suggestion of suggestions) {
    await upsertSuggestion({ ...suggestion, computedAt }, executor);
  }
}

export async function upsertSuggestion(
  suggestion: PromotionSuggestion,
  executor: DbOrTx = db,
): Promise<void> {
  const valid = validateSuggestionForWrite(suggestion);
  await executor
    .insert(promotionSuggestionsCache)
    .values({
      clusterFingerprint: valid.fingerprint,
      captureIds: valid.captureIds,
      proposedName: valid.proposedName,
      proposedNormalizedKey: valid.proposedNormalizedKey,
      proposedConceptType: valid.proposedConceptType,
      sharedKeywords: valid.sharedKeywords,
      sessionCount: valid.sessionCount,
      captureCount: valid.captureIds.length,
      meanSimilarity: valid.meanSimilarity,
      avgExtractionConfidence: valid.avgExtractionConfidence,
      clusterScore: valid.clusterScore,
      maxCaptureCreatedAt: valid.maxCreatedAt,
      computedAt: valid.computedAt,
    })
    .onConflictDoUpdate({
      target: promotionSuggestionsCache.clusterFingerprint,
      set: {
        captureIds: valid.captureIds,
        proposedName: valid.proposedName,
        proposedNormalizedKey: valid.proposedNormalizedKey,
        proposedConceptType: valid.proposedConceptType,
        sharedKeywords: valid.sharedKeywords,
        sessionCount: valid.sessionCount,
        captureCount: valid.captureIds.length,
        meanSimilarity: valid.meanSimilarity,
        avgExtractionConfidence: valid.avgExtractionConfidence,
        clusterScore: valid.clusterScore,
        maxCaptureCreatedAt: valid.maxCreatedAt,
        computedAt: valid.computedAt,
      },
    });
}

export async function getPromotionSuggestions(
  limit?: number,
  executor: DbOrTx = db,
): Promise<PromotionSuggestion[]> {
  const query = executor
    .select()
    .from(promotionSuggestionsCache)
    .orderBy(
      desc(promotionSuggestionsCache.clusterScore),
      desc(promotionSuggestionsCache.captureCount),
      desc(promotionSuggestionsCache.maxCaptureCreatedAt),
      asc(promotionSuggestionsCache.clusterFingerprint),
    );
  const rows = typeof limit === 'number' ? await query.limit(limit) : await query;
  return rows.map(suggestionRowToDomain);
}

export async function getSuggestionByFingerprint(
  fingerprint: string,
  executor: DbOrTx = db,
): Promise<PromotionSuggestion | undefined> {
  const rows = await executor
    .select()
    .from(promotionSuggestionsCache)
    .where(eq(promotionSuggestionsCache.clusterFingerprint, fingerprint));
  return rows[0] ? suggestionRowToDomain(rows[0]) : undefined;
}

export async function removeSuggestionByFingerprint(
  fingerprint: string,
  executor: DbOrTx = db,
): Promise<void> {
  await executor
    .delete(promotionSuggestionsCache)
    .where(eq(promotionSuggestionsCache.clusterFingerprint, fingerprint));
}

export async function removeSuggestionsContainingCapture(
  captureId: LearningCaptureId,
  executor: DbOrTx = db,
): Promise<void> {
  const suggestions = await getPromotionSuggestions(undefined, executor);
  const fingerprints = suggestions
    .filter((suggestion) => suggestion.captureIds.includes(captureId))
    .map((suggestion) => suggestion.fingerprint);
  if (fingerprints.length === 0) return;
  await executor
    .delete(promotionSuggestionsCache)
    .where(inArray(promotionSuggestionsCache.clusterFingerprint, fingerprints));
}

export async function lastComputedAt(executor: DbOrTx = db): Promise<number | null> {
  const rows = await executor
    .select()
    .from(promotionSuggestionsCache)
    .orderBy(desc(promotionSuggestionsCache.computedAt))
    .limit(1);
  return rows[0]?.computedAt ?? null;
}
