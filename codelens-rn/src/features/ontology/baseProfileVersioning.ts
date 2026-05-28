import type { DomainProfile, ProfileChangeProposal } from './types';

export type BaseProfileVersioningErrorCode =
  | 'proposal_not_base_target'
  | 'proposal_base_mismatch'
  | 'target_profile_version_missing'
  | 'target_profile_version_stale';

export class BaseProfileVersioningError extends Error {
  constructor(
    public readonly code: BaseProfileVersioningErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'BaseProfileVersioningError';
  }
}

export interface AssertBaseProfileProposalTargetVersionInput {
  proposal: ProfileChangeProposal;
  baseProfile: DomainProfile;
}

export function assertBaseProfileProposalTargetsCurrentVersion(
  input: AssertBaseProfileProposalTargetVersionInput,
): void {
  const { proposal, baseProfile } = input;

  if (proposal.target.kind !== 'base_profile' || !proposal.target.profileId) {
    throw new BaseProfileVersioningError(
      'proposal_not_base_target',
      `Proposal ${proposal.id} does not target a base profile.`,
    );
  }

  if (proposal.baseProfileId !== baseProfile.id || proposal.target.profileId !== baseProfile.id) {
    throw new BaseProfileVersioningError(
      'proposal_base_mismatch',
      `Proposal ${proposal.id} targets base profile ${proposal.target.profileId}, but ${baseProfile.id} was provided.`,
    );
  }

  if (proposal.targetProfileVersion == null) {
    throw new BaseProfileVersioningError(
      'target_profile_version_missing',
      `Proposal ${proposal.id} has no target base profile version.`,
    );
  }

  if (proposal.targetProfileVersion !== baseProfile.version) {
    throw new BaseProfileVersioningError(
      'target_profile_version_stale',
      `Proposal ${proposal.id} expected base profile ${baseProfile.id} at version ${proposal.targetProfileVersion}, but current version is ${baseProfile.version}.`,
    );
  }
}
