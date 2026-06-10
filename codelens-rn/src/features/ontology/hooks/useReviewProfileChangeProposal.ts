import { useMutation, useQueryClient } from '@tanstack/react-query';
import { profileProposalKeys } from '../data/queryKeys';
import {
  recordPendingProfileChangeProposalAskedWhy,
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

export function useAskWhyProfileChangeProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { proposalId: string; reason?: string | null | undefined }) =>
      recordPendingProfileChangeProposalAskedWhy({
        proposalId: input.proposalId,
        now: Date.now(),
        actorKind: 'user',
        reason: input.reason ?? null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: profileProposalKeys.all() });
    },
  });
}
