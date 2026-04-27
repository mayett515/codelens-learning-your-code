import { desc, eq } from 'drizzle-orm';
import { db, type DbOrTx } from '../../../../db/client';
import { reviewEvents } from './schema';
import { reviewEventRowToDomain } from '../codecs/reviewEvent';
import type { ConceptId } from '../../types/ids';
import type { ReviewEvent } from '../types/review';

export async function insertReviewEvent(
  event: ReviewEvent,
  executor: DbOrTx = db,
): Promise<void> {
  await executor.insert(reviewEvents).values({
    id: event.id,
    conceptId: event.conceptId,
    rating: event.rating,
    delta: event.delta,
    familiarityBefore: event.familiarityBefore,
    familiarityAfter: event.familiarityAfter,
    userRecallText: event.userRecallText,
    createdAt: event.createdAt,
  });
}

export async function getReviewEventsForConcept(
  conceptId: ConceptId,
  executor: DbOrTx = db,
): Promise<ReviewEvent[]> {
  const rows = await executor
    .select()
    .from(reviewEvents)
    .where(eq(reviewEvents.conceptId, conceptId))
    .orderBy(desc(reviewEvents.createdAt));
  return rows.map(reviewEventRowToDomain);
}
