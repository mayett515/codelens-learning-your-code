import { useQuery } from '@tanstack/react-query';
import { getRecentCaptures } from '../data/captureRepo';
import { captureKeys } from '../data/query-keys';
import type { CaptureListFilters } from '../data/captureFilters';

export function useRecentCaptures({
  limit,
  filters = {},
}: {
  limit: number;
  filters?: CaptureListFilters;
}) {
  return useQuery({
    queryKey: captureKeys.recent(limit, filters),
    queryFn: () => getRecentCaptures(limit, undefined, filters),
  });
}
