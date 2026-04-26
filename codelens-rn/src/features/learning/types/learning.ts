import type { ConceptId, LearningCaptureId } from './ids';

export const CONCEPT_TYPES = [
  'mechanism',
  'mental_model',
  'pattern',
  'architecture_principle',
  'language_feature',
  'api_idiom',
  'data_structure',
  'algorithmic_idea',
  'performance_principle',
  'debugging_heuristic',
  'failure_mode',
  'testing_principle',
] as const;

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
  createdAt: number;
  updatedAt: number;
}
