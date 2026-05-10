import type { ProfileBranch, ProfileBranchStore } from './types';

/**
 * Create a pure in-memory ProfileBranchStore backed by caller-supplied
 * branch values.
 *
 * The store snapshots the input array at construction time so later
 * caller-side mutation of the original array does not affect store
 * membership or order. Branch objects themselves remain by reference.
 *
 * All methods return Promises to match the ProfileBranchStore boundary,
 * but resolution is synchronous because this implementation is in-memory.
 */
export function createStaticProfileBranchStore<TItemTypeNodeId extends string = string>(
  input: {
    branches: readonly ProfileBranch<TItemTypeNodeId>[];
  },
): ProfileBranchStore<TItemTypeNodeId> {
  // Snapshot the input array so caller mutation does not change store state.
  const snapshot = [...input.branches];

  // Build an id index for fast single-branch lookup.
  const byId = new Map<string, ProfileBranch<TItemTypeNodeId>>();
  for (const branch of snapshot) {
    byId.set(branch.id, branch);
  }

  return {
    async getBranch(id: string): Promise<ProfileBranch<TItemTypeNodeId> | null> {
      return byId.get(id) ?? null;
    },

    async getBranchesByIds(
      ids: readonly string[],
    ): Promise<ProfileBranch<TItemTypeNodeId>[]> {
      const result: ProfileBranch<TItemTypeNodeId>[] = [];
      for (const id of ids) {
        const branch = byId.get(id);
        if (branch) {
          result.push(branch);
        }
      }
      return result;
    },

    async listBranchesForParent(
      parentProfileId: string,
    ): Promise<ProfileBranch<TItemTypeNodeId>[]> {
      return snapshot.filter((branch) => branch.parentProfileId === parentProfileId);
    },
  };
}
