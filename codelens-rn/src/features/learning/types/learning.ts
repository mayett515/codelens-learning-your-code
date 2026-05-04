import type { ConceptId, LearningCaptureId } from './ids';
import { CODING_CONCEPT_TYPE_NODE_IDS } from '../../ontology';

export const CONCEPT_TYPES = CODING_CONCEPT_TYPE_NODE_IDS;

export type ConceptType = (typeof CONCEPT_TYPES)[number];
export type CaptureState = 'unresolved' | 'linked' | 'proposed_new';
export type EmbeddingStatus = 'pending' | 'ready' | 'failed';

export interface ConceptHint {
  proposedName: string;
  proposedNormalizedKey: string;
  proposedConceptType: ConceptType;
  extractionConfidence: number;
  linkedConceptId: ConceptId | null;
  linkedConceptName: string | null;
  linkedConceptLanguages: string[] | null;
  isNewLanguageForExistingConcept: boolean;
}

export interface SnippetSource {
  path: string;
  startLine: number;
  endLine: number;
}

export interface LearningCapture {
  id: LearningCaptureId;
  title: string;
  whatClicked: string;
  whyItMattered: string | null;
  rawSnippet: string;
  snippetLang: string | null;
  snippetSource: SnippetSource | null;
  chatMessageId: string | null;
  sessionId: string | null;
  state: CaptureState;
  linkedConceptId: ConceptId | null;
  editableUntil: number;
  extractionConfidence: number | null;
  derivedFromCaptureId: LearningCaptureId | null;
  embeddingStatus: EmbeddingStatus;
  embeddingRetryCount: number;
  conceptHint: ConceptHint | null;
  keywords: string[];
  createdAt: number;
  updatedAt: number;
}

export interface LearningConcept {
  id: ConceptId;
  name: string;
  normalizedKey: string;
  canonicalSummary: string | null;
  conceptType: ConceptType;
  coreConcept: string | null;
  architecturalPattern: string | null;
  programmingParadigm: string | null;
  languageOrRuntime: string[];
  surfaceFeatures: string[];
  prerequisites: ConceptId[];
  relatedConcepts: ConceptId[];
  contrastConcepts: ConceptId[];
  representativeCaptureIds: LearningCaptureId[];
  familiarityScore: number;
  importanceScore: number;
  lastAccessedAt?: number | null;
  createdAt: number;
  updatedAt: number;
}
