import { describe, expect, it } from 'vitest';
import { validateProjectProfileSelection } from '../codecs/profileSelection';
import type { ProjectProfileSelection } from '../types';

function makeRecord(overrides: Partial<ProjectProfileSelection> = {}): ProjectProfileSelection {
  return {
    id: 'sel-1',
    projectId: 'proj-1',
    selection: {
      baseProfileId: 'coding',
      projectBranchIds: ['pb-1'],
      learningBranchIds: ['lb-1'],
      personalBranchIds: ['ps-1'],
    },
    createdAt: 1000,
    updatedAt: 2000,
    ...overrides,
  };
}

describe('validateProjectProfileSelection', () => {
  it('accepts a valid domain record with all branch arrays', () => {
    const raw = makeRecord();
    const result = validateProjectProfileSelection(raw);
    expect(result.id).toBe('sel-1');
    expect(result.projectId).toBe('proj-1');
    expect(result.selection.baseProfileId).toBe('coding');
    expect(result.selection.projectBranchIds).toEqual(['pb-1']);
    expect(result.selection.learningBranchIds).toEqual(['lb-1']);
    expect(result.selection.personalBranchIds).toEqual(['ps-1']);
    expect(result.createdAt).toBe(1000);
    expect(result.updatedAt).toBe(2000);
  });

  it('accepts a record with empty branch arrays', () => {
    const raw = makeRecord({
      selection: {
        baseProfileId: 'coding',
        projectBranchIds: [],
        learningBranchIds: [],
        personalBranchIds: [],
      },
    });
    const result = validateProjectProfileSelection(raw);
    expect(result.selection.projectBranchIds).toEqual([]);
    expect(result.selection.learningBranchIds).toEqual([]);
    expect(result.selection.personalBranchIds).toEqual([]);
  });

  it('accepts a record with omitted optional branch arrays', () => {
    const raw = makeRecord({
      selection: {
        baseProfileId: 'coding',
      },
    });
    const result = validateProjectProfileSelection(raw);
    expect(result.selection.projectBranchIds).toBeUndefined();
    expect(result.selection.learningBranchIds).toBeUndefined();
    expect(result.selection.personalBranchIds).toBeUndefined();
  });

  it('rejects missing baseProfileId', () => {
    const raw = {
      id: 'sel-1',
      projectId: 'proj-1',
      selection: {
        projectBranchIds: ['pb-1'],
      },
      createdAt: 1000,
      updatedAt: 2000,
    };
    expect(() => validateProjectProfileSelection(raw)).toThrow();
  });

  it('rejects non-array projectBranchIds', () => {
    const raw = makeRecord({
      selection: {
        baseProfileId: 'coding',
        projectBranchIds: 'not-an-array' as unknown as readonly string[],
      },
    });
    expect(() => validateProjectProfileSelection(raw)).toThrow();
  });

  it('rejects non-string elements in branch id arrays', () => {
    const raw = makeRecord({
      selection: {
        baseProfileId: 'coding',
        projectBranchIds: [123] as unknown as readonly string[],
      },
    });
    expect(() => validateProjectProfileSelection(raw)).toThrow();
  });

  it('rejects empty strings in branch id arrays', () => {
    const raw = makeRecord({
      selection: {
        baseProfileId: 'coding',
        projectBranchIds: [''],
      },
    });
    expect(() => validateProjectProfileSelection(raw)).toThrow();
  });

  it('preserves array order', () => {
    const raw = makeRecord({
      selection: {
        baseProfileId: 'coding',
        projectBranchIds: ['z', 'a', 'm'],
      },
    });
    const result = validateProjectProfileSelection(raw);
    expect(result.selection.projectBranchIds).toEqual(['z', 'a', 'm']);
  });
});

describe('validateProjectProfileSelection with raw string JSON', () => {
  it('parses branch id arrays from JSON strings', () => {
    const raw = {
      id: 'sel-1',
      projectId: 'proj-1',
      selection: {
        baseProfileId: 'coding',
        projectBranchIds: '["pb-1","pb-2"]',
        learningBranchIds: '["lb-1"]',
        personalBranchIds: '["ps-1"]',
      },
      createdAt: 1000,
      updatedAt: 2000,
    };
    const result = validateProjectProfileSelection(raw);
    expect(result.selection.projectBranchIds).toEqual(['pb-1', 'pb-2']);
    expect(result.selection.learningBranchIds).toEqual(['lb-1']);
    expect(result.selection.personalBranchIds).toEqual(['ps-1']);
  });

  it('rejects non-array JSON strings for branch ids', () => {
    const raw = {
      id: 'sel-1',
      projectId: 'proj-1',
      selection: {
        baseProfileId: 'coding',
        projectBranchIds: '"not-an-array"',
      },
      createdAt: 1000,
      updatedAt: 2000,
    };
    expect(() => validateProjectProfileSelection(raw)).toThrow(/must decode to an array/);
  });

  it('rejects malformed JSON strings for branch ids', () => {
    const raw = {
      id: 'sel-1',
      projectId: 'proj-1',
      selection: {
        baseProfileId: 'coding',
        projectBranchIds: '{bad json',
      },
      createdAt: 1000,
      updatedAt: 2000,
    };
    expect(() => validateProjectProfileSelection(raw)).toThrow(/Invalid JSON/);
  });

  it('rejects non-string elements inside JSON arrays', () => {
    const raw = {
      id: 'sel-1',
      projectId: 'proj-1',
      selection: {
        baseProfileId: 'coding',
        projectBranchIds: '[123]',
      },
      createdAt: 1000,
      updatedAt: 2000,
    };
    expect(() => validateProjectProfileSelection(raw)).toThrow();
  });
});
