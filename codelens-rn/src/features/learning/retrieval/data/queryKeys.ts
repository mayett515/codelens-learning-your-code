export const retrievalKeys = {
  all: () => ['learning', 'retrieval'] as const,
  search: (queryHash: string, filterHash: string) =>
    [...retrievalKeys.all(), queryHash, filterHash] as const,
} as const;
