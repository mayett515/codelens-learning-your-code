import { computeClusters } from './computeClusters';
import { getDismissals } from '../data/dismissalsRepo';
import { replaceSuggestionsCache } from '../data/suggestionsCacheRepo';

export async function runPromotionClusterJob(now = Date.now()): Promise<void> {
  try {
    const clusters = await computeClusters({
      dismissals: getDismissals,
    });
    await replaceSuggestionsCache(clusters.map((cluster) => ({ ...cluster, computedAt: now })), now);
  } catch (error) {
    console.warn('[learning/promotion] cluster job failed; keeping existing cache', error);
  }
}
