import { composeRuntimeDomainProfileFromBranches } from './profileBranches';
import type {
  DomainProfile,
  ProfileBranch,
  ProfileSelection,
} from './types';

// ---------------------------------------------------------------------------
// Resolved selection: branch values resolved from a ProfileSelection.
// ---------------------------------------------------------------------------

/**
 * A ProfileSelection whose ids have been resolved into concrete branch values.
 * Branches are returned in normalized kind order: project, learning, personal.
 * Order within each kind matches the order specified in the selection arrays.
 */
export interface ResolvedProfileSelection<TItemTypeNodeId extends string = string> {
  baseProfile: DomainProfile<TItemTypeNodeId>;
  branches: ProfileBranch<TItemTypeNodeId>[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const KIND_ORDER: ReadonlyArray<ProfileBranch['branchKind']> = [
  'project',
  'learning',
  'personal',
];

function resolveIds<TItemTypeNodeId extends string>(
  selection: ProfileSelection,
  branches: readonly ProfileBranch<TItemTypeNodeId>[],
): ProfileBranch<TItemTypeNodeId>[] {
  const branchMap = new Map<string, ProfileBranch<TItemTypeNodeId>>();
  const kindOfSelectedId = new Map<string, ProfileBranch['branchKind']>();

  for (const branch of branches) {
    branchMap.set(branch.id, branch);
    kindOfSelectedId.set(branch.id, branch.branchKind);
  }

  const result: ProfileBranch<TItemTypeNodeId>[] = [];

  for (const kind of KIND_ORDER) {
    const ids =
      kind === 'project'
        ? selection.projectBranchIds
        : kind === 'learning'
          ? selection.learningBranchIds
          : selection.personalBranchIds;

    if (!ids) continue;

    for (const id of ids) {
      const selectedKind = kindOfSelectedId.get(id);

      if (selectedKind === undefined) {
        throw new Error(
          `Selected branch id "${id}" not found in provided branches.`,
        );
      }

      if (selectedKind !== kind) {
        throw new Error(
          `Branch id "${id}" has kind "${selectedKind}" but was listed under "${kind}".`,
        );
      }

      const branch = branchMap.get(id);
      if (branch) {
        result.push(branch);
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve a ProfileSelection into concrete branch values.
 *
 * Pure function: no mutation, no persistence, no side effects.
 *
 * - Throws if `selection.baseProfileId` does not match `baseProfile.id`.
 * - Throws if a selected branch id is not found in the provided branches array.
 * - Throws if a branch id is listed under the wrong kind section.
 * - Returns branches in normalized kind order: project, learning, personal.
 * - Preserves selection order within each kind.
 */
export function resolveProfileSelection<TItemTypeNodeId extends string = string>(input: {
  selection: ProfileSelection;
  baseProfile: DomainProfile<TItemTypeNodeId>;
  branches: readonly ProfileBranch<TItemTypeNodeId>[];
}): ResolvedProfileSelection<TItemTypeNodeId> {
  if (input.selection.baseProfileId !== input.baseProfile.id) {
    throw new Error(
      `Selection baseProfileId "${input.selection.baseProfileId}" does not match ` +
      `provided base profile id "${input.baseProfile.id}".`,
    );
  }

  const resolvedBranches = resolveIds(
    input.selection,
    input.branches,
  );

  return {
    baseProfile: input.baseProfile,
    branches: resolvedBranches,
  };
}

/**
 * Compose a runtime DomainProfile from a ProfileSelection.
 *
 * Resolves branch ids into values and delegates to the existing
 * branch composition helper (`composeRuntimeDomainProfileFromBranches`),
 * which in turn delegates to the runtime profile coordinator.
 *
 * Pure function: no mutation, no persistence, no side effects.
 *
 * - Returns the base profile by reference when no branches are selected.
 * - Throws on baseProfileId mismatch, missing branch id, or wrong-kind branch id.
 */
export function composeRuntimeDomainProfileFromSelection<TItemTypeNodeId extends string = string>(input: {
  selection: ProfileSelection;
  baseProfile: DomainProfile<TItemTypeNodeId>;
  branches: readonly ProfileBranch<TItemTypeNodeId>[];
}): DomainProfile<TItemTypeNodeId> {
  const resolved = resolveProfileSelection(input);
  return composeRuntimeDomainProfileFromBranches({
    baseProfile: resolved.baseProfile,
    branches: resolved.branches,
  });
}
