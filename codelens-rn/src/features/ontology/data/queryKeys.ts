export const profileProposalKeys = {
  all: () => ['ontology', 'profile-change-proposals'] as const,
  byStatus: (status: string) => [...profileProposalKeys.all(), 'status', status] as const,
  pending: () => profileProposalKeys.byStatus('pending'),
} as const;

export const profileProposalEventKeys = {
  all: () => ['ontology', 'profile-proposal-events'] as const,
  byProposal: (proposalId: string) => [...profileProposalEventKeys.all(), 'proposal', proposalId] as const,
} as const;

export const profileProposalFreshnessKeys = {
  all: () => ['ontology', 'profile-proposal-freshness'] as const,
  empty: () => [...profileProposalFreshnessKeys.all(), 'empty'] as const,
  byProposal: (proposalId: string, proposalUpdatedAt: number) =>
    [...profileProposalFreshnessKeys.all(), 'proposal', proposalId, proposalUpdatedAt] as const,
} as const;

export const profileBranchKeys = {
  all: () => ['ontology', 'profile-branches'] as const,
  byParentProfile: (parentProfileId: string) => [...profileBranchKeys.all(), 'parent', parentProfileId] as const,
} as const;

export const profileBaseProfileKeys = {
  all: () => ['ontology', 'base-profiles'] as const,
  summaries: () => [...profileBaseProfileKeys.all(), 'summaries'] as const,
} as const;

export const profileSelectionKeys = {
  all: () => ['ontology', 'profile-selections'] as const,
  byProject: (projectId: string) => [...profileSelectionKeys.all(), 'project', projectId] as const,
} as const;
