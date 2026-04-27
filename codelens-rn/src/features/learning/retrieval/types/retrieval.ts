import type { ConceptId, LearningCaptureId } from '../../types/ids';
import type { CaptureState, ConceptType, EmbeddingStatus } from '../../types/learning';

export type RetrievedMemoryKind = 'capture' | 'concept';
export type RetrievalSource = 'vecCaptures' | 'vecConcepts' | 'ftsCaptures' | 'ftsConcepts';
export type EmbeddingTier = 'hot' | 'cold';

export interface RetrievedCapturePayload {
  id: LearningCaptureId;
  title: string;
  whatClicked: string;
  whyItMattered: string | null;
  rawSnippet: string;
  snippetLang: string | null;
  snippetSourcePath: string | null;
  snippetStartLine: number | null;
  snippetEndLine: number | null;
  state: CaptureState;
  linkedConceptId: ConceptId | null;
  linkedConceptName: string | null;
  sessionId: string | null;
  createdAt: number;
  lastAccessedAt: number | null;
  embeddingStatus: EmbeddingStatus;
}

export interface RetrievedConceptPayload {
  id: ConceptId;
  name: string;
  conceptType: ConceptType;
  canonicalSummary: string | null;
  coreConcept: string | null;
  languageOrRuntime: string[];
  surfaceFeatures: string[];
  familiarityScore: number;
  importanceScore: number;
  strength: number;
  representativeCaptureIds: LearningCaptureId[];
  createdAt: number;
  lastAccessedAt: number | null;
}

export type RetrievedMemory = RetrievedCaptureMemory | RetrievedConceptMemory;

export interface RetrievedCaptureMemory {
  kind: 'capture';
  id: LearningCaptureId;
  score: number;
  rrfScore: number;
  vecScore: number | null;
  ftsScore: number | null;
  recencyFactor: number;
  strengthFactor: number;
  tier: EmbeddingTier;
  payload: RetrievedCapturePayload;
}

export interface RetrievedConceptMemory {
  kind: 'concept';
  id: ConceptId;
  score: number;
  rrfScore: number;
  vecScore: number | null;
  ftsScore: number | null;
  recencyFactor: number;
  strengthFactor: number;
  tier: EmbeddingTier;
  payload: RetrievedConceptPayload;
}

export interface RetrieveFilters {
  states?: CaptureState[];
  conceptTypes?: ConceptType[];
  sessionIds?: string[];
  languages?: string[];
  minCreatedAt?: number;
  maxCreatedAt?: number;
  excludeIds?: Array<LearningCaptureId | ConceptId>;
  derivedChainRoot?: LearningCaptureId | null;
  kinds?: RetrievedMemoryKind[];
}

export interface RetrieveOptions {
  query: string;
  limit?: number;
  filters?: RetrieveFilters;
  tokenBudget?: number;
  vecK?: number;
  ftsK?: number;
  enableJitRehydration?: boolean;
  bumpLastAccessed?: boolean;
}

export interface RetrieveDiagnostics {
  status: 'ok' | 'partial' | 'unavailable';
  vecAvailable: boolean;
  ftsAvailable: boolean;
  failedSources: RetrievalSource[];
  timedOutSources: RetrievalSource[];
  partialReason: string | null;
  vecCaptureHits: number;
  vecConceptHits: number;
  ftsCaptureHits: number;
  ftsConceptHits: number;
  totalCandidates: number;
  rehydrationEnqueued: number;
  lastAccessedBumpFailed: boolean;
  durationMs: number;
}

export interface RetrieveResult {
  memories: RetrievedMemory[];
  diagnostics: RetrieveDiagnostics;
}

export interface InjectionResult {
  text: string;
  includedIds: Array<{ kind: RetrievedMemoryKind; id: string }>;
  includedCount: number;
  droppedCount: number;
  totalTokensApprox: number;
}

export class RetrievalUnavailableError extends Error {
  readonly failedSources: RetrievalSource[];

  constructor(message: string, input: { failedSources: RetrievalSource[] }) {
    super(message);
    this.name = 'RetrievalUnavailableError';
    this.failedSources = input.failedSources;
  }
}

export type RankedSearchHit = RankedCaptureSearchHit | RankedConceptSearchHit;

export interface RankedCaptureSearchHit {
  kind: 'capture';
  id: LearningCaptureId;
  source: RetrievalSource;
  rank: number;
  vecScore: number | null;
  ftsScore: number | null;
  tier: EmbeddingTier;
  payload: RetrievedCapturePayload;
}

export interface RankedConceptSearchHit {
  kind: 'concept';
  id: ConceptId;
  source: RetrievalSource;
  rank: number;
  vecScore: number | null;
  ftsScore: number | null;
  tier: EmbeddingTier;
  payload: RetrievedConceptPayload;
}
