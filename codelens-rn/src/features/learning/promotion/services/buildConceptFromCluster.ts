import { normalizeConceptKey } from '../../codecs/concept';
import { pickRepresentativeCaptureIds } from './representativeCaptureIds';
import type { ConceptId } from '../../types/ids';
import type { LearningCapture, LearningConcept } from '../../types/learning';
import type { PromotionConfirmInput } from '../types/promotion';

const LANGUAGE_OR_RUNTIME_TOKENS = new Set([
  'javascript',
  'typescript',
  'java',
  'kotlin',
  'swift',
  'python',
  'react',
  'react native',
  'sql',
  'sqlite',
]);

export function buildConceptFromCluster(
  input: PromotionConfirmInput,
  conceptId: ConceptId,
  captures: LearningCapture[],
  now: number,
): LearningConcept {
  return {
    id: conceptId,
    name: input.name.trim(),
    normalizedKey: normalizeConceptKey(input.name),
    canonicalSummary: input.canonicalSummary ?? null,
    conceptType: input.conceptType,
    coreConcept: input.coreConcept ?? null,
    architecturalPattern: input.architecturalPattern ?? null,
    programmingParadigm: input.programmingParadigm ?? null,
    languageOrRuntime: unique(captures.map((capture) => capture.snippetLang).filter((value): value is string => !!value)),
    surfaceFeatures: unique(
      captures
        .flatMap((capture) => capture.keywords)
        .map((keyword) => keyword.trim().toLowerCase())
        .filter((keyword) => !!keyword && !LANGUAGE_OR_RUNTIME_TOKENS.has(keyword)),
    ),
    prerequisites: [],
    relatedConcepts: [],
    contrastConcepts: [],
    representativeCaptureIds: pickRepresentativeCaptureIds(captures),
    familiarityScore: 0.3,
    importanceScore: 0.5,
    createdAt: now,
    updatedAt: now,
  };
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized.toLowerCase())) continue;
    seen.add(normalized.toLowerCase());
    result.push(normalized);
  }
  return result;
}
