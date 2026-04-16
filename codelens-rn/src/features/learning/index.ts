// Data
export { getAllConcepts, getConceptById, insertConcept, updateConcept, deleteConcept } from './data/concepts';
export { getAllSessions, getSessionById, insertSession, deleteSession } from './data/learning-sessions';
export { getMetaByConceptId, upsertMeta, deleteMeta, deleteAllMeta } from './data/embeddings-meta';
export type { EmbeddingMetaRow } from './data/embeddings-meta';
export { learningKeys } from './data/query-keys';

// Application
export { extractConcepts } from './application/extract';
export type { ExtractedConcept, ExtractionResult } from './application/extract';
export { retrieveRelatedConcepts, findMergeCandidates } from './application/retrieve';
export type { RetrievalResult } from './application/retrieve';
export { ensureEmbedded, syncPendingEmbeddings, reEmbedAll } from './application/sync';
export { commitLearningSession } from './application/commit';
export { runVectorGC, HOT_TIER_LIMIT, GC_BATCH_TARGET } from './application/gc';
export type { GcResult } from './application/gc';

// UI
export { SaveAsLearningModal } from './ui/SaveAsLearningModal';
export { ConceptChip } from './ui/ConceptChip';

// State
export { useSaveLearningStore } from './state/save-learning';
export type { MergeSuggestion } from './state/save-learning';

// Hooks
export { useLearningChat } from './hooks/use-learning-chat';
export { useAllConcepts, useAllSessions, useConcept, useRelatedConcepts } from './hooks/queries';

// Prompts
export { buildLearningSystemPrompt } from './application/prompts';

// Lib
export { buildEmbeddingInput } from './lib/embedding-input';
export { conceptSignature } from './lib/hash';
export { l2Normalize } from './lib/l2';
