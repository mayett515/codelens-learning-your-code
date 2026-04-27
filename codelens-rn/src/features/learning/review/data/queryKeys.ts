import type { ConceptId } from '../../types/ids';

export const reviewKeys = {
  all: () => ['learning', 'review'] as const,
  weakConcepts: (threshold: number) =>
    [...reviewKeys.all(), 'weakConcepts', threshold] as const,
  session: (conceptId: ConceptId) =>
    [...reviewKeys.all(), 'session', conceptId] as const,
  sessionDisabled: () =>
    [...reviewKeys.all(), 'session', 'disabled'] as const,
  events: (conceptId: ConceptId) =>
    [...reviewKeys.all(), 'events', conceptId] as const,
};
