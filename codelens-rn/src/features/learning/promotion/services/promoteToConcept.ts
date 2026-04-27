import { db, type DbOrTx } from '../../../../db/client';
import { getCapturesByIds, linkCaptureToConcept } from '../../data/captureRepo';
import { getLearningConceptByNormalizedKey, insertLearningConcept } from '../../data/conceptRepo';
import { newConceptId } from '../../types/ids';
import { normalizeConceptKey } from '../../codecs/concept';
import { removeSuggestionByFingerprint } from '../data/suggestionsCacheRepo';
import { buildConceptFromCluster } from './buildConceptFromCluster';
import { defaultConceptEmbeddingQueue, type ConceptEmbeddingQueue } from './conceptEmbedding';
import { maybeRecomputeSuggestions } from './maybeRecomputeSuggestions';
import type { ConceptId } from '../../types/ids';
import type { LearningCaptureId } from '../../types/ids';
import type { LearningCapture, LearningConcept } from '../../types/learning';
import type { PromotionConfirmInput, PromotionResult } from '../types/promotion';
import { EmptyPromotionError, NormalizedKeyConflictError, PromotionCapturesChangedError } from '../types/promotion';

interface PromoteDeps {
  database: {
    transaction<T>(fn: (tx: DbOrTx) => Promise<T>): Promise<T>;
  };
  getCaptures: (ids: LearningCaptureId[], executor?: DbOrTx) => Promise<LearningCapture[]>;
  findConceptByNormalizedKey: (key: string, executor?: DbOrTx) => Promise<LearningConcept | undefined>;
  insertConcept: (concept: LearningConcept, executor: DbOrTx) => Promise<void>;
  linkCapture: (id: LearningCaptureId, conceptId: ConceptId, updatedAt: number, executor: DbOrTx) => Promise<void>;
  removeSuggestion: (fingerprint: string, executor: DbOrTx) => Promise<void>;
  embeddingQueue: ConceptEmbeddingQueue;
  now: () => number;
  newId: () => ConceptId;
  recompute: (reason: 'post_promote') => Promise<void>;
}

const defaultDeps: PromoteDeps = {
  database: db,
  getCaptures: getCapturesByIds,
  findConceptByNormalizedKey: getLearningConceptByNormalizedKey,
  insertConcept: insertLearningConcept,
  linkCapture: linkCaptureToConcept,
  removeSuggestion: removeSuggestionByFingerprint,
  embeddingQueue: defaultConceptEmbeddingQueue,
  now: Date.now,
  newId: newConceptId,
  recompute: maybeRecomputeSuggestions,
};

export async function promoteToConcept(
  input: PromotionConfirmInput,
  deps: Partial<PromoteDeps> = {},
): Promise<PromotionResult> {
  if (input.includedCaptureIds.length === 0) throw new EmptyPromotionError();
  const resolvedDeps = { ...defaultDeps, ...deps };
  const normalizedKey = normalizeConceptKey(input.name);
  const preflightConflict = await resolvedDeps.findConceptByNormalizedKey(normalizedKey);
  if (preflightConflict) throw new NormalizedKeyConflictError(preflightConflict);

  const conceptId = resolvedDeps.newId();
  const now = resolvedDeps.now();
  let concept: LearningConcept | undefined;
  let linkedCaptureIds: PromotionResult['linkedCaptureIds'] = [];
  let skippedCaptureIds: PromotionResult['skippedCaptureIds'] = [];

  await resolvedDeps.database.transaction(async (tx) => {
    const conflict = await resolvedDeps.findConceptByNormalizedKey(normalizedKey, tx);
    if (conflict) throw new NormalizedKeyConflictError(conflict);

    const captures = await resolvedDeps.getCaptures(input.includedCaptureIds, tx);
    const linkableCaptures = captures.filter((capture) => capture.linkedConceptId === null);
    if (linkableCaptures.length === 0) throw new PromotionCapturesChangedError();

    concept = buildConceptFromCluster(input, conceptId, linkableCaptures, now);
    await resolvedDeps.insertConcept(concept, tx);
    for (const capture of linkableCaptures) {
      await resolvedDeps.linkCapture(capture.id, conceptId, now, tx);
    }
    if (input.fingerprint) {
      await resolvedDeps.removeSuggestion(input.fingerprint, tx);
    }
    linkedCaptureIds = linkableCaptures.map((capture) => capture.id);
    const linkedSet = new Set(linkedCaptureIds);
    skippedCaptureIds = input.includedCaptureIds.filter((id) => !linkedSet.has(id));
  });

  if (concept) resolvedDeps.embeddingQueue.enqueue(concept);
  await resolvedDeps.recompute('post_promote');
  if (!concept) throw new PromotionCapturesChangedError();
  return { conceptId, concept, linkedCaptureIds, skippedCaptureIds };
}
