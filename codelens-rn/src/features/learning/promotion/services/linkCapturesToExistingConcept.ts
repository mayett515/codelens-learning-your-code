import { db, type DbOrTx } from '../../../../db/client';
import { getCapturesByIds, linkCaptureToConcept } from '../../data/captureRepo';
import {
  appendConceptLanguage,
  appendConceptSurfaceFeatures,
  getLearningConceptById,
} from '../../data/conceptRepo';
import { removeSuggestionByFingerprint } from '../data/suggestionsCacheRepo';
import { defaultConceptEmbeddingQueue, type ConceptEmbeddingQueue } from './conceptEmbedding';
import { maybeRecomputeSuggestions } from './maybeRecomputeSuggestions';
import { withCriticalWriteActivity } from '../../retrieval/services/activity';
import type { ConceptId, LearningCaptureId } from '../../types/ids';
import type { LearningCapture, LearningConcept } from '../../types/learning';
import type { LinkExistingInput, PromotionResult } from '../types/promotion';
import { EmptyPromotionError, PromotionCapturesChangedError } from '../types/promotion';

interface LinkExistingDeps {
  database: {
    transaction<T>(fn: (tx: DbOrTx) => Promise<T>): Promise<T>;
  };
  getTargetConcept: (id: ConceptId, executor?: DbOrTx) => Promise<LearningConcept | undefined>;
  getCaptures: (ids: LearningCaptureId[], executor?: DbOrTx) => Promise<LearningCapture[]>;
  linkCapture: (id: LearningCaptureId, conceptId: ConceptId, updatedAt: number, executor: DbOrTx) => Promise<void>;
  appendLanguage: (id: ConceptId, language: string, executor: DbOrTx) => Promise<void>;
  appendSurfaceFeatures: (id: ConceptId, surfaceFeatures: string[], executor: DbOrTx) => Promise<void>;
  removeSuggestion: (fingerprint: string, executor: DbOrTx) => Promise<void>;
  embeddingQueue: ConceptEmbeddingQueue;
  now: () => number;
  recompute: (reason: 'post_promote') => Promise<void>;
}

const defaultDeps: LinkExistingDeps = {
  database: db,
  getTargetConcept: getLearningConceptById,
  getCaptures: getCapturesByIds,
  linkCapture: linkCaptureToConcept,
  appendLanguage: appendConceptLanguage,
  appendSurfaceFeatures: appendConceptSurfaceFeatures,
  removeSuggestion: removeSuggestionByFingerprint,
  embeddingQueue: defaultConceptEmbeddingQueue,
  now: Date.now,
  recompute: maybeRecomputeSuggestions,
};

export async function linkCapturesToExistingConcept(
  input: LinkExistingInput,
  deps: Partial<LinkExistingDeps> = {},
): Promise<PromotionResult> {
  if (input.includedCaptureIds.length === 0) throw new EmptyPromotionError();
  const resolvedDeps = { ...defaultDeps, ...deps };
  const now = resolvedDeps.now();
  let target: LearningConcept | undefined;
  let linkedCaptureIds: LearningCaptureId[] = [];
  let skippedCaptureIds: LearningCaptureId[] = [];

  await withCriticalWriteActivity(() => resolvedDeps.database.transaction(async (tx) => {
    target = await resolvedDeps.getTargetConcept(input.targetConceptId, tx);
    if (!target) throw new PromotionCapturesChangedError();
    const captures = await resolvedDeps.getCaptures(input.includedCaptureIds, tx);
    const linkableCaptures = captures.filter((capture) => capture.linkedConceptId === null);
    if (linkableCaptures.length === 0) throw new PromotionCapturesChangedError();

    const languages = new Set<string>();
    for (const capture of linkableCaptures) {
      await resolvedDeps.linkCapture(capture.id, input.targetConceptId, now, tx);
      if (capture.snippetLang) {
        languages.add(capture.snippetLang);
      }
    }
    for (const language of languages) {
      await resolvedDeps.appendLanguage(input.targetConceptId, language, tx);
    }
    await resolvedDeps.appendSurfaceFeatures(input.targetConceptId, input.sharedKeywords ?? [], tx);
    if (input.fingerprint) {
      await resolvedDeps.removeSuggestion(input.fingerprint, tx);
    }

    linkedCaptureIds = linkableCaptures.map((capture) => capture.id);
    const linkedSet = new Set(linkedCaptureIds);
    skippedCaptureIds = input.includedCaptureIds.filter((id) => !linkedSet.has(id));
  }));

  if (target) resolvedDeps.embeddingQueue.enqueue(target);
  await resolvedDeps.recompute('post_promote');
  if (!target) throw new PromotionCapturesChangedError();
  return { conceptId: input.targetConceptId, concept: target, linkedCaptureIds, skippedCaptureIds };
}
