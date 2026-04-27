import { conceptSignature } from '../../lib/hash';
import { l2Normalize } from '../../lib/l2';
import { withCriticalWriteActivity } from '../../retrieval/services/activity';
import type { ConceptId as LegacyConceptId } from '../../../../domain/types';
import type { LearningConcept } from '../../types/learning';

export interface ConceptEmbeddingQueue {
  enqueue(concept: LearningConcept): void;
}

export const defaultConceptEmbeddingQueue: ConceptEmbeddingQueue = {
  enqueue(concept) {
    const run = async () => {
      const text = buildLearningConceptEmbeddingText(concept);
      const [{ getEmbedConfig }, { enqueueEmbed }] = await Promise.all([
        import('../../../../ai/scopes'),
        import('../../../../ai/embed'),
      ]);
      const embedConfig = getEmbedConfig();
      const raw = await enqueueEmbed(text, embedConfig.provider, embedConfig.model);
      const normalized = l2Normalize(raw);
      const { vectorStore } = await import('../../../../composition');
      await withCriticalWriteActivity(async () => {
        await vectorStore.upsert({
          id: concept.id as unknown as LegacyConceptId,
          vector: normalized,
          model: embedConfig.model,
          api: embedConfig.provider,
          signature: conceptSignature(text),
          updatedAt: new Date().toISOString(),
        });
      });
    };
    run().catch((error) => {
      console.warn('[learning/promotion] concept embedding failed after promotion', error);
    });
  },
};

export function buildLearningConceptEmbeddingText(concept: LearningConcept): string {
  return [
    concept.name,
    concept.canonicalSummary,
    concept.coreConcept,
    concept.architecturalPattern,
    concept.programmingParadigm,
    concept.conceptType,
    ...concept.languageOrRuntime,
    ...concept.surfaceFeatures,
  ]
    .filter((value): value is string => !!value)
    .join('\n');
}
