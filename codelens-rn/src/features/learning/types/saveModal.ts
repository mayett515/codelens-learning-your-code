import type { z } from 'zod';
import type { OntologyCorrectionNearMissCandidate } from '../../ontology/types';
import type { CaptureHintSchema } from '../extractor/extractorSchema';
import type { ConceptId, LearningCaptureId } from './ids';
import type { RawProposedTypeIdentity } from './rawProposedTypeIdentity';

export interface ConceptualizeSuggestedNewConceptReview {
  label: string;
  kind: 'category' | 'subcategory' | 'tag' | 'relationshipType';
  parentNodeRef: {
    scopeId: string;
    nodeId: string;
  } | null;
  parentLabel: string | null;
  meaning: string;
  reason: string;
}

export interface ConceptualizeMissingConceptReview {
  status: 'no_strong_match';
  confidence: number;
  rationale: string;
  suggestedNewConcept: ConceptualizeSuggestedNewConceptReview | null;
}

export interface SaveModalCandidateData {
  title: string;
  whatClicked: string;
  whyItMattered: string | null;
  rawSnippet: string;
  snippetLang: string | null;
  snippetSourcePath: string | null;
  snippetStartLine: number | null;
  snippetEndLine: number | null;
  chatMessageId: string | null;
  sessionId: string | null;
  derivedFromCaptureId: LearningCaptureId | null;
  isNewLanguageForExistingConcept: boolean;
  linkedConceptName: string | null;
  linkedConceptLanguages: string[] | null;
  linkedConceptId: ConceptId | null;
  extractionConfidence: number | null;
  matchSimilarity: number | null;
  conceptHint: z.infer<typeof CaptureHintSchema> | null;
  rawProposedTypeIdentity?: RawProposedTypeIdentity | null | undefined;
  rawProposedTypeNodeId?: string | null | undefined;
  conceptualizeMissingConcept?: ConceptualizeMissingConceptReview | null | undefined;
  conceptualizeNearMissCandidates?: readonly OntologyCorrectionNearMissCandidate[] | null | undefined;
  keywords: string[];
}

export type CandidateSaveState = 'idle' | 'saving' | 'saved' | 'failed';
