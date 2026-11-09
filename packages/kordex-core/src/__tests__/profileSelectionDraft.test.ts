import { describe, expect, it } from 'vitest';
import {
  changeProfileSelectionBase,
  createProfileSelectionDraftModel,
  moveProfileSelectionBranch,
  removeProfileSelectionBranch,
  setProfileSelectionBranchSelected,
} from '../profileSelectionDraft';
import {
  createProfileSelectionDraftModel as barrelCreateProfileSelectionDraftModel,
} from '../index';
import type {
  DomainProfileSummary,
  ProfileBranch,
  ProfileBranchKind,
  ProfileOverlay,
  ProfileSelection,
} from '../types';

function makeBase(id: string, label = id): DomainProfileSummary {
  return {
    id,
    version: 1,
    label,
    description: `${label} profile`,
  };
}

function makeBranch(
  id: string,
  branchKind: ProfileBranchKind,
  overrides: Partial<ProfileBranch> = {},
): ProfileBranch {
  const now = 1_700_000_000_000;
  const overlay: ProfileOverlay = {
    id: `overlay-${id}`,
    kind: branchKind,
  };

  return {
    id,
    parentProfileId: 'coding',
    branchKind,
    name: id,
    overlay,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function modelFor(
  selection: ProfileSelection,
  overrides: Partial<Parameters<typeof createProfileSelectionDraftModel>[0]> = {},
) {
  return createProfileSelectionDraftModel({
    projectId: 'project-1',
    selection,
    availableBaseProfiles: [makeBase('coding'), makeBase('photography')],
    availableBranches: [],
    ...overrides,
  });
}

describe('createProfileSelectionDraftModel', () => {
  it('is exported from the public ontology barrel', () => {
    expect(barrelCreateProfileSelectionDraftModel).toBe(createProfileSelectionDraftModel);
  });

  it('groups branches by kind and preserves selected order before unselected options', () => {
    const result = modelFor(
      {
        baseProfileId: 'coding',
        projectBranchIds: ['project-a', 'project-b'],
        learningBranchIds: ['learning-a'],
        personalBranchIds: ['personal-a'],
      },
      {
        availableBranches: [
          makeBranch('project-b', 'project'),
          makeBranch('project-c', 'project'),
          makeBranch('learning-a', 'learning'),
          makeBranch('personal-a', 'personal'),
          makeBranch('project-a', 'project'),
          makeBranch('other-base-project', 'project', { parentProfileId: 'photography' }),
        ],
      },
    );

    expect(result.errors).toEqual([]);
    expect(result.branchGroups.project.map((option) => option.id)).toEqual([
      'project-a',
      'project-b',
      'project-c',
    ]);
    expect(result.branchGroups.learning.map((option) => option.id)).toEqual(['learning-a']);
    expect(result.branchGroups.personal.map((option) => option.id)).toEqual(['personal-a']);
    expect(result.selectedBranchIds.project).toEqual(['project-a', 'project-b']);
  });

  it('rejects an unavailable base profile', () => {
    const result = modelFor({ baseProfileId: 'missing-base' });

    expect(result.canSaveSelection).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'base_profile_not_found' }),
    );
  });

  it('rejects selected branch ids that do not exist', () => {
    const result = modelFor({
      baseProfileId: 'coding',
      projectBranchIds: ['missing-project'],
    });

    expect(result.canSaveSelection).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: 'branch_id_not_found',
        branchId: 'missing-project',
        expectedKind: 'project',
      }),
    );
  });

  it('rejects selected branches from another base instead of carrying them across a base change', () => {
    const result = modelFor(
      {
        baseProfileId: 'photography',
        projectBranchIds: ['react-project'],
      },
      {
        availableBranches: [
          makeBranch('react-project', 'project', { parentProfileId: 'coding' }),
        ],
      },
    );

    expect(result.canSaveSelection).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: 'branch_base_mismatch',
        branchId: 'react-project',
      }),
    );
    expect(result.branchGroups.project).toEqual([]);
  });

  it('rejects branch ids listed under the wrong branch kind', () => {
    const result = modelFor(
      {
        baseProfileId: 'coding',
        learningBranchIds: ['react-project'],
      },
      {
        availableBranches: [makeBranch('react-project', 'project')],
      },
    );

    expect(result.canSaveSelection).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: 'branch_kind_mismatch',
        branchId: 'react-project',
        expectedKind: 'learning',
        actualKind: 'project',
      }),
    );
  });

  it('rejects duplicate branch ids within and across selected arrays', () => {
    const result = modelFor(
      {
        baseProfileId: 'coding',
        projectBranchIds: ['react-project', 'react-project'],
        learningBranchIds: ['react-project'],
      },
      {
        availableBranches: [makeBranch('react-project', 'project')],
      },
    );

    expect(result.canSaveSelection).toBe(false);
    expect(result.errors.filter((error) => error.code === 'duplicate_branch_id')).toHaveLength(3);
    expect(result.branchGroups.project.map((option) => option.id)).toEqual(['react-project']);
  });

  it('requires an explicit project id rather than reading hidden current-project state', () => {
    const result = modelFor(
      { baseProfileId: 'coding' },
      { projectId: '   ' },
    );

    expect(result.projectId).toBe('');
    expect(result.canSaveSelection).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'project_id_required' }),
    );
  });

  it('returns no checker target when no branch is selected', () => {
    const result = modelFor({ baseProfileId: 'coding' });

    expect(result.checkerTarget.kind).toBe('none_selected');
    expect(result.checkerTarget.selectedBranchId).toBeNull();
    expect(result.checkerTarget.canRunChecker).toBe(false);
  });

  it('preselects the checker target when exactly one valid branch is selected', () => {
    const result = modelFor(
      {
        baseProfileId: 'coding',
        projectBranchIds: ['react-project'],
      },
      {
        availableBranches: [makeBranch('react-project', 'project')],
      },
    );

    expect(result.canSaveSelection).toBe(true);
    expect(result.checkerTarget).toMatchObject({
      kind: 'single_preselected',
      selectedBranchId: 'react-project',
      canRunChecker: true,
    });
  });

  it('requires explicit checker target choice when multiple branches are selected', () => {
    const result = modelFor(
      {
        baseProfileId: 'coding',
        projectBranchIds: ['react-project'],
        personalBranchIds: ['personal-style'],
      },
      {
        availableBranches: [
          makeBranch('react-project', 'project'),
          makeBranch('personal-style', 'personal'),
        ],
      },
    );

    expect(result.checkerTarget.kind).toBe('requires_choice');
    expect(result.checkerTarget.selectedBranchId).toBeNull();
    expect(result.checkerTarget.canRunChecker).toBe(false);
    expect(result.checkerTarget.options.map((option) => option.branchId)).toEqual([
      'react-project',
      'personal-style',
    ]);
  });

  it('accepts an explicit checker target when multiple selected branches are valid', () => {
    const result = modelFor(
      {
        baseProfileId: 'coding',
        projectBranchIds: ['react-project'],
        personalBranchIds: ['personal-style'],
      },
      {
        availableBranches: [
          makeBranch('react-project', 'project'),
          makeBranch('personal-style', 'personal'),
        ],
        checkerTargetBranchId: 'personal-style',
      },
    );

    expect(result.checkerTarget).toMatchObject({
      kind: 'selected',
      selectedBranchId: 'personal-style',
      canRunChecker: true,
    });
  });

  it('rejects a checker target that is not part of the selected branches', () => {
    const result = modelFor(
      {
        baseProfileId: 'coding',
        projectBranchIds: ['react-project'],
      },
      {
        availableBranches: [
          makeBranch('react-project', 'project'),
          makeBranch('other-project', 'project'),
        ],
        checkerTargetBranchId: 'other-project',
      },
    );

    expect(result.checkerTarget).toMatchObject({
      kind: 'invalid_selection',
      selectedBranchId: null,
      invalidBranchId: 'other-project',
      canRunChecker: false,
    });
  });
});

