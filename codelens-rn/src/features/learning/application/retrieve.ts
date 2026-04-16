import { getEmbedConfig } from '../../../ai/scopes';
import { enqueueEmbed } from '../../../ai/embed';
import { l2Normalize } from '../lib/l2';
import { buildEmbeddingInput } from '../lib/embedding-input';
import { vectorStore } from '../../../composition';
import { getConceptById } from '../data/concepts';
import type { Concept, ConceptId } from '../../../domain/types';

export interface RetrievalResult {
  concept: Concept;
  cosine: number;
  score: number;
}

export async function retrieveRelatedConcepts(
  queryText: string,
  options?: {
    limit?: number | undefined;
    excludeIds?: ConceptId[] | undefined;
  },
): Promise<RetrievalResult[]> {
  const embedConfig = getEmbedConfig();
  const raw = await enqueueEmbed(queryText, embedConfig.provider, embedConfig.model);
  const normalized = l2Normalize(raw);

  const limit = options?.limit ?? 5;
  const fetchLimit = options?.excludeIds ? limit + options.excludeIds.length : limit;

  const matches = await vectorStore.topMatches({
    vector: normalized,
    limit: fetchLimit,
  });

  const excludeSet = options?.excludeIds
    ? new Set<string>(options.excludeIds)
    : null;

  const results: RetrievalResult[] = [];

  for (const match of matches) {
    if (excludeSet?.has(match.id)) continue;
    if (results.length >= limit) break;

    const concept = await getConceptById(match.id);
    if (!concept) continue;

    results.push({
      concept,
      cosine: match.cosine,
      score: match.score,
    });
  }

  return results;
}

export async function findMergeCandidates(
  name: string,
  summary: string,
  excludeIds?: ConceptId[],
): Promise<RetrievalResult[]> {
  const embedConfig = getEmbedConfig();
  const text = buildEmbeddingInput(name, summary);
  const raw = await enqueueEmbed(text, embedConfig.provider, embedConfig.model);
  const normalized = l2Normalize(raw);

  const matches = await vectorStore.topMatches({
    vector: normalized,
    limit: 10,
  });

  const excludeSet = excludeIds ? new Set<string>(excludeIds) : null;
  const results: RetrievalResult[] = [];

  for (const match of matches) {
    if (excludeSet?.has(match.id)) continue;
    if (match.cosine < 0.85) continue;

    const concept = await getConceptById(match.id);
    if (!concept) continue;

    results.push({
      concept,
      cosine: match.cosine,
      score: match.score,
    });
  }

  return results;
}
