import { lastComputedAt } from '../data/suggestionsCacheRepo';
import { runPromotionClusterJob } from '../clustering/clusterJob';

export const RECOMPUTE_COOLDOWN_MS = 15 * 60 * 1000;
export const POST_SAVE_DEBOUNCE_MS = 30 * 1000;

type RecomputeReason = 'hub_open' | 'pull_refresh' | 'post_save' | 'post_promote' | 'post_dismiss';

let running: Promise<void> | null = null;
let postSaveTimer: ReturnType<typeof setTimeout> | null = null;
let lastRunAtMemory: number | null = null;

export async function maybeRecomputeSuggestions(
  reason: RecomputeReason,
  now = Date.now(),
): Promise<void> {
  if (reason === 'post_save') {
    if (postSaveTimer) clearTimeout(postSaveTimer);
    postSaveTimer = setTimeout(() => {
      running = runPromotionClusterJob(Date.now()).finally(() => {
        running = null;
      });
    }, POST_SAVE_DEBOUNCE_MS);
    return;
  }

  const force = reason === 'pull_refresh' || reason === 'post_promote' || reason === 'post_dismiss';
  const persistedLastRunAt = await lastComputedAt();
  const lastRunAt = Math.max(persistedLastRunAt ?? 0, lastRunAtMemory ?? 0) || null;
  if (!force && lastRunAt !== null && now - lastRunAt < RECOMPUTE_COOLDOWN_MS) return;
  if (running) return running;

  running = runPromotionClusterJob(now).finally(() => {
    lastRunAtMemory = now;
    running = null;
  });
  return running;
}
