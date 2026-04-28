import { formatMemoriesForInjection } from '../../retrieval/services/formatMemoriesForInjection';
import { retrieveRelevantMemories } from '../../retrieval/services/retrieveRelevantMemories';
import { RetrievalUnavailableError } from '../../retrieval/types/retrieval';
import { getRawDb } from '../../../../db/client';
import { getInjectionModeConfig } from './dotConnectorSettings';
import { withoutRemoved } from './runTypingRetrieval';
import type { RetrieveDiagnostics, RetrievedMemory } from '../../retrieval/types/retrieval';
import type { SendInjectionInput, SendInjectionResult } from '../types/dotConnector';

export const SEND_RETRIEVAL_FRESHNESS_MS = 5_000;
export const SEND_RETRIEVAL_TIMEOUT_MS = 1_500;

export async function runSendInjection(input: SendInjectionInput): Promise<SendInjectionResult> {
  const query = input.query.trim();
  if (!input.settings.enableDotConnector || !input.perTurnEnabled || query.length === 0) {
    return { memories: [], injection: null, diagnostics: null, reusedTypingResult: false };
  }

  const now = input.now ?? Date.now;
  const config = getInjectionModeConfig(input.settings.injectionMode);
  const typingSnapshot = input.typingSnapshot ?? null;
  const fresh = typingSnapshot !== null
    && typingSnapshot.query === query
    && now() - typingSnapshot.createdAt <= SEND_RETRIEVAL_FRESHNESS_MS;

  try {
    let result = fresh
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
    if (fresh && result.memories.length > 0) {
      try {
        await (input.bumpLastAccessed ?? bumpRetrievedMemoriesLastAccessed)(
          result.memories.map((memory) => ({ kind: memory.kind, id: String(memory.id) })),
        );
      } catch {
        result = {
          ...result,
          diagnostics: {
            ...result.diagnostics,
            lastAccessedBumpFailed: true,
            status: result.diagnostics.status === 'unavailable' ? 'unavailable' : 'partial',
            partialReason: result.diagnostics.partialReason ?? 'Could not update memory access time',
          },
        };
      }
    }
    const memories = withoutRemoved(result.memories, input.removedMemoryIds ?? []);
    const injection = formatMemoriesForInjection(memories, {
      tokenBudget: config.tokenBudget,
      maxItems: config.limit,
    });
    const includedIds = new Set(injection.includedIds.map((item) => item.id));

    return {
      memories: memories.filter((memory) => includedIds.has(String(memory.id))),
      injection,
      diagnostics: result.diagnostics,
      reusedTypingResult: Boolean(fresh),
    };
  } catch (error) {
    return {
      memories: [],
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

async function bumpRetrievedMemoriesLastAccessed(memories: Array<{ kind: RetrievedMemory['kind']; id: string }>): Promise<void> {
  const now = Date.now();
  const captureIds = memories
    .filter((memory) => memory.kind === 'capture')
    .map((memory) => String(memory.id));
  const conceptIds = memories
    .filter((memory) => memory.kind === 'concept')
    .map((memory) => String(memory.id));
  const raw = getRawDb();
  await raw.transaction(async (tx) => {
    if (captureIds.length > 0) {
      await tx.execute(
        `UPDATE learning_captures SET last_accessed_at = ? WHERE id IN (${captureIds.map(() => '?').join(',')})`,
        [now, ...captureIds],
      );
    }
    if (conceptIds.length > 0) {
      await tx.execute(
        `UPDATE concepts SET last_accessed_at = ? WHERE id IN (${conceptIds.map(() => '?').join(',')})`,
        [now, ...conceptIds],
      );
    }
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
