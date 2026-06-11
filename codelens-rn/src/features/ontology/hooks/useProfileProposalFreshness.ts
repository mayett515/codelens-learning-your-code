import { useQuery } from '@tanstack/react-query';
import { profileProposalFreshnessKeys } from '../data/queryKeys';
import { loadProfileProposalFreshness } from '../data/profileProposalFreshnessService';
import type { ProfileChangeProposal } from '../types';

export function useProfileProposalFreshness(
  proposal: ProfileChangeProposal | null | undefined,
) {
  return useQuery({
    queryKey: proposal
      ? profileProposalFreshnessKeys.byProposal(proposal.id, proposal.updatedAt)
      : profileProposalFreshnessKeys.empty(),
    queryFn: () => loadProfileProposalFreshness({ proposal: proposal! }),
    enabled: Boolean(proposal),
  });
}
