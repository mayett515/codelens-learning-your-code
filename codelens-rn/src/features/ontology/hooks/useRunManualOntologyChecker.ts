import { useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  profileProposalFreshnessKeys,
  profileProposalKeys,
} from '../data/queryKeys';
import {
  runManualOntologyCheckerForReview,
  type RunManualOntologyCheckerForReviewInput,
} from './manualCheckerReviewAdapter';

export function useRunManualOntologyChecker() {
  const queryClient = useQueryClient();
  const controllersRef = useRef(new Set<AbortController>());

  useEffect(() => () => {
    for (const controller of controllersRef.current) {
      controller.abort();
    }
    controllersRef.current.clear();
  }, []);

  return useMutation({
    retry: false,
    mutationFn: async (input: Omit<RunManualOntologyCheckerForReviewInput, 'signal'>) => {
      const controller = new AbortController();
      controllersRef.current.add(controller);
      try {
        return await runManualOntologyCheckerForReview({
          ...input,
          signal: controller.signal,
        });
      } finally {
        controllersRef.current.delete(controller);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: profileProposalKeys.all() });
      void queryClient.invalidateQueries({ queryKey: profileProposalFreshnessKeys.all() });
    },
  });
}
