// Data
export { getAllConcepts, getConceptById, insertConcept, updateConcept, deleteConcept } from './data/concepts';
export { getAllSessions, getSessionById, insertSession, deleteSession } from './data/learning-sessions';
export { getMetaByConceptId, upsertMeta, deleteMeta, deleteAllMeta } from './data/embeddings-meta';
export type { EmbeddingMetaRow } from './data/embeddings-meta';
export { captureKeys, conceptKeys, learningKeys } from './data/query-keys';
export {
  insertCapture,
  getCaptureById,
  getRecentCaptures,
  getCapturesByConceptId,
  getCapturesBySessionId,
  setCaptureEmbeddingStatus,
  incrementCaptureEmbeddingRetry,
} from './data/captureRepo';
export {
  insertLearningConcept,
  getLearningConceptById,
  getLearningConceptByNormalizedKey,
  getLearningConceptList,
  getKnowledgeHealthConcepts,
} from './data/conceptRepo';
export { newLearningCaptureId, newConceptId, isLearningCaptureId, isConceptId } from './types/ids';
export type { LearningCaptureId, ConceptId as LearningConceptId } from './types/ids';
export type { LearningCapture, LearningConcept, ConceptType, CaptureState, EmbeddingStatus, ConceptHint } from './types/learning';
export type { SaveModalCandidateData, CandidateSaveState } from './types/saveModal';
export { computeStrength } from './strength/computeStrength';

// Application
export { extractConcepts } from './application/extract';
export type { ExtractedConcept, ExtractionResult } from './application/extract';
export { retrieveRelatedConcepts, findMergeCandidates } from './application/retrieve';
export type { RetrievalResult } from './application/retrieve';
export { ensureEmbedded, syncPendingEmbeddings, reEmbedAll } from './application/sync';
export { commitLearningSession } from './application/commit';
export { runVectorGC, HOT_TIER_LIMIT, GC_BATCH_TARGET } from './application/gc';
export type { GcResult } from './application/gc';
export {
  BASE_APP_SYSTEM_PROMPT,
  EXTRACTOR_INSTRUCTIONS,
  buildConceptContext,
  buildExtractorSystemPrompt,
} from './extractor/extractorPrompt';
export {
  CaptureHintSchema,
  CaptureExtractorCandidateSchema,
  ExtractorOutputSchema,
} from './extractor/extractorSchema';
export type {
  CaptureHint as ExtractorCaptureHint,
  CaptureExtractorCandidate,
  ExtractorOutput,
} from './extractor/extractorSchema';
export { runExtractor, ExtractionFailedError } from './extractor/runExtractor';
export { buildCaptureEmbeddingText } from './extractor/buildCaptureEmbeddingText';
export { conceptMatchPreCheck } from './services/conceptMatchPreCheck';
export type { ConceptMatch } from './services/conceptMatchPreCheck';
export { prepareSaveCandidates } from './services/prepareSaveCandidates';
export type { SaveCandidateSource } from './services/prepareSaveCandidates';
export { saveCapture } from './services/saveCapture';

// UI
export { SaveAsLearningModal } from './ui/SaveAsLearningModal';
export { LearningHubScreen } from './ui/LearningHubScreen';
export { RecentCapturesSection } from './ui/RecentCapturesSection';
export { ConceptListSection } from './ui/ConceptListSection';
export { SessionCardsSection } from './ui/SessionCardsSection';
export { SessionFlashbackScreen } from './ui/SessionFlashbackScreen';
export { KnowledgeHealthEntry } from './ui/KnowledgeHealthEntry';
export { KnowledgeHealthScreen } from './ui/KnowledgeHealthScreen';
export { ConceptChip } from './ui/ConceptChip';
export { CandidateCaptureCard } from './ui/cards/CandidateCaptureCard';
export { CaptureCardCompact } from './ui/cards/CaptureCardCompact';
export { CaptureCardFull } from './ui/cards/CaptureCardFull';
export { ConceptCardCompact } from './ui/cards/ConceptCardCompact';
export { ConceptCardFull } from './ui/cards/ConceptCardFull';
export { CaptureChip } from './ui/cards/CaptureChip';
export { ConceptTypeChip } from './ui/primitives/ConceptTypeChip';
export { StrengthIndicator } from './ui/primitives/StrengthIndicator';
export { StateChip } from './ui/primitives/StateChip';
export { SourceBreadcrumb } from './ui/primitives/SourceBreadcrumb';
export { LanguageChip } from './ui/primitives/LanguageChip';

// State
export { useSaveLearningStore } from './state/save-learning';
export type { CandidateSaveStatus } from './state/save-learning';

// Hooks
export { useLearningChat } from './hooks/use-learning-chat';
export {
  useAllConcepts,
  useAllSessions,
  useConcept,
  useRelatedConcepts,
  useRecentCaptures,
  useConceptList,
  useRecentSessions,
  useSessionFlashback,
  useKnowledgeHealthConcepts,
  useConceptCaptures,
} from './hooks/queries';
export type {
  ConceptListFilters,
  ConceptListSort,
  SessionFlashbackData,
} from './hooks/queries';

// Prompts
export { buildLearningSystemPrompt } from './application/prompts';

// Lib
export { buildEmbeddingInput } from './lib/embedding-input';
export { conceptSignature } from './lib/hash';
export { l2Normalize } from './lib/l2';
