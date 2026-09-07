import type { ConceptId } from '@/src/features/learning';
import type { GraphMode } from '../types';

export const graphKeys = {
  all: ['graph'] as const,
  full: (profileId?: string | null) => ['graph', 'full', profileId ?? 'all'] as const,
  ego: (conceptId: ConceptId, profileId?: string | null) =>
    ['graph', 'ego', conceptId, profileId ?? 'focal-profile'] as const,
  screen: (mode: GraphMode, conceptId: ConceptId | null) =>
    ['graph', 'screen', mode, conceptId ?? 'full'] as const,
} as const;
