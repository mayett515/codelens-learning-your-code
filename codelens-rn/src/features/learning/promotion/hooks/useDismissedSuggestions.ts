import { useQuery } from '@tanstack/react-query';
import { getDismissals } from '../data/dismissalsRepo';
import { promotionKeys } from '../data/queryKeys';

export function useDismissedSuggestions() {
  return useQuery({
    queryKey: promotionKeys.dismissed(),
    queryFn: () => getDismissals(),
  });
}
