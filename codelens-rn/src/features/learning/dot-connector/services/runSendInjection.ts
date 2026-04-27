import { formatMemoriesForInjection } from '../../retrieval/services/formatMemoriesForInjection';
import { retrieveRelevantMemories } from '../../retrieval/services/retrieveRelevantMemories';
import { RetrievalUnavailableError } from '../../retrieval/types/retrieval';
import { getInjectionModeConfig } from './dotConnectorSettings';
import { withoutRemoved } from './runTypingRetrieval';
import type { RetrieveDiagnostics } from '../../retrieval/types/retrieval';
import type { SendInjectionInput, SendInjectionResult } from '../types/dotConnector';

export const SEND_RETRIEVAL_FRESHNESS_MS = 5_000;
export const SEND_RETRIEVAL_TIMEOUT_MS = 1_500;
export const MEMORY_BLOCK_START = '<codelens_memory_context>';
export const MEMORY_BLOCK_END = '</codelens_memory_context>';

export async function runSendInjection(input: SendInjectionInput): Promise<SendInjectionResult> {
  const query = input.query.trim();
  if (!input.settings.enableDotConnector || !input.perTurnEnabled || query.length === 0) {
    return { outboundText: input.query, injection: null, diagnostics: null, reusedTypingResult: false };
  }

  const now = input.now ?? Date.now;
  const config = getInjectionModeConfig(input.settings.injectionMode);
  const typingSnapshot = input.typingSnapshot ?? null;
  const fresh = typingSnapshot !== null
    && typingSnapshot.query === query
    && now() - typingSnapshot.createdAt <= SEND_RETRIEVAL_FRESHNESS_MS;

  try {
    const result = fresh
      ? typingSnapshot.result
      : await withTimeout(
        (input.retrieve ?? retrieveRelevantMemories)({
          query,
          limit: config.limit,
          tokenBudget: config.tokenBudget,
          filters: { kinds: ['capture', 'concept'] },
          enableJitRehydration: true,
          bumpLastAccessed: true,
        }),
        SEND_RETRIEVAL_TIMEOUT_MS,
      );
    const memories = withoutRemoved(result.memories, input.removedMemoryIds ?? []);
    const injection = formatMemoriesForInjection(memories, {
      tokenBudget: config.tokenBudget,
      maxItems: config.limit,
    });
    const outboundText = injection.text
      ? `${MEMORY_BLOCK_START}\n${injection.text}\n${MEMORY_BLOCK_END}\n\n${input.query}`
      : input.query;

    return {
      outboundText,
      injection,
      diagnostics: result.diagnostics,
      reusedTypingResult: Boolean(fresh),
    };
  } catch (error) {
    return {
      outboundText: input.query,
      injection: null,
      diagnostics: unavailableDiagnostics(error),
      reusedTypingResult: false,
    };
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Retrieval timed out')), timeoutMs);
    }),
  ]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

function unavailableDiagnostics(error: unknown): RetrieveDiagnostics {
  const failedSources = error instanceof RetrievalUnavailableError
    ? error.failedSources
    : ['vecCaptures', 'vecConcepts', 'ftsCaptures', 'ftsConcepts'] as const;
  return {
    status: 'unavailable',
    vecAvailable: false,
    ftsAvailable: false,
    failedSources: [...failedSources],
    timedOutSources: [],
    partialReason: error instanceof Error ? error.message : 'Retrieval unavailable',
    vecCaptureHits: 0,
    vecConceptHits: 0,
    ftsCaptureHits: 0,
    ftsConceptHits: 0,
    totalCandidates: 0,
    rehydrationEnqueued: 0,
    lastAccessedBumpFailed: false,
    durationMs: 0,
  };
}
