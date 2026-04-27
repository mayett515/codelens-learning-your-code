import { useQuery } from '@tanstack/react-query';
import { retrievalKeys } from '../data/queryKeys';
import { retrieveRelevantMemories } from '../services/retrieveRelevantMemories';
import type { RetrieveOptions, RetrieveResult } from '../types/retrieval';

export function useRetrieve(opts: RetrieveOptions) {
  return useQuery<RetrieveResult>({
    queryKey: retrievalKeys.search(hashValue(opts.query), hashValue(opts.filters ?? {})),
    queryFn: () => retrieveRelevantMemories(opts),
    staleTime: 30_000,
    enabled: opts.query.trim().length > 0,
  });
}

function hashValue(value: unknown): string {
  const input = typeof value === 'string' ? value : stableStringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`);
  return `{${entries.join(',')}}`;
}
