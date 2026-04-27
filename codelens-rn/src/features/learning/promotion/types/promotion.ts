import type { ConceptId, LearningCaptureId } from '../../types/ids';
import type { ConceptType, LearningCapture, LearningConcept } from '../../types/learning';

export interface ClusterCandidate {
  fingerprint: string;
  captureIds: LearningCaptureId[];
  meanSimilarity: number;
  sessionCount: number;
  sharedKeywords: string[];
  avgExtractionConfidence: number;
  proposedName: string;
  proposedNormalizedKey: string;
  proposedConceptType: ConceptType;
  clusterScore: number;
  maxCreatedAt: number;
}

export interface PromotionSuggestion extends ClusterCandidate {
  computedAt: number;
}

export interface PromotionSuggestionWithCaptures {
  suggestion: PromotionSuggestion;
  captures: LearningCapture[];
}

export interface PromotionDismissal {
  fingerprint: string;
  dismissedAt: number;
  captureIds: LearningCaptureId[];
  captureCount: number;
  isPermanent: boolean;
  proposedNormalizedKey: string;
}

export interface PromotionConfirmInput {
  fingerprint: string | null;
  name: string;
  conceptType: ConceptType;
  includedCaptureIds: LearningCaptureId[];
  canonicalSummary?: string | null;
  coreConcept?: string | null;
  architecturalPattern?: string | null;
  programmingParadigm?: string | null;
  source: 'cluster' | 'single_capture';
}

export interface LinkExistingInput {
  fingerprint: string | null;
  targetConceptId: ConceptId;
  includedCaptureIds: LearningCaptureId[];
  sharedKeywords?: string[];
}

export interface PromotionReviewModel {
  fingerprint: string | null;
  proposedName: string;
  proposedConceptType: ConceptType;
  captures: LearningCapture[];
  sharedKeywords: string[];
  source: 'cluster' | 'single_capture';
}

export interface PromotionResult {
  conceptId: ConceptId;
  concept?: LearningConcept;
  linkedCaptureIds: LearningCaptureId[];
  skippedCaptureIds: LearningCaptureId[];
}

export class EmptyPromotionError extends Error {
  constructor() {
    super('Promotion requires at least one included capture');
    this.name = 'EmptyPromotionError';
  }
}

export class NormalizedKeyConflictError extends Error {
  readonly concept: LearningConcept;

  constructor(concept: LearningConcept) {
    super(`Concept already exists for normalized key: ${concept.normalizedKey}`);
    this.name = 'NormalizedKeyConflictError';
    this.concept = concept;
  }
}

export class PromotionCapturesChangedError extends Error {
  constructor() {
    super('Captures changed; please review again');
    this.name = 'PromotionCapturesChangedError';
  }
}
