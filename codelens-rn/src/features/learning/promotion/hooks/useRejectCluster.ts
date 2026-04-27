import { useMutation, useQueryClient } from '@tanstack/react-query';
import { dismissCluster } from '../services/dismissCluster';
import { promotionKeys } from '../data/queryKeys';

export function useRejectCluster() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof dismissCluster>[0]) => dismissCluster(input, true),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: promotionKeys.suggestions() });
      void queryClient.invalidateQueries({ queryKey: promotionKeys.dismissed() });
    },
  });
}
