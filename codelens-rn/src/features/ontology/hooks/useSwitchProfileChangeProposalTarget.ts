import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  profileProposalEventKeys,
  profileProposalFreshnessKeys,
  profileProposalKeys,
} from '../data/queryKeys';
import {
  switchProfileChangeProposalTargetToBase,
  type SwitchProfileChangeProposalTargetToBaseResult,
} from '../data/profileChangeProposalTargetSwitchService';

type SwitchProfileChangeProposalTargetToBase = (
  input: Parameters<typeof switchProfileChangeProposalTargetToBase>[0],
) => ReturnType<typeof switchProfileChangeProposalTargetToBase>;

interface SwitchProfileChangeProposalTargetDeps {
  now?: (() => number) | undefined;
  switchTarget?: SwitchProfileChangeProposalTargetToBase | undefined;
}

export async function switchProfileChangeProposalTarget(
  input: {
    proposalId: string;
    reason?: string | null | undefined;
  },
  deps: SwitchProfileChangeProposalTargetDeps = {},
): Promise<SwitchProfileChangeProposalTargetToBaseResult> {
  return (deps.switchTarget ?? switchProfileChangeProposalTargetToBase)({
    proposalId: input.proposalId,
    now: deps.now?.() ?? Date.now(),
    actorKind: 'user',
    reason: input.reason ?? null,
  });
}

export function useSwitchProfileChangeProposalTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { proposalId: string; reason?: string | null | undefined }) =>
      switchProfileChangeProposalTarget(input),
    onSuccess: (result, input) => {
      void queryClient.invalidateQueries({ queryKey: profileProposalKeys.all() });
      void queryClient.invalidateQueries({ queryKey: profileProposalEventKeys.byProposal(input.proposalId) });
      void queryClient.invalidateQueries({ queryKey: profileProposalEventKeys.byProposal(result.proposal.id) });
      void queryClient.invalidateQueries({ queryKey: profileProposalFreshnessKeys.all() });
    },
  });
}
