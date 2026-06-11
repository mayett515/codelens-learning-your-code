import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  profileProposalEventKeys,
  profileProposalFreshnessKeys,
  profileProposalKeys,
} from '../data/queryKeys';
import {
  createEditedProfileChangeProposalReplacement,
  type CreateEditedProfileChangeProposalReplacementResult,
  type EditProfileChangeProposalDraftInput,
} from '../data/profileChangeProposalEditService';

type CreateEditedProfileChangeProposalReplacement = (
  input: Parameters<typeof createEditedProfileChangeProposalReplacement>[0],
) => ReturnType<typeof createEditedProfileChangeProposalReplacement>;

interface EditProfileChangeProposalDeps {
  now?: (() => number) | undefined;
  edit?: CreateEditedProfileChangeProposalReplacement | undefined;
}

export async function editProfileChangeProposal(
  input: {
    proposalId: string;
    draft: EditProfileChangeProposalDraftInput;
    supersedeReason?: string | null | undefined;
  },
  deps: EditProfileChangeProposalDeps = {},
): Promise<CreateEditedProfileChangeProposalReplacementResult> {
  return (deps.edit ?? createEditedProfileChangeProposalReplacement)({
    proposalId: input.proposalId,
    draft: input.draft,
    now: deps.now?.() ?? Date.now(),
    actorKind: 'user',
    supersedeReason: input.supersedeReason ?? null,
  });
}

export function useEditProfileChangeProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      proposalId: string;
      draft: EditProfileChangeProposalDraftInput;
      supersedeReason?: string | null | undefined;
    }) => editProfileChangeProposal(input),
    onSuccess: (result, input) => {
      void queryClient.invalidateQueries({ queryKey: profileProposalKeys.all() });
      void queryClient.invalidateQueries({ queryKey: profileProposalEventKeys.byProposal(input.proposalId) });
      void queryClient.invalidateQueries({ queryKey: profileProposalEventKeys.byProposal(result.proposal.id) });
      void queryClient.invalidateQueries({ queryKey: profileProposalFreshnessKeys.all() });
    },
  });
}
