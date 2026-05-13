import { useMutation, useQueryClient } from '@tanstack/react-query';
import { profileProposalKeys } from '../data/queryKeys';
import {
  setPendingProfileChangeProposalReviewStatus,
  type ProfileChangeProposalReviewStatus,
} from '../data/profileChangeProposalReviewService';

export function useReviewProfileChangeProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { proposalId: string; status: ProfileChangeProposalReviewStatus }) =>
      setPendingProfileChangeProposalReviewStatus({
        proposalId: input.proposalId,
        status: input.status,
        now: Date.now(),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: profileProposalKeys.all() });
    },
  });
}
