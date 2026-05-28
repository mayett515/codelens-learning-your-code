import { useMutation, useQueryClient } from '@tanstack/react-query';
import { profileBranchKeys, profileProposalKeys } from '../data/queryKeys';
import { applyPendingBranchLocalProfileChangeProposal } from '../data/branchLocalProposalApplyService';
import { applyPendingBaseProfileChangeProposal } from '../data/baseProfileProposalApplyService';
import { loadDefaultProfileRegistry } from '../data/profileRegistryBootstrap';
import { ProfileNotFoundError } from '../profileRegistry';
import type { DomainProfile, ProfileChangeProposal, ProfileRegistry } from '../types';

type ApplyBranchProfileChangeProposal = (
  input: Parameters<typeof applyPendingBranchLocalProfileChangeProposal>[0],
) => ReturnType<typeof applyPendingBranchLocalProfileChangeProposal>;
type ApplyBaseProfileChangeProposal = (
  input: Parameters<typeof applyPendingBaseProfileChangeProposal>[0],
) => ReturnType<typeof applyPendingBaseProfileChangeProposal>;
type ApplyProfileChangeProposalResult =
  Awaited<ReturnType<ApplyBranchProfileChangeProposal>> |
  Awaited<ReturnType<ApplyBaseProfileChangeProposal>>;

interface ApplyProfileChangeProposalDeps {
  now?: () => number;
  loadRegistry?: () => Promise<ProfileRegistry>;
  applyBranch?: ApplyBranchProfileChangeProposal;
  applyBase?: ApplyBaseProfileChangeProposal;
}

export class ProfileProposalApplyHookError extends Error {
  readonly code: 'base_profile_not_found' | 'proposal_target_not_supported';

  constructor(
    code: 'base_profile_not_found' | 'proposal_target_not_supported',
    targetId: string,
  ) {
    super(code === 'base_profile_not_found'
      ? `Base profile "${targetId}" is not available for this proposal.`
      : `Proposal target "${targetId}" is not supported by this review surface.`);
    this.name = 'ProfileProposalApplyHookError';
    this.code = code;
  }
}

export async function applyProfileChangeProposal(
  proposal: ProfileChangeProposal,
  deps: ApplyProfileChangeProposalDeps = {},
): Promise<ApplyProfileChangeProposalResult> {
  const now = deps.now?.() ?? Date.now();

  if (proposal.target.kind === 'base_profile') {
    return (deps.applyBase ?? applyPendingBaseProfileChangeProposal)({
      proposalId: proposal.id,
      now,
      actorKind: 'user',
    });
  }

  if (proposal.target.kind === 'profile_branch') {
    const loadRegistry = deps.loadRegistry ?? loadDefaultProfileRegistry;
    const registry = await loadRegistry();
    let baseProfile: DomainProfile<string>;
    try {
      baseProfile = registry.getProfile(proposal.baseProfileId);
    } catch (error) {
      if (error instanceof ProfileNotFoundError) {
        throw new ProfileProposalApplyHookError('base_profile_not_found', proposal.baseProfileId);
      }
      throw error;
    }

    return (deps.applyBranch ?? applyPendingBranchLocalProfileChangeProposal)({
      proposalId: proposal.id,
      baseProfile,
      now,
      actorKind: 'user',
    });
  }

  throw new ProfileProposalApplyHookError(
    'proposal_target_not_supported',
    (proposal.target as { kind: string }).kind,
  );
}

export function useApplyProfileChangeProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (proposal: ProfileChangeProposal) => applyProfileChangeProposal(proposal),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: profileProposalKeys.all() });
      void queryClient.invalidateQueries({ queryKey: profileBranchKeys.all() });
    },
  });
}
