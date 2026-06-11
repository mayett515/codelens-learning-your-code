import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  profileProposalEventKeys,
  profileProposalFreshnessKeys,
  profileProposalKeys,
} from '../data/queryKeys';
import {
  recordPendingProfileChangeProposalAskedWhy,
  setPendingProfileChangeProposalReviewStatus,
  type ProfileChangeProposalReviewStatus,
} from '../data/profileChangeProposalReviewService';
import {
  supersedePendingProfileChangeProposal,
} from '../data/profileChangeProposalLifecycleService';

type SupersedeProfileChangeProposal = (
  input: Parameters<typeof supersedePendingProfileChangeProposal>[0],
) => ReturnType<typeof supersedePendingProfileChangeProposal>;

interface SupersedeProfileChangeProposalDeps {
  now?: (() => number) | undefined;
  supersede?: SupersedeProfileChangeProposal | undefined;
}

export async function supersedeProfileChangeProposal(
  input: {
    proposalId: string;
    supersededByProposalId: string;
    reason?: string | null | undefined;
  },
  deps: SupersedeProfileChangeProposalDeps = {},
) {
  return (deps.supersede ?? supersedePendingProfileChangeProposal)({
    proposalId: input.proposalId,
    supersededByProposalId: input.supersededByProposalId,
    now: deps.now?.() ?? Date.now(),
    actorKind: 'user',
    reason: input.reason ?? null,
  });
}

export function useReviewProfileChangeProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { proposalId: string; status: ProfileChangeProposalReviewStatus }) =>
      setPendingProfileChangeProposalReviewStatus({
        proposalId: input.proposalId,
        status: input.status,
        now: Date.now(),
      }),
    onSuccess: (_result, input) => {
      void queryClient.invalidateQueries({ queryKey: profileProposalKeys.all() });
      void queryClient.invalidateQueries({ queryKey: profileProposalEventKeys.byProposal(input.proposalId) });
      void queryClient.invalidateQueries({ queryKey: profileProposalFreshnessKeys.all() });
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
    onSuccess: (_result, input) => {
      void queryClient.invalidateQueries({ queryKey: profileProposalKeys.all() });
      void queryClient.invalidateQueries({ queryKey: profileProposalEventKeys.byProposal(input.proposalId) });
      void queryClient.invalidateQueries({ queryKey: profileProposalFreshnessKeys.all() });
    },
  });
}

export function useSupersedeProfileChangeProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      proposalId: string;
      supersededByProposalId: string;
      reason?: string | null | undefined;
    }) => supersedeProfileChangeProposal(input),
    onSuccess: (_result, input) => {
      void queryClient.invalidateQueries({ queryKey: profileProposalKeys.all() });
      void queryClient.invalidateQueries({ queryKey: profileProposalEventKeys.byProposal(input.proposalId) });
      void queryClient.invalidateQueries({ queryKey: profileProposalFreshnessKeys.all() });
    },
  });
}
