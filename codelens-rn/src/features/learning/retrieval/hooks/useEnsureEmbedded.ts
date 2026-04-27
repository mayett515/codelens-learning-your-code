import { useMutation, useQueryClient } from '@tanstack/react-query';
import { retrievalKeys } from '../data/queryKeys';
import { ensureEmbedded } from '../services/ensureEmbedded';

export function useEnsureEmbedded() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ensureEmbedded,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: retrievalKeys.all() });
    },
  });
}
