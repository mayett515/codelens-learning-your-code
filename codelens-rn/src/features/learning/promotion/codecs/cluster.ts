import { z } from 'zod';
import { promotionDismissals, promotionSuggestionsCache } from '../data/schema';
import { ConceptTypeEnum } from '../../codecs/concept';
import { isLearningCaptureId } from '../../types/ids';
import type { LearningCaptureId } from '../../types/ids';
import type { PromotionDismissal, PromotionSuggestion } from '../types/promotion';

export const ClusterCaptureIdsCodec = z.array(z.string().refine(isLearningCaptureId)).min(1);
export const SharedKeywordsCodec = z.array(z.string()).default([]);

type SuggestionRow = typeof promotionSuggestionsCache.$inferSelect;
type DismissalRow = typeof promotionDismissals.$inferSelect;

function parseJson(raw: unknown, columnName: string): unknown {
  if (typeof raw === 'string') return JSON.parse(raw);
  if (raw === undefined) throw new Error(`Missing JSON column ${columnName}`);
  return raw;
}

export function suggestionRowToDomain(row: SuggestionRow): PromotionSuggestion {
  return {
    fingerprint: row.clusterFingerprint,
    captureIds: ClusterCaptureIdsCodec.parse(
      parseJson(row.captureIds, 'capture_ids_json'),
    ) as LearningCaptureId[],
    proposedName: row.proposedName,
    proposedNormalizedKey: row.proposedNormalizedKey,
    proposedConceptType: ConceptTypeEnum.parse(row.proposedConceptType),
    sharedKeywords: SharedKeywordsCodec.parse(parseJson(row.sharedKeywords, 'shared_keywords_json')),
    sessionCount: row.sessionCount,
    meanSimilarity: row.meanSimilarity,
    avgExtractionConfidence: row.avgExtractionConfidence,
    clusterScore: row.clusterScore,
    computedAt: row.computedAt,
    maxCreatedAt: row.maxCaptureCreatedAt,
  };
}

export function dismissalRowToDomain(row: DismissalRow): PromotionDismissal {
  return {
    fingerprint: row.clusterFingerprint,
    dismissedAt: row.dismissedAt,
    captureIds: ClusterCaptureIdsCodec.parse(
      parseJson(row.captureIds, 'capture_ids_json'),
    ) as LearningCaptureId[],
    captureCount: row.captureCount,
    isPermanent: row.isPermanent,
    proposedNormalizedKey: row.proposedNormalizedKey,
  };
}

export function validateSuggestionForWrite(suggestion: PromotionSuggestion): PromotionSuggestion {
  ClusterCaptureIdsCodec.parse(suggestion.captureIds);
  SharedKeywordsCodec.parse(suggestion.sharedKeywords);
  ConceptTypeEnum.parse(suggestion.proposedConceptType);
  return suggestion;
}
