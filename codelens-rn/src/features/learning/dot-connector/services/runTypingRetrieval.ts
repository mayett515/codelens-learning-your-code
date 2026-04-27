import { formatMemoriesForInjection } from '../../retrieval/services/formatMemoriesForInjection';
import { retrieveRelevantMemories } from '../../retrieval/services/retrieveRelevantMemories';
import type { RetrieveResult, RetrievedMemory } from '../../retrieval/types/retrieval';
import { getInjectionModeConfig } from './dotConnectorSettings';
import type { DotConnectorSettings, TypingRetrievalSnapshot } from '../types/dotConnector';

export const DOT_CONNECTOR_DEBOUNCE_MS = 450;
export const DOT_CONNECTOR_MIN_QUERY_LENGTH = 3;

export interface RunTypingRetrievalInput {
  query: string;
  settings: DotConnectorSettings;
  removedMemoryIds?: string[];
  retrieve?: typeof retrieveRelevantMemories;
  now?: () => number;
}

export async function runTypingRetrieval(input: RunTypingRetrievalInput): Promise<TypingRetrievalSnapshot | null> {
  const query = input.query.trim();
  if (!input.settings.enableDotConnector || query.length < DOT_CONNECTOR_MIN_QUERY_LENGTH) {
    return null;
  }

  const config = getInjectionModeConfig(input.settings.injectionMode);
  const retrieve = input.retrieve ?? retrieveRelevantMemories;
  const result = await retrieve({
    query,
    limit: config.limit,
    tokenBudget: config.tokenBudget,
    filters: { kinds: ['capture', 'concept'] },
    enableJitRehydration: true,
    bumpLastAccessed: false,
  });
  const memories = withoutRemoved(result.memories, input.removedMemoryIds ?? []);
  const injection = formatMemoriesForInjection(memories, {
    tokenBudget: config.tokenBudget,
    maxItems: config.limit,
  });

  return {
    query,
    result: { ...result, memories },
    injection,
    createdAt: (input.now ?? Date.now)(),
  };
}

export function withoutRemoved(memories: RetrievedMemory[], removedIds: string[]): RetrievedMemory[] {
  if (removedIds.length === 0) return memories;
  const removed = new Set(removedIds);
  return memories.filter((memory) => !removed.has(String(memory.id)));
}
