import { eq } from 'drizzle-orm';
import { db, type DbOrTx } from '../../../../db/client';
import { promotionDismissals } from './schema';
import { dismissalRowToDomain } from '../codecs/cluster';
import type { PromotionDismissal } from '../types/promotion';

export async function getDismissals(executor: DbOrTx = db): Promise<PromotionDismissal[]> {
  const rows = await executor.select().from(promotionDismissals);
  return rows.map(dismissalRowToDomain);
}

export async function upsertDismissal(
  dismissal: PromotionDismissal,
  executor: DbOrTx = db,
): Promise<void> {
  await executor
    .insert(promotionDismissals)
    .values({
      clusterFingerprint: dismissal.fingerprint,
      dismissedAt: dismissal.dismissedAt,
      captureIds: dismissal.captureIds,
      captureCount: dismissal.captureCount,
      isPermanent: dismissal.isPermanent,
      proposedNormalizedKey: dismissal.proposedNormalizedKey,
    })
    .onConflictDoUpdate({
      target: promotionDismissals.clusterFingerprint,
      set: {
        dismissedAt: dismissal.dismissedAt,
        captureIds: dismissal.captureIds,
        captureCount: dismissal.captureCount,
        isPermanent: dismissal.isPermanent,
        proposedNormalizedKey: dismissal.proposedNormalizedKey,
      },
    });
}

export async function removeDismissal(
  fingerprint: string,
  executor: DbOrTx = db,
): Promise<void> {
  await executor
    .delete(promotionDismissals)
    .where(eq(promotionDismissals.clusterFingerprint, fingerprint));
}