describe('profile selection draft edit helpers', () => {
  it('clears branch ids when the base profile changes', () => {
    const result = changeProfileSelectionBase({
      baseProfileId: 'coding',
      projectBranchIds: ['project-a'],
      learningBranchIds: ['learning-a'],
      personalBranchIds: ['personal-a'],
    }, 'photography');

    expect(result).toEqual({
      baseProfileId: 'photography',
      projectBranchIds: [],
      learningBranchIds: [],
      personalBranchIds: [],
    });
  });

  it('selects and deselects one branch without changing other branch-kind arrays', () => {
    const selected = setProfileSelectionBranchSelected({
      selection: {
        baseProfileId: 'coding',
        learningBranchIds: ['learning-a'],
      },
      branchKind: 'project',
      branchId: 'project-a',
      selected: true,
    });

    expect(selected.projectBranchIds).toEqual(['project-a']);
    expect(selected.learningBranchIds).toEqual(['learning-a']);

    const deselected = setProfileSelectionBranchSelected({
      selection: selected,
      branchKind: 'project',
      branchId: 'project-a',
      selected: false,
    });

    expect(deselected.projectBranchIds).toEqual([]);
    expect(deselected.learningBranchIds).toEqual(['learning-a']);
  });

  it('moves selected branches only inside their same-kind ordered array', () => {
    const result = moveProfileSelectionBranch({
      selection: {
        baseProfileId: 'coding',
        projectBranchIds: ['project-a', 'project-b', 'project-c'],
        personalBranchIds: ['personal-a'],
      },
      branchKind: 'project',
      branchId: 'project-c',
      direction: 'up',
    });

    expect(result.projectBranchIds).toEqual(['project-a', 'project-c', 'project-b']);
    expect(result.personalBranchIds).toEqual(['personal-a']);
  });

  it('removes a stale branch id from every branch-kind array', () => {
    const result = removeProfileSelectionBranch({
      baseProfileId: 'coding',
      projectBranchIds: ['shared', 'project-a'],
      learningBranchIds: ['shared'],
      personalBranchIds: ['personal-a', 'shared'],
    }, 'shared');

    expect(result).toEqual({
      baseProfileId: 'coding',
      projectBranchIds: ['project-a'],
      learningBranchIds: [],
      personalBranchIds: ['personal-a'],
    });
  });
});
