import { enqueueEmbed } from '../../../ai/embed';
import { getEmbedConfig } from '../../../ai/scopes';
import { vectorStore } from '../../../composition';
import { l2Normalize } from '../lib/l2';
import { getLearningConceptById } from '../data/conceptRepo';
import { isConceptId } from '../types/ids';
import type { LearningConcept } from '../types/learning';

export interface ConceptMatch {
  concept: LearningConcept;
  similarity: number;
}

export async function conceptMatchPreCheck(
  selectedText: string,
  options?: {
    threshold?: number | undefined;
    limit?: number | undefined;
  },
): Promise<ConceptMatch[]> {
  const threshold = options?.threshold ?? 0.60;
  const limit = options?.limit ?? 3;
  const cappedText = selectedText.slice(0, 800);
  const embedConfig = getEmbedConfig();
  const raw = await enqueueEmbed(cappedText, embedConfig.provider, embedConfig.model);
  const normalized = l2Normalize(raw);

  const matches = await vectorStore.topMatches({
    vector: normalized,
    limit,
  });

  const results: ConceptMatch[] = [];
  for (const match of matches) {
    if (results.length >= limit) break;
    if (match.cosine < threshold) break;
    if (!isConceptId(match.id)) continue;

    const concept = await getLearningConceptById(match.id);
    if (!concept) continue;

    results.push({ concept, similarity: match.cosine });
  }

  return results;
}
