import { describe, expect, it } from 'vitest';
import {
  validateProfileBranch,
  rowToProfileBranch,
  profileBranchToRow,
} from '../codecs/profileBranch';
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

describe('rowToProfileBranch', () => {
  it('maps DB row with string overlay_json to domain branch', () => {
    const row = {
      id: 'b1',
      parentProfileId: 'coding',
      branchKind: 'project' as const,
      name: 'P',
      overlayJson: JSON.stringify(makeOverlay('project')),
      createdAt: 1000,
      updatedAt: 2000,
    };
    const branch = rowToProfileBranch(row);
    expect(branch.id).toBe('b1');
    expect(branch.overlay.kind).toBe('project');
  });

  it('maps DB row with object overlay_json to domain branch', () => {
    const row = {
      id: 'b1',
      parentProfileId: 'coding',
      branchKind: 'learning' as const,
      name: 'L',
      overlayJson: JSON.stringify(makeOverlay('learning')) as unknown as string,
      createdAt: 1000,
      updatedAt: 2000,
    };
    // Simulate a case where overlayJson might already be parsed by mapper
    const mappedRow = { ...row, overlayJson: makeOverlay('learning') as unknown as string };
    const branch = rowToProfileBranch(mappedRow);
    expect(branch.overlay.kind).toBe('learning');
  });

  it('throws on mismatched kind', () => {
    const row = {
      id: 'b1',
      parentProfileId: 'coding',
      branchKind: 'project' as const,
      name: 'P',
      overlayJson: JSON.stringify(makeOverlay('personal')),
      createdAt: 1000,
      updatedAt: 2000,
    };
    expect(() => rowToProfileBranch(row)).toThrow(/Branch kind mismatch/);
  });
});

describe('profileBranchToRow', () => {
  it('converts domain branch to Drizzle insert row', () => {
    const branch = makeBranch();
    const row = profileBranchToRow(branch);
    expect(row.id).toBe('b1');
    expect(row.parentProfileId).toBe('coding');
    expect(row.branchKind).toBe('project');
    expect(row.name).toBe('Project Alpha');
    expect(row.overlayJson).toEqual(makeOverlay('project'));
    expect(row.createdAt).toBe(1000);
    expect(row.updatedAt).toBe(2000);
  });

  it('throws on mismatched kind', () => {
    const branch = makeBranch({ branchKind: 'project', overlay: makeOverlay('learning') });
    expect(() => profileBranchToRow(branch)).toThrow(/Branch kind mismatch/);
  });
});
