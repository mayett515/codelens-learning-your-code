import { describe, expect, it } from 'vitest';
import {
  validateProjectProfileSelection,
  rowToProjectProfileSelection,
  projectProfileSelectionToRow,
} from '../codecs/profileSelection';
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

function makeDrizzleRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sel-1',
    projectId: 'proj-1',
    baseProfileId: 'coding',
    projectBranchIdsJson: [] as string[],
    learningBranchIdsJson: [] as string[],
    personalBranchIdsJson: [] as string[],
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

describe('rowToProjectProfileSelection', () => {
  it('converts a Drizzle row with decoded JSON arrays to domain record', () => {
    const row = makeDrizzleRow({
      projectBranchIdsJson: ['pb-1', 'pb-2'],
      learningBranchIdsJson: ['lb-1'],
      personalBranchIdsJson: ['ps-1'],
    });
    const result = rowToProjectProfileSelection(row);
    expect(result.id).toBe('sel-1');
    expect(result.projectId).toBe('proj-1');
    expect(result.selection.baseProfileId).toBe('coding');
    expect(result.selection.projectBranchIds).toEqual(['pb-1', 'pb-2']);
    expect(result.selection.learningBranchIds).toEqual(['lb-1']);
    expect(result.selection.personalBranchIds).toEqual(['ps-1']);
  });

  it('omits undefined for empty branch arrays', () => {
    const row = makeDrizzleRow({
      projectBranchIdsJson: [],
      learningBranchIdsJson: [],
      personalBranchIdsJson: [],
    });
    const result = rowToProjectProfileSelection(row);
    expect(result.selection.projectBranchIds).toBeUndefined();
    expect(result.selection.learningBranchIds).toBeUndefined();
    expect(result.selection.personalBranchIds).toBeUndefined();
  });

  it('converts a row with raw JSON-string branch id columns', () => {
    const row = makeDrizzleRow({
      projectBranchIdsJson: '["pb-1","pb-2"]',
      learningBranchIdsJson: '["lb-1"]',
      personalBranchIdsJson: '["ps-1"]',
    }) as unknown as Parameters<typeof rowToProjectProfileSelection>[0];

    const result = rowToProjectProfileSelection(row);

    expect(result.selection.projectBranchIds).toEqual(['pb-1', 'pb-2']);
    expect(result.selection.learningBranchIds).toEqual(['lb-1']);
    expect(result.selection.personalBranchIds).toEqual(['ps-1']);
  });
});

describe('projectProfileSelectionToRow', () => {
  it('converts a domain record to Drizzle insert row with arrays', () => {
    const record = makeRecord();
    const row = projectProfileSelectionToRow(record);
    expect(row.id).toBe('sel-1');
    expect(row.projectId).toBe('proj-1');
    expect(row.baseProfileId).toBe('coding');
    expect(row.projectBranchIdsJson).toEqual(['pb-1']);
    expect(row.learningBranchIdsJson).toEqual(['lb-1']);
    expect(row.personalBranchIdsJson).toEqual(['ps-1']);
    expect(row.createdAt).toBe(1000);
    expect(row.updatedAt).toBe(2000);
  });

  it('produces empty arrays for missing branch arrays', () => {
    const record = makeRecord({
      selection: {
        baseProfileId: 'coding',
      },
    });
    const row = projectProfileSelectionToRow(record);
    expect(row.projectBranchIdsJson).toEqual([]);
    expect(row.learningBranchIdsJson).toEqual([]);
    expect(row.personalBranchIdsJson).toEqual([]);
  });

  it('does not produce JSON strings -- arrays are passed directly', () => {
    const record = makeRecord();
    const row = projectProfileSelectionToRow(record);
    expect(Array.isArray(row.projectBranchIdsJson)).toBe(true);
    expect(Array.isArray(row.learningBranchIdsJson)).toBe(true);
    expect(Array.isArray(row.personalBranchIdsJson)).toBe(true);
    expect(typeof row.projectBranchIdsJson).not.toBe('string');
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

describe('Round-trip: domain -> Drizzle row -> domain', () => {
  it('preserves all fields through codec round-trip', () => {
    const original = makeRecord();
    const row = projectProfileSelectionToRow(original);
    const drizzleSelect = {
      id: row.id,
      projectId: row.projectId,
      baseProfileId: row.baseProfileId,
      projectBranchIdsJson: row.projectBranchIdsJson ?? [],
      learningBranchIdsJson: row.learningBranchIdsJson ?? [],
      personalBranchIdsJson: row.personalBranchIdsJson ?? [],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
    const result = rowToProjectProfileSelection(drizzleSelect);
    expect(result.id).toBe(original.id);
    expect(result.projectId).toBe(original.projectId);
    expect(result.selection.baseProfileId).toBe(original.selection.baseProfileId);
    expect(result.selection.projectBranchIds).toEqual(original.selection.projectBranchIds);
    expect(result.selection.learningBranchIds).toEqual(original.selection.learningBranchIds);
    expect(result.selection.personalBranchIds).toEqual(original.selection.personalBranchIds);
    expect(result.createdAt).toBe(original.createdAt);
    expect(result.updatedAt).toBe(original.updatedAt);
  });
});
