import { useQuery } from '@tanstack/react-query';
import { getCapturesBySessionId } from '../data/captureRepo';
import { getSessionById } from '../data/learning-sessions';
import { learningKeys } from '../data/query-keys';
import type { LearningSession } from '../../../domain/types';
import type { LearningCapture } from '../types/learning';

export interface SessionFlashbackData {
  session: LearningSession | undefined;
  captures: LearningCapture[];
}

export function useSessionFlashback(sessionId: string | null) {
  return useQuery<SessionFlashbackData>({
    queryKey: learningKeys.sessions.flashback(sessionId ?? 'none'),
    queryFn: async () => {
      if (!sessionId) return { session: undefined, captures: [] };
      const [session, captures] = await Promise.all([
        getSessionById(sessionId as LearningSession['id']),
        getCapturesBySessionId(sessionId),
      ]);
      return { session, captures };
    },
    enabled: !!sessionId,
  });
}
