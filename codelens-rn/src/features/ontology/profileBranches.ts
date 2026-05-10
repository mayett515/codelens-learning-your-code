import { composeRuntimeDomainProfile } from './runtimeProfileCoordinator';
import { createActiveDomainProfileSource } from './profileActivation';
import type {
  ActiveDomainProfileSource,
  DomainProfile,
  ProfileBranch,
  ProfileOverlay,
} from './types';

/**
 * Extract the overlay from a profile branch.
 *
 * Pure accessor: no mutation, no side effects.
 */
export function profileBranchToOverlay<TItemTypeNodeId extends string = string>(
  branch: ProfileBranch<TItemTypeNodeId>,
): ProfileOverlay<TItemTypeNodeId> {
  return branch.overlay;
}

/**
 * Group an array of profile branches by their branch kind.
 *
 * Returns grouped overlay arrays in kind order:
 * project overlays, then learning overlays, then personal overlays.
 *
 * Input order is preserved within each kind.
 * Does not mutate any branch or overlay objects.
 */
export function groupProfileBranchesByKind<TItemTypeNodeId extends string = string>(
  branches: readonly ProfileBranch<TItemTypeNodeId>[],
): {
  projectOverlays: ProfileOverlay<TItemTypeNodeId>[];
  learningOverlays: ProfileOverlay<TItemTypeNodeId>[];
  personalOverlays: ProfileOverlay<TItemTypeNodeId>[];
} {
  const projectOverlays: ProfileOverlay<TItemTypeNodeId>[] = [];
  const learningOverlays: ProfileOverlay<TItemTypeNodeId>[] = [];
  const personalOverlays: ProfileOverlay<TItemTypeNodeId>[] = [];

  for (const branch of branches) {
    const overlay = branch.overlay;
    switch (branch.branchKind) {
      case 'project':
        projectOverlays.push(overlay);
        break;
      case 'learning':
        learningOverlays.push(overlay);
        break;
      case 'personal':
        personalOverlays.push(overlay);
        break;
    }
  }

  return { projectOverlays, learningOverlays, personalOverlays };
}

/**
 * Create an ActiveDomainProfileSource from a base profile and an array
 * of profile branches.
 *
 * Converts branches into grouped overlays and delegates to the existing
 * activation source helper.
 *
 * Does not mutate the base profile or any branch objects.
 * Returns base profile by reference when branches are empty.
 */
export function createActiveDomainProfileSourceFromBranches<TItemTypeNodeId extends string = string>(
  input: {
    baseProfile: DomainProfile<TItemTypeNodeId>;
    branches: readonly ProfileBranch<TItemTypeNodeId>[];
  },
): ActiveDomainProfileSource<TItemTypeNodeId> {
  const groups = groupProfileBranchesByKind(input.branches);
  return createActiveDomainProfileSource({
    baseProfile: input.baseProfile,
    projectOverlays: groups.projectOverlays,
    learningOverlays: groups.learningOverlays,
    personalOverlays: groups.personalOverlays,
  });
}

/**
 * Compose a runtime DomainProfile from a base profile and an array
 * of profile branches.
 *
 * Delegates to the existing runtime profile coordinator with grouped
 * overlays extracted from the branches.
 *
 * Does not mutate the base profile or any branch objects.
 * Returns base profile by reference when branches are empty.
 */
export function composeRuntimeDomainProfileFromBranches<TItemTypeNodeId extends string = string>(
  input: {
    baseProfile: DomainProfile<TItemTypeNodeId>;
    branches: readonly ProfileBranch<TItemTypeNodeId>[];
  },
): DomainProfile<TItemTypeNodeId> {
  const groups = groupProfileBranchesByKind(input.branches);
  return composeRuntimeDomainProfile({
    baseProfile: input.baseProfile,
    projectOverlays: groups.projectOverlays,
    learningOverlays: groups.learningOverlays,
    personalOverlays: groups.personalOverlays,
  });
}
