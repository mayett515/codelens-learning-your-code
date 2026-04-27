export { retrievalKeys } from './data/queryKeys';
export { sanitizeFtsQuery } from './services/ftsSearch';
export { retrieveRelevantMemories } from './services/retrieveRelevantMemories';
export { formatMemoriesForInjection } from './services/formatMemoriesForInjection';
export { ensureEmbedded } from './services/ensureEmbedded';
export { runHotColdGc, HOT_TIER_LIMIT, GC_BATCH_TARGET } from './services/runHotColdGc';
export { rehydrationQueue } from './services/rehydrationQueue';
export { waitForRetrievalQuiet, withGcActivity } from './services/activity';
export { computeRrfScore, rankComparator } from './services/rrf';
export { computeRecencyFactor, computeStrengthFactor } from './services/secondaryFactors';
export { useRetrieve } from './hooks/useRetrieve';
export { useEnsureEmbedded } from './hooks/useEnsureEmbedded';
export { useRunHotColdGc } from './hooks/useRunHotColdGc';
export { RetrievalUnavailableError } from './types/retrieval';
export type {
  EmbeddingTier,
  InjectionResult,
  RetrieveDiagnostics,
  RetrieveFilters,
  RetrieveOptions,
  RetrieveResult,
  RetrievedCapturePayload,
  RetrievedConceptPayload,
  RetrievedMemory,
  RetrievedMemoryKind,
  RetrievalSource,
} from './types/retrieval';
