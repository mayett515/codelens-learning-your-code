import type { ConceptId } from '../../../domain/types';
import type { ConceptId as LearningConceptId, LearningCaptureId } from '../types/ids';

export const learningKeys = {
  sessions: {
    all: ['learning-sessions'] as const,
    recent: (limit?: number) => ['learning-sessions', 'recent', limit ?? 'default'] as const,
    flashback: (id: string) => ['learning-sessions', 'flashback', id] as const,
  },
  concepts: {
    all: ['concepts'] as const,
    detail: (id: ConceptId) => ['concept', id] as const,
    related: (id: ConceptId) => ['related-concepts', id] as const,
  },
} as const;

export const captureKeys = {
  all: ['learning-captures'] as const,
  recent: (limit?: number) => ['learning-captures', 'recent', limit ?? 'default'] as const,
  byId: (id: LearningCaptureId) => ['learning-captures', id] as const,
  byConcept: (id: LearningConceptId | null) => ['learning-captures', 'concept', id ?? 'none'] as const,
} as const;

export const conceptKeys = {
  all: ['learning-concepts'] as const,
  list: (sort?: string, filters?: unknown) =>
    ['learning-concepts', 'list', sort ?? 'weakest', filters ?? null] as const,
  health: ['learning-concepts', 'health'] as const,
  byId: (id: LearningConceptId) => ['learning-concepts', id] as const,
  byNormalizedKey: (normalizedKey: string) =>
    ['learning-concepts', 'normalized-key', normalizedKey] as const,
} as const;
