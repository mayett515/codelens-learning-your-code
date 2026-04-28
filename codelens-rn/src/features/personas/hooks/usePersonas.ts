import { useQuery } from '@tanstack/react-query';
import { getPersonas } from '../data/personaRepo';
import { personaKeys } from '../data/queryKeys';
import type { Persona } from '../types/persona';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export function usePersonas() {
  return useQuery<Persona[]>({
    queryKey: personaKeys.list(),
    queryFn: () => getPersonas(),
    staleTime: FIVE_MINUTES_MS,
  });
}
