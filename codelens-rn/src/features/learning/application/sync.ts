import { getConceptById, getAllConcepts } from '../data/concepts';
import { getMetaByConceptId } from '../data/embeddings-meta';
import { getEmbedConfig } from '../../../ai/scopes';
import { enqueueEmbed } from '../../../ai/embed';
import { conceptSignature } from '../lib/hash';
import { buildEmbeddingInput } from '../lib/embedding-input';
import { l2Normalize } from '../lib/l2';
import { vectorStore } from '../../../composition';
import type { ConceptId } from '../../../domain/types';

export async function ensureEmbedded(conceptId: ConceptId, force = false): Promise<void> {
  const concept = await getConceptById(conceptId);
  if (!concept) return;

  const text = buildEmbeddingInput(concept.name, concept.summary, concept.taxonomy);
  const sig = conceptSignature(text);
  const embedConfig = getEmbedConfig();

  if (!force) {
    const meta = await getMetaByConceptId(conceptId);
    if (
      meta &&
      meta.signature === sig &&
      meta.model === embedConfig.model &&
      meta.api === embedConfig.provider
    ) {
      return;
    }
  }
  const raw = await enqueueEmbed(text, embedConfig.provider, embedConfig.model);
  const normalized = l2Normalize(raw);

  await vectorStore.upsert({
    id: conceptId,
    vector: normalized,
    model: embedConfig.model,
    api: embedConfig.provider,
    signature: sig,
    updatedAt: new Date().toISOString(),
  });
}

export async function syncPendingEmbeddings(): Promise<{ succeeded: number; failed: number }> {
  const concepts = await getAllConcepts();
  let succeeded = 0;
  let failed = 0;

  for (const concept of concepts) {
    const meta = await getMetaByConceptId(concept.id);
    if (meta) continue;

    try {
      await ensureEmbedded(concept.id);
      succeeded++;
    } catch {
      failed++;
    }
  }

  return { succeeded, failed };
}

export async function reEmbedAll(force = false): Promise<{ succeeded: number; failed: number }> {
  const concepts = await getAllConcepts();
  let succeeded = 0;
  let failed = 0;

  for (const concept of concepts) {
    try {
      await ensureEmbedded(concept.id, force);
      succeeded++;
    } catch {
      failed++;
    }
  }

  return { succeeded, failed };
}
