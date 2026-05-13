import { useQuery } from '@tanstack/react-query';
import { profileProposalKeys } from '../data/queryKeys';
import { listProfileChangeProposalsByStatus } from '../data/profileChangeProposalRepo';

export function usePendingProfileChangeProposals() {
  return useQuery({
    queryKey: profileProposalKeys.pending(),
    queryFn: () => listProfileChangeProposalsByStatus('pending'),
  });
}
