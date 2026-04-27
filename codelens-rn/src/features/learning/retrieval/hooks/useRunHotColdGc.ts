import { useMutation, useQueryClient } from '@tanstack/react-query';
import { retrievalKeys } from '../data/queryKeys';
import { runHotColdGc } from '../services/runHotColdGc';

export function useRunHotColdGc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: runHotColdGc,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: retrievalKeys.all() });
    },
  });
}
