export const profileProposalKeys = {
  all: () => ['ontology', 'profile-change-proposals'] as const,
  byStatus: (status: string) => [...profileProposalKeys.all(), 'status', status] as const,
  pending: () => profileProposalKeys.byStatus('pending'),
} as const;

export const profileBranchKeys = {
  all: () => ['ontology', 'profile-branches'] as const,
  byParentProfile: (parentProfileId: string) => [...profileBranchKeys.all(), 'parent', parentProfileId] as const,
} as const;
