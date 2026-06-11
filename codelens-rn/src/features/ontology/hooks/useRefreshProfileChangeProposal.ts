import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  profileProposalEventKeys,
  profileProposalFreshnessKeys,
  profileProposalKeys,
} from '../data/queryKeys';
import {
  refreshStaleProfileChangeProposal,
  type RefreshStaleProfileChangeProposalResult,
} from '../data/profileChangeProposalRefreshService';

type RefreshProfileChangeProposal = (
  input: Parameters<typeof refreshStaleProfileChangeProposal>[0],
) => ReturnType<typeof refreshStaleProfileChangeProposal>;

interface RefreshProfileChangeProposalDeps {
  now?: (() => number) | undefined;
  refresh?: RefreshProfileChangeProposal | undefined;
}

export async function refreshProfileChangeProposal(
  input: {
    proposalId: string;
    reason?: string | null | undefined;
  },
  deps: RefreshProfileChangeProposalDeps = {},
): Promise<RefreshStaleProfileChangeProposalResult> {
  return (deps.refresh ?? refreshStaleProfileChangeProposal)({
    proposalId: input.proposalId,
    now: deps.now?.() ?? Date.now(),
    actorKind: 'user',
    reason: input.reason ?? null,
  });
}

export function useRefreshProfileChangeProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { proposalId: string; reason?: string | null | undefined }) =>
      refreshProfileChangeProposal(input),
    onSuccess: (result, input) => {
      void queryClient.invalidateQueries({ queryKey: profileProposalKeys.all() });
      void queryClient.invalidateQueries({ queryKey: profileProposalEventKeys.byProposal(input.proposalId) });
      void queryClient.invalidateQueries({ queryKey: profileProposalEventKeys.byProposal(result.proposal.id) });
      void queryClient.invalidateQueries({ queryKey: profileProposalFreshnessKeys.all() });
    },
  });
}
