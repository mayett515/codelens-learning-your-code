import { useQuery } from '@tanstack/react-query';
import { profileProposalEventKeys } from '../data/queryKeys';
import { listProfileProposalEventsForProposal } from '../data/profileProposalEventRepo';

export function useProfileProposalEventsForProposal(proposalId: string | null | undefined) {
  return useQuery({
    queryKey: proposalId
      ? profileProposalEventKeys.byProposal(proposalId)
      : [...profileProposalEventKeys.all(), 'proposal', 'none'] as const,
    queryFn: () => proposalId ? listProfileProposalEventsForProposal(proposalId) : Promise.resolve([]),
    enabled: Boolean(proposalId),
  });
}
