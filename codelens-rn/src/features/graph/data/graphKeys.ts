import type { ConceptId } from '@/src/features/learning';
import type { GraphMode } from '../types';

export const graphKeys = {
  all: ['graph'] as const,
  full: () => ['graph', 'full'] as const,
  ego: (conceptId: ConceptId) => ['graph', 'ego', conceptId] as const,
  screen: (mode: GraphMode, conceptId: ConceptId | null) =>
    ['graph', 'screen', mode, conceptId ?? 'full'] as const,
} as const;
