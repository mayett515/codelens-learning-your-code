import { describe, expect, it } from 'vitest';
import { validateProfileBranch } from '../codecs/profileBranch';
import type { ProfileBranch, ProfileOverlay } from '../types';

function makeOverlay(kind: 'project' | 'learning' | 'personal' = 'project'): ProfileOverlay {
  return {
    kind,
    id: 'o1',
    addOntologyNodes: [],
    overrideOntologyNodes: undefined,
    addItemTypeNodeIds: undefined,
    addRelationshipTypeNodeIds: undefined,
    overrideLabels: undefined,
    overrideMetadataFields: undefined,
    overrideGraph: undefined,
    overrideOntology: undefined,
  };
}

function makeBranch(overrides: Partial<ProfileBranch> = {}): ProfileBranch {
  return {
    id: 'b1',
    parentProfileId: 'coding',
    branchKind: 'project',
    name: 'Project Alpha',
    overlay: makeOverlay('project'),
    createdAt: 1000,
    updatedAt: 2000,
    ...overrides,
  };
}

describe('validateProfileBranch', () => {
  it('accepts a valid branch', () => {
    const branch = makeBranch();
    expect(validateProfileBranch(branch)).toEqual(branch);
  });

  it('parses overlay_json string and returns a branch', () => {
    const raw = {
      id: 'b1',
      parentProfileId: 'coding',
      branchKind: 'learning',
      name: 'Learning A',
      overlay: JSON.stringify(makeOverlay('learning')),
      createdAt: 1000,
      updatedAt: 2000,
    };
    const result = validateProfileBranch(raw);
    expect(result.overlay.kind).toBe('learning');
  });

  it('parses overlay object directly', () => {
    const raw = {
      id: 'b1',
      parentProfileId: 'coding',
      branchKind: 'personal',
      name: 'Personal A',
      overlay: makeOverlay('personal'),
      createdAt: 1000,
      updatedAt: 2000,
    };
    const result = validateProfileBranch(raw);
    expect(result.overlay.kind).toBe('personal');
  });

  it('rejects mismatched branch/overlay kind', () => {
    const raw = makeBranch({ branchKind: 'project', overlay: makeOverlay('learning') });
    expect(() => validateProfileBranch(raw)).toThrow(/Branch kind mismatch/);
  });

  it('rejects unknown top-level overlay field', () => {
    const raw = {
      ...makeBranch(),
      overlay: {
        ...makeOverlay(),
        storeComposedRuntimeProfile: true,
      },
    };
    expect(() => validateProfileBranch(raw)).toThrow();
  });

  it('rejects missing required branch fields', () => {
    expect(() => validateProfileBranch({})).toThrow();
  });
});
