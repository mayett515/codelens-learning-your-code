export const promotionKeys = {
  all: () => ['learning', 'promotion'] as const,
  suggestions: () => [...promotionKeys.all(), 'suggestions'] as const,
  suggestionsWithLimit: (limit?: number, profileId?: string | null) =>
    [...promotionKeys.suggestions(), limit ?? 'all', profileId ?? 'all-profiles'] as const,
  suggestionByFingerprint: (fingerprint: string, profileId?: string | null) =>
    [...promotionKeys.suggestions(), fingerprint, profileId ?? 'any-profile'] as const,
  dismissed: () => [...promotionKeys.all(), 'dismissed'] as const,
} as const;
