import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../db/client', () => ({
  db: {},
}));

import {
  ProfileSelectionHookError,
  createEmptyProfileBranch,
  saveProjectProfileSelection,
} from '../hooks/useProfileSelection';
import type { ProjectProfileSelection } from '../types';

function makeExistingSelection(): ProjectProfileSelection {
  return {
    id: 'selection-1',
    projectId: 'project-1',
    selection: {
      baseProfileId: 'coding',
      projectBranchIds: ['old-project'],
    },
    createdAt: 10,
    updatedAt: 20,
  };
}

describe('saveProjectProfileSelection', () => {
  it('upserts a new project-scoped selection with explicit project id and generated id', async () => {
    const upsertSelection = vi.fn(async () => undefined);

    const result = await saveProjectProfileSelection({
      projectId: ' project-1 ',
      selection: {
        baseProfileId: 'coding',
        projectBranchIds: ['react-project'],
      },
    }, {
      now: () => 100,
      newSelectionId: () => 'selection-new',
      loadSelection: vi.fn(async () => undefined),
      upsertSelection,
    });

    expect(result).toEqual({
      id: 'selection-new',
      projectId: 'project-1',
      selection: {
        baseProfileId: 'coding',
        projectBranchIds: ['react-project'],
        learningBranchIds: undefined,
        personalBranchIds: undefined,
      },
      createdAt: 100,
      updatedAt: 100,
    });
    expect(upsertSelection).toHaveBeenCalledWith(result);
  });

  it('preserves existing row identity and createdAt while updating the selection', async () => {
    const existing = makeExistingSelection();
    const loadSelection = vi.fn(async () => existing);
    const upsertSelection = vi.fn(async () => undefined);

    const result = await saveProjectProfileSelection({
      projectId: 'project-1',
      selection: {
        baseProfileId: 'coding',
        projectBranchIds: ['react-project'],
        learningBranchIds: ['typescript-learning'],
      },
    }, {
      now: () => 200,
      newSelectionId: () => 'should-not-be-used',
      loadSelection,
      upsertSelection,
    });

    expect(loadSelection).toHaveBeenCalledWith('project-1');
    expect(result.id).toBe('selection-1');
    expect(result.createdAt).toBe(10);
    expect(result.updatedAt).toBe(200);
    expect(result.selection.projectBranchIds).toEqual(['react-project']);
    expect(result.selection.learningBranchIds).toEqual(['typescript-learning']);
    expect(upsertSelection).toHaveBeenCalledWith(result);
  });

  it('clones selection arrays before upserting', async () => {
    const projectBranchIds = ['react-project'];
    const upsertSelection = vi.fn(async () => undefined);

    const result = await saveProjectProfileSelection({
      projectId: 'project-1',
      selection: {
        baseProfileId: 'coding',
        projectBranchIds,
      },
    }, {
      now: () => 100,
      newSelectionId: () => 'selection-new',
      loadSelection: vi.fn(async () => undefined),
      upsertSelection,
    });

    expect(result.selection.projectBranchIds).toEqual(projectBranchIds);
    expect(result.selection.projectBranchIds).not.toBe(projectBranchIds);
  });

  it('rejects missing project id before loading or writing', async () => {
    const loadSelection = vi.fn();
    const upsertSelection = vi.fn();

    const error = await captureRejection(saveProjectProfileSelection({
      projectId: '   ',
      selection: { baseProfileId: 'coding' },
    }, {
      loadSelection,
      upsertSelection,
    }));

    expect(error).toBeInstanceOf(ProfileSelectionHookError);
    expect((error as ProfileSelectionHookError).code).toBe('project_id_required');
    expect(loadSelection).not.toHaveBeenCalled();
    expect(upsertSelection).not.toHaveBeenCalled();
  });
});

describe('createEmptyProfileBranch', () => {
  it('inserts an empty branch under the selected base profile', async () => {
    const insertBranch = vi.fn(async () => undefined);

    const branch = await createEmptyProfileBranch({
      parentProfileId: 'coding',
      branchKind: 'project',
      name: ' React Project ',
    }, {
      now: () => 300,
      newBranchId: () => 'branch-1',
      insertBranch,
    });

    expect(branch).toEqual({
      id: 'branch-1',
      parentProfileId: 'coding',
      branchKind: 'project',
      name: 'React Project',
      overlay: {
        id: 'overlay_branch-1',
        kind: 'project',
      },
      createdAt: 300,
      updatedAt: 300,
    });
    expect(insertBranch).toHaveBeenCalledWith(branch);
  });

  it('rejects blank branch names before writing', async () => {
    const insertBranch = vi.fn();

    const error = await captureRejection(createEmptyProfileBranch({
      parentProfileId: 'coding',
      branchKind: 'learning',
      name: '   ',
    }, {
      insertBranch,
    }));

    expect(error).toBeInstanceOf(ProfileSelectionHookError);
    expect((error as ProfileSelectionHookError).code).toBe('branch_name_required');
    expect(insertBranch).not.toHaveBeenCalled();
  });
});

async function captureRejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('Expected promise to reject');
}
