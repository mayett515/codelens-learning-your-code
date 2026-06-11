import { BaseProfileVersioningError } from '../baseProfileVersioning';
import { BaseProfileProposalApplyError, compileBaseProfileProposalApplyOperation } from '../baseProfileProposalApply';
import { BranchLocalProposalApplyError, compileBranchLocalProposalApplyOperation } from '../branchLocalProposalApply';
import {
  evaluateProfileProposalFreshness,
  type ProfileProposalFreshness,
  type ProfileProposalPatchValidation,
} from '../profileProposalFreshness';
import { ProfileNotFoundError } from '../profileRegistry';
import type {
  ProfileBranch,
  ProfileChangeProposal,
  ProfileDefinition,
  ProfileRegistry,
} from '../types';
import { getProfileBranchById } from './profileBranchRepo';
import { getProfileDefinitionById } from './profileDefinitionRepo';
import { loadDefaultProfileRegistry } from './profileRegistryBootstrap';

export interface ProfileProposalFreshnessServiceDependencies {
  getBranchById(id: string): Promise<ProfileBranch | undefined>;
  getProfileDefinitionById(id: string): Promise<ProfileDefinition | undefined>;
  loadRegistry(): Promise<ProfileRegistry>;
}

export interface LoadProfileProposalFreshnessInput {
  proposal: ProfileChangeProposal;
  now?: number | undefined;
  deps?: Partial<ProfileProposalFreshnessServiceDependencies> | undefined;
}

function resolveDeps(
  deps: Partial<ProfileProposalFreshnessServiceDependencies> | undefined,
): ProfileProposalFreshnessServiceDependencies {
  return {
    getBranchById: (id) => getProfileBranchById(id),
    getProfileDefinitionById: (id) => getProfileDefinitionById(id),
    loadRegistry: () => loadDefaultProfileRegistry(),
    ...deps,
  };
}

export async function loadProfileProposalFreshness(
  input: LoadProfileProposalFreshnessInput,
): Promise<ProfileProposalFreshness> {
  const deps = resolveDeps(input.deps);
  const proposal = input.proposal;
  const now = Math.max(input.now ?? Date.now(), proposal.createdAt, proposal.updatedAt);

  if (proposal.target.kind === 'base_profile') {
    return loadBaseProfileProposalFreshness(proposal, now, deps);
  }
  return loadBranchProposalFreshness(proposal, now, deps);
}

async function loadBaseProfileProposalFreshness(
  proposal: ProfileChangeProposal,
  now: number,
  deps: ProfileProposalFreshnessServiceDependencies,
): Promise<ProfileProposalFreshness> {
  const profileId = proposal.target.profileId ?? proposal.baseProfileId;
  const definition = profileId ? await deps.getProfileDefinitionById(profileId) : undefined;
  const patchValidation = definition
    ? validateBaseProfilePatch(proposal, definition, now)
    : 'unknown';

  return evaluateProfileProposalFreshness({
    proposal,
    target: {
      kind: 'base_profile',
      profileId,
      exists: Boolean(definition),
      currentVersion: definition?.version ?? null,
      patchValidation,
    },
  });
}

async function loadBranchProposalFreshness(
  proposal: ProfileChangeProposal,
  now: number,
  deps: ProfileProposalFreshnessServiceDependencies,
): Promise<ProfileProposalFreshness> {
  const branchId = proposal.target.branchId ?? '';
  const branch = branchId ? await deps.getBranchById(branchId) : undefined;
  const patchValidation = branch
    ? await validateBranchProfilePatch(proposal, branch, now, deps)
    : 'unknown';

  return evaluateProfileProposalFreshness({
    proposal,
    target: {
      kind: 'profile_branch',
      branchId,
      exists: Boolean(branch),
      currentUpdatedAt: branch?.updatedAt ?? null,
      patchValidation,
    },
  });
}

function validateBaseProfilePatch(
  proposal: ProfileChangeProposal,
  definition: ProfileDefinition,
  now: number,
): ProfileProposalPatchValidation {
  try {
    compileBaseProfileProposalApplyOperation({
      proposal: {
        ...proposal,
        targetProfileVersion: definition.version,
      },
      profileDefinition: definition,
      now,
    });
    return 'valid';
  } catch (error) {
    if (isPatchConflict(error)) return 'conflicted';
    if (error instanceof BaseProfileVersioningError || error instanceof BaseProfileProposalApplyError) {
      return 'unknown';
    }
    throw error;
  }
}

async function validateBranchProfilePatch(
  proposal: ProfileChangeProposal,
  branch: ProfileBranch,
  now: number,
  deps: ProfileProposalFreshnessServiceDependencies,
): Promise<ProfileProposalPatchValidation> {
  try {
    const registry = await deps.loadRegistry();
    const baseProfile = registry.getProfile(proposal.baseProfileId);
    compileBranchLocalProposalApplyOperation({
      proposal,
      baseProfile,
      branch,
      now,
    });
    return 'valid';
  } catch (error) {
    if (isPatchConflict(error)) return 'conflicted';
    if (error instanceof ProfileNotFoundError || error instanceof BranchLocalProposalApplyError) {
      return 'unknown';
    }
    throw error;
  }
}

function isPatchConflict(error: unknown): boolean {
  return (
    (error instanceof BranchLocalProposalApplyError || error instanceof BaseProfileProposalApplyError) &&
    error.code === 'patch_conflict'
  );
}
