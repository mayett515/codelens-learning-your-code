import { useQuery } from '@tanstack/react-query';
import { getRecentSessions } from '../data/learning-sessions';
import { learningKeys } from '../data/query-keys';

export function useRecentSessions({ limit }: { limit: number }) {
  return useQuery({
    queryKey: learningKeys.sessions.recent(limit),
    queryFn: () => getRecentSessions(limit),
  });
}
