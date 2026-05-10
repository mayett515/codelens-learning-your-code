import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createStaticProfileBranchStore } from '../profileBranchStore';
import type { ProfileBranch, ProfileOverlay } from '../types';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeProfileBranch<TItemTypeNodeId extends string = string>(
  id: string,
  branchKind: ProfileBranch<TItemTypeNodeId>['branchKind'],
  parentProfileId: string,
  overlay: Partial<ProfileOverlay<TItemTypeNodeId>> = {},
  overrides?: Partial<ProfileBranch<TItemTypeNodeId>>,
): ProfileBranch<TItemTypeNodeId> {
  const now = 1_700_000_000_000;
  return {
    id,
    parentProfileId,
    branchKind,
    name: id,
    overlay: {
      id: `overlay-${id}`,
      kind: branchKind,
      ...overlay,
    },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createStaticProfileBranchStore', () => {
  describe('getBranch', () => {
    it('returns the branch by reference when found', async () => {
      const branch = makeProfileBranch('b1', 'project', 'parent-1');
      const store = createStaticProfileBranchStore({ branches: [branch] });

      const result = await store.getBranch('b1');
      expect(result).toBe(branch);
    });

    it('returns null when the branch is not found', async () => {
      const store = createStaticProfileBranchStore({ branches: [] });
      const result = await store.getBranch('missing');
      expect(result).toBeNull();
    });
  });

  describe('getBranchesByIds', () => {
    it('preserves requested id order', async () => {
      const b1 = makeProfileBranch('b1', 'project', 'parent-1');
      const b2 = makeProfileBranch('b2', 'learning', 'parent-1');
      const b3 = makeProfileBranch('b3', 'personal', 'parent-1');
      const store = createStaticProfileBranchStore({ branches: [b1, b2, b3] });

      const result = await store.getBranchesByIds(['b3', 'b1', 'b2']);
      expect(result).toEqual([b3, b1, b2]);
      // Verify by-reference identity
      expect(result[0]).toBe(b3);
      expect(result[1]).toBe(b1);
      expect(result[2]).toBe(b2);
    });

    it('skips missing ids without throwing', async () => {
      const b1 = makeProfileBranch('b1', 'project', 'parent-1');
      const store = createStaticProfileBranchStore({ branches: [b1] });

      const result = await store.getBranchesByIds(['b1', 'missing', 'also-missing']);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(b1);
    });

    it('preserves duplicate requested ids when the id exists', async () => {
      const b1 = makeProfileBranch('b1', 'project', 'parent-1');
      const store = createStaticProfileBranchStore({ branches: [b1] });

      const result = await store.getBranchesByIds(['b1', 'b1', 'b1']);
      expect(result).toHaveLength(3);
      expect(result[0]).toBe(b1);
      expect(result[1]).toBe(b1);
      expect(result[2]).toBe(b1);
    });
  });

  describe('listBranchesForParent', () => {
    it('filters branches by parentProfileId', async () => {
      const p1a = makeProfileBranch('p1a', 'project', 'parent-1');
      const p1b = makeProfileBranch('p1b', 'learning', 'parent-1');
      const p2a = makeProfileBranch('p2a', 'project', 'parent-2');
      const store = createStaticProfileBranchStore({ branches: [p1a, p1b, p2a] });

      const result = await store.listBranchesForParent('parent-1');
      expect(result).toHaveLength(2);
      expect(result[0]).toBe(p1a);
      expect(result[1]).toBe(p1b);
    });

    it('returns empty array when no branches match the parent', async () => {
      const b1 = makeProfileBranch('b1', 'project', 'parent-1');
      const store = createStaticProfileBranchStore({ branches: [b1] });

      const result = await store.listBranchesForParent('nonexistent-parent');
      expect(result).toEqual([]);
    });

    it('preserves constructor/input order', async () => {
      const b1 = makeProfileBranch('b1', 'project', 'parent-1');
      const b2 = makeProfileBranch('b2', 'project', 'parent-1');
      const b3 = makeProfileBranch('b3', 'learning', 'parent-1');
      const store = createStaticProfileBranchStore({ branches: [b1, b2, b3] });

      const result = await store.listBranchesForParent('parent-1');
      expect(result.map((b) => b.id)).toEqual(['b1', 'b2', 'b3']);
    });
  });

  describe('immutability', () => {
    it('caller-side mutation of the original branches array after store creation does not change store results', async () => {
      const b1 = makeProfileBranch('b1', 'project', 'parent-1');
      const b2 = makeProfileBranch('b2', 'learning', 'parent-1');
      const branches = [b1, b2];
      const store = createStaticProfileBranchStore({ branches });

      // Mutate the original array after store creation
      branches.pop();
      branches.push(makeProfileBranch('b3', 'personal', 'parent-1'));

      // Store should still see the original snapshot
      const all = await store.listBranchesForParent('parent-1');
      expect(all).toHaveLength(2);
      expect(all[0]).toBe(b1);
      expect(all[1]).toBe(b2);
      expect(all.map((b) => b.id)).toEqual(['b1', 'b2']);

      const getB3 = await store.getBranch('b3');
      expect(getB3).toBeNull();
    });

    it('frozen input array is accepted without error', async () => {
      const b1 = Object.freeze(makeProfileBranch('b1', 'project', 'parent-1'));
      const frozenBranches = Object.freeze([b1]);
      const store = createStaticProfileBranchStore({ branches: frozenBranches });

      const result = await store.getBranch('b1');
      expect(result).toBe(b1);
    });
  });

  describe('source boundary', () => {
    it('keeps store implementation domain-only', () => {
      const source = fs.readFileSync(
        path.resolve(__dirname, '..', 'profileBranchStore.ts'),
        'utf8',
      );
      const terms = [
        'Async' + 'Storage',
        'sqli' + 'te',
        'driz' + 'zle',
        'sche' + 'ma',
        'd' + 'b',
        'migra' + 'tion',
        'zust' + 'and',
        'create' + 'Store',
        'setActive' + 'Branch',
        'useActive' + 'Branch',
        'profile_' + 'branches',
        'profile_' + 'overlays',
        'automatic' + 'Merge',
        'auto' + 'Merge',
        'apply' + 'Merge',
        'M' + 'CP',
        'ag' + 'ent',
        'app-' + 'builder',
        'Rac' + 'ket',
        'D' + 'SL',
      ];

      for (const term of terms) {
        expect(source).not.toContain(term);
      }
    });

    it('keeps store test domain-only', () => {
      const testSource = fs.readFileSync(
        path.resolve(__dirname, 'profileBranchStore.test.ts'),
        'utf8',
      );
      const terms = [
        'Async' + 'Storage',
        'sqli' + 'te',
        'driz' + 'zle',
        'sche' + 'ma',
        'zust' + 'and',
        'create' + 'Store',
        'setActive' + 'Branch',
        'useActive' + 'Branch',
        'profile_' + 'branches',
        'profile_' + 'overlays',
        'automatic' + 'Merge',
        'auto' + 'Merge',
        'apply' + 'Merge',
        'M' + 'CP',
        'ag' + 'ent',
        'app-' + 'builder',
        'Rac' + 'ket',
        'D' + 'SL',
      ];

      for (const term of terms) {
        expect(testSource).not.toContain(term);
      }
    });
  });
});
