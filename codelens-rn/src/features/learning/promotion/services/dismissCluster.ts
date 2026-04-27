import { db } from '../../../../db/client';
import { removeDismissal, upsertDismissal } from '../data/dismissalsRepo';
import { removeSuggestionByFingerprint } from '../data/suggestionsCacheRepo';
import { maybeRecomputeSuggestions } from './maybeRecomputeSuggestions';
import type { PromotionSuggestion } from '../types/promotion';

export async function dismissCluster(
  suggestion: PromotionSuggestion,
  isPermanent = false,
  now = Date.now(),
): Promise<void> {
  await db.transaction(async (tx) => {
    await upsertDismissal(
      {
        fingerprint: suggestion.fingerprint,
        dismissedAt: now,
        captureIds: suggestion.captureIds,
        captureCount: suggestion.captureIds.length,
        isPermanent,
        proposedNormalizedKey: suggestion.proposedNormalizedKey,
      },
      tx,
    );
    await removeSuggestionByFingerprint(suggestion.fingerprint, tx);
  });
  await maybeRecomputeSuggestions('post_dismiss');
}

export async function restoreDismissal(fingerprint: string): Promise<void> {
  await removeDismissal(fingerprint);
  await maybeRecomputeSuggestions('post_dismiss');
}
