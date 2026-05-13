import { useMutation, useQueryClient } from '@tanstack/react-query';
import { profileBranchKeys, profileProposalKeys } from '../data/queryKeys';
import { applyPendingBranchLocalProfileChangeProposal } from '../data/branchLocalProposalApplyService';
import { loadDefaultProfileRegistry } from '../data/profileRegistryBootstrap';
import { ProfileNotFoundError } from '../profileRegistry';
import type { DomainProfile, ProfileChangeProposal } from '../types';

export class ProfileProposalApplyHookError extends Error {
  readonly code = 'base_profile_not_found';

  constructor(profileId: string) {
    super(`Base profile "${profileId}" is not available for this proposal.`);
    this.name = 'ProfileProposalApplyHookError';
  }
}

export function useApplyProfileChangeProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (proposal: ProfileChangeProposal) => {
      const registry = await loadDefaultProfileRegistry();
      let baseProfile: DomainProfile<string>;
      try {
        baseProfile = registry.getProfile(proposal.baseProfileId);
      } catch (error) {
        if (error instanceof ProfileNotFoundError) {
          throw new ProfileProposalApplyHookError(proposal.baseProfileId);
        }
        throw error;
      }
      return applyPendingBranchLocalProfileChangeProposal({
        proposalId: proposal.id,
        baseProfile,
        now: Date.now(),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: profileProposalKeys.all() });
      void queryClient.invalidateQueries({ queryKey: profileBranchKeys.all() });
    },
  });
}
