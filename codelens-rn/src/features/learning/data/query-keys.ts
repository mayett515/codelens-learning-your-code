import type { ConceptId } from '../../../domain/types';

export const learningKeys = {
  sessions: {
    all: ['learning-sessions'] as const,
  },
  concepts: {
    all: ['concepts'] as const,
    detail: (id: ConceptId) => ['concept', id] as const,
    related: (id: ConceptId) => ['related-concepts', id] as const,
  },
} as const;
