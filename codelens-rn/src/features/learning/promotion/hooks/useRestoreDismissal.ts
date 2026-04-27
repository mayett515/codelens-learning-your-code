import { useMutation, useQueryClient } from '@tanstack/react-query';
import { restoreDismissal } from '../services/dismissCluster';
import { promotionKeys } from '../data/queryKeys';

export function useRestoreDismissal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: restoreDismissal,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: promotionKeys.suggestions() });
      void queryClient.invalidateQueries({ queryKey: promotionKeys.dismissed() });
    },
  });
}
