import { useQuery } from '@tanstack/react-query';
import { getRecentCaptures } from '../data/captureRepo';
import { captureKeys } from '../data/query-keys';

export function useRecentCaptures({ limit }: { limit: number }) {
  return useQuery({
    queryKey: captureKeys.recent(limit),
    queryFn: () => getRecentCaptures(limit),
  });
}
