export const promotionKeys = {
  all: () => ['learning', 'promotion'] as const,
  suggestions: () => [...promotionKeys.all(), 'suggestions'] as const,
  suggestionsWithLimit: (limit?: number) =>
    [...promotionKeys.suggestions(), limit ?? 'all'] as const,
  suggestionByFingerprint: (fingerprint: string) =>
    [...promotionKeys.suggestions(), fingerprint] as const,
  dismissed: () => [...promotionKeys.all(), 'dismissed'] as const,
} as const;
