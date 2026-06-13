import type {
  DomainProfileSummary,
  ProfileBranch,
  ProfileBranchKind,
  ProfileSelection,
} from './types';

const BRANCH_KIND_ORDER: readonly ProfileBranchKind[] = ['project', 'learning', 'personal'];

export type ProfileSelectionDraftErrorCode =
  | 'project_id_required'
  | 'base_profile_not_found'
  | 'branch_id_not_found'
  | 'branch_base_mismatch'
  | 'branch_kind_mismatch'
  | 'duplicate_branch_id'
  | 'checker_target_not_selected';

export interface ProfileSelectionDraftError {
  code: ProfileSelectionDraftErrorCode;
  message: string;
  branchId?: string | undefined;
  expectedKind?: ProfileBranchKind | undefined;
  actualKind?: ProfileBranchKind | undefined;
}

export interface ProfileSelectionBaseOption {
  id: string;
  label: string;
  description: string;
  selected: boolean;
}

export interface ProfileSelectionBranchOption {
  id: string;
  name: string;
  branchKind: ProfileBranchKind;
  parentProfileId: string;
  selected: boolean;
  selectedOrder: number | null;
}

export type ProfileSelectionBranchGroups = Readonly<Record<ProfileBranchKind, readonly ProfileSelectionBranchOption[]>>;

export interface ProfileSelectionCheckerTargetOption {
  branchId: string;
  label: string;
  branchKind: ProfileBranchKind;
}

export type ProfileSelectionCheckerTargetState =
  | {
      kind: 'none_selected';
      selectedBranchId: null;
      options: readonly ProfileSelectionCheckerTargetOption[];
      canRunChecker: false;
    }
  | {
      kind: 'single_preselected';
      selectedBranchId: string;
      options: readonly ProfileSelectionCheckerTargetOption[];
      canRunChecker: boolean;
    }
  | {
      kind: 'requires_choice';
      selectedBranchId: null;
      options: readonly ProfileSelectionCheckerTargetOption[];
      canRunChecker: false;
    }
  | {
      kind: 'selected';
      selectedBranchId: string;
      options: readonly ProfileSelectionCheckerTargetOption[];
      canRunChecker: boolean;
    }
  | {
      kind: 'invalid_selection';
      selectedBranchId: null;
      invalidBranchId: string;
      options: readonly ProfileSelectionCheckerTargetOption[];
      canRunChecker: false;
    };

export interface ProfileSelectionDraftModel {
  projectId: string;
  selection: ProfileSelection;
  baseOptions: readonly ProfileSelectionBaseOption[];
  branchGroups: ProfileSelectionBranchGroups;
  selectedBranchIds: Readonly<Record<ProfileBranchKind, readonly string[]>>;
  selectedBranchCount: number;
  checkerTarget: ProfileSelectionCheckerTargetState;
  errors: readonly ProfileSelectionDraftError[];
  canSaveSelection: boolean;
}

export interface CreateProfileSelectionDraftModelInput {
  projectId: string;
  selection: ProfileSelection;
  availableBaseProfiles: readonly DomainProfileSummary[];
  availableBranches: readonly ProfileBranch[];
  checkerTargetBranchId?: string | null | undefined;
}

export type ProfileSelectionBranchMoveDirection = 'up' | 'down';

type SelectedEntry = {
  id: string;
  kind: ProfileBranchKind;
  order: number;
  duplicate: boolean;
};

function idsForKind(selection: ProfileSelection, kind: ProfileBranchKind): readonly string[] {
  switch (kind) {
    case 'project':
      return selection.projectBranchIds ?? [];
    case 'learning':
      return selection.learningBranchIds ?? [];
    case 'personal':
      return selection.personalBranchIds ?? [];
  }
}

function withIdsForKind(
  selection: ProfileSelection,
  kind: ProfileBranchKind,
  ids: readonly string[],
): ProfileSelection {
  switch (kind) {
    case 'project':
      return { ...selection, projectBranchIds: [...ids] };
    case 'learning':
      return { ...selection, learningBranchIds: [...ids] };
    case 'personal':
      return { ...selection, personalBranchIds: [...ids] };
  }
}

function isProfileBranchKind(value: unknown): value is ProfileBranchKind {
  return value === 'project' || value === 'learning' || value === 'personal';
}

function selectedEntries(selection: ProfileSelection): SelectedEntry[] {
  const seen = new Set<string>();
  const duplicateIds = new Set<string>();
  const entries: SelectedEntry[] = [];

  for (const kind of BRANCH_KIND_ORDER) {
    const ids = idsForKind(selection, kind);
    ids.forEach((id, order) => {
      if (seen.has(id)) {
        duplicateIds.add(id);
      }
      seen.add(id);
      entries.push({ id, kind, order, duplicate: false });
    });
  }

  return entries.map((entry) => ({
    ...entry,
    duplicate: duplicateIds.has(entry.id),
  }));
}

function makeBranchOption(
  branch: ProfileBranch,
  selected: boolean,
  selectedOrder: number | null,
): ProfileSelectionBranchOption {
  return {
    id: branch.id,
    name: branch.name,
    branchKind: branch.branchKind,
    parentProfileId: branch.parentProfileId,
    selected,
    selectedOrder,
  };
}

function createBranchGroups(
  selection: ProfileSelection,
  availableBranches: readonly ProfileBranch[],
): ProfileSelectionBranchGroups {
  const branchesForBase = availableBranches.filter((branch) =>
    branch.parentProfileId === selection.baseProfileId && isProfileBranchKind(branch.branchKind),
  );
  const branchById = new Map(branchesForBase.map((branch) => [branch.id, branch]));

  const groups: Record<ProfileBranchKind, ProfileSelectionBranchOption[]> = {
    project: [],
    learning: [],
    personal: [],
  };

  for (const kind of BRANCH_KIND_ORDER) {
    const selectedIds = idsForKind(selection, kind);
    const selectedIdSet = new Set(selectedIds);
    const displayedSelectedIds = new Set<string>();

    selectedIds.forEach((id, order) => {
      if (displayedSelectedIds.has(id)) {
        return;
      }
      const branch = branchById.get(id);
      if (!branch || branch.branchKind !== kind) {
        return;
      }
      displayedSelectedIds.add(id);
      groups[kind].push(makeBranchOption(branch, true, order));
    });

    for (const branch of branchesForBase) {
      if (branch.branchKind !== kind || selectedIdSet.has(branch.id)) {
        continue;
      }
      groups[kind].push(makeBranchOption(branch, false, null));
    }
  }

  return groups;
}

function validateSelection(input: CreateProfileSelectionDraftModelInput): ProfileSelectionDraftError[] {
  const errors: ProfileSelectionDraftError[] = [];
  const trimmedProjectId = input.projectId.trim();
  const baseIds = new Set(input.availableBaseProfiles.map((profile) => profile.id));
  const branchById = new Map(input.availableBranches.map((branch) => [branch.id, branch]));

  if (!trimmedProjectId) {
    errors.push({
      code: 'project_id_required',
      message: 'A project id is required to save a project-scoped profile selection.',
    });
  }

  if (!baseIds.has(input.selection.baseProfileId)) {
    errors.push({
      code: 'base_profile_not_found',
      message: `Base profile "${input.selection.baseProfileId}" is not available.`,
    });
  }

  for (const entry of selectedEntries(input.selection)) {
    const branch = branchById.get(entry.id);

    if (entry.duplicate) {
      errors.push({
        code: 'duplicate_branch_id',
        branchId: entry.id,
        message: `Branch "${entry.id}" is selected more than once.`,
      });
    }

    if (!branch) {
      errors.push({
        code: 'branch_id_not_found',
        branchId: entry.id,
        expectedKind: entry.kind,
        message: `Selected ${entry.kind} branch "${entry.id}" does not exist.`,
      });
      continue;
    }

    const rawKind = branch.branchKind as unknown;
    if (!isProfileBranchKind(rawKind)) {
      errors.push({
        code: 'branch_kind_mismatch',
        branchId: entry.id,
        expectedKind: entry.kind,
        message: `Selected branch "${entry.id}" has unsupported branch kind.`,
      });
      continue;
    }

    if (branch.branchKind !== entry.kind) {
      errors.push({
        code: 'branch_kind_mismatch',
        branchId: entry.id,
        expectedKind: entry.kind,
        actualKind: branch.branchKind,
        message: `Branch "${entry.id}" is ${branch.branchKind}, not ${entry.kind}.`,
      });
    }

    if (branch.parentProfileId !== input.selection.baseProfileId) {
      errors.push({
        code: 'branch_base_mismatch',
        branchId: entry.id,
        expectedKind: entry.kind,
        message: `Branch "${entry.id}" belongs to base "${branch.parentProfileId}", not "${input.selection.baseProfileId}".`,
      });
    }
  }

  return errors;
}

function validSelectedTargetOptions(
  selection: ProfileSelection,
  availableBranches: readonly ProfileBranch[],
): ProfileSelectionCheckerTargetOption[] {
  const branchById = new Map(availableBranches.map((branch) => [branch.id, branch]));
  const options: ProfileSelectionCheckerTargetOption[] = [];
  const seen = new Set<string>();

  for (const entry of selectedEntries(selection)) {
    if (entry.duplicate || seen.has(entry.id)) {
      continue;
    }

    const branch = branchById.get(entry.id);
    if (
      !branch ||
      !isProfileBranchKind(branch.branchKind) ||
      branch.branchKind !== entry.kind ||
      branch.parentProfileId !== selection.baseProfileId
    ) {
      continue;
    }

    seen.add(entry.id);
    options.push({
      branchId: branch.id,
      label: branch.name,
      branchKind: branch.branchKind,
    });
  }

  return options;
}

function createCheckerTargetState(
  input: CreateProfileSelectionDraftModelInput,
  errors: readonly ProfileSelectionDraftError[],
): ProfileSelectionCheckerTargetState {
  const options = validSelectedTargetOptions(input.selection, input.availableBranches);
  const requestedTarget = input.checkerTargetBranchId?.trim() || null;
  const hasErrors = errors.length > 0;

  if (requestedTarget && !options.some((option) => option.branchId === requestedTarget)) {
    return {
      kind: 'invalid_selection',
      selectedBranchId: null,
      invalidBranchId: requestedTarget,
      options,
      canRunChecker: false,
    };
  }

  if (options.length === 0) {
    return {
      kind: 'none_selected',
      selectedBranchId: null,
      options,
      canRunChecker: false,
    };
  }

  if (requestedTarget) {
    return {
      kind: 'selected',
      selectedBranchId: requestedTarget,
      options,
      canRunChecker: !hasErrors,
    };
  }

  if (options.length === 1) {
    return {
      kind: 'single_preselected',
      selectedBranchId: options[0]!.branchId,
      options,
      canRunChecker: !hasErrors,
    };
  }

  return {
    kind: 'requires_choice',
    selectedBranchId: null,
    options,
    canRunChecker: false,
  };
}

export function createProfileSelectionDraftModel(
  input: CreateProfileSelectionDraftModelInput,
): ProfileSelectionDraftModel {
  const errors = validateSelection(input);
  const selectedBranchIds: Readonly<Record<ProfileBranchKind, readonly string[]>> = {
    project: [...idsForKind(input.selection, 'project')],
    learning: [...idsForKind(input.selection, 'learning')],
    personal: [...idsForKind(input.selection, 'personal')],
  };

  return {
    projectId: input.projectId.trim(),
    selection: {
      ...input.selection,
      projectBranchIds: selectedBranchIds.project,
      learningBranchIds: selectedBranchIds.learning,
      personalBranchIds: selectedBranchIds.personal,
    },
    baseOptions: input.availableBaseProfiles.map((profile) => ({
      id: profile.id,
      label: profile.label,
      description: profile.description,
      selected: profile.id === input.selection.baseProfileId,
    })),
    branchGroups: createBranchGroups(input.selection, input.availableBranches),
    selectedBranchIds,
    selectedBranchCount:
      selectedBranchIds.project.length +
      selectedBranchIds.learning.length +
      selectedBranchIds.personal.length,
    checkerTarget: createCheckerTargetState(input, errors),
    errors,
    canSaveSelection: errors.length === 0,
  };
}

export function changeProfileSelectionBase(
  selection: ProfileSelection,
  baseProfileId: string,
): ProfileSelection {
  return {
    ...selection,
    baseProfileId,
    projectBranchIds: [],
    learningBranchIds: [],
    personalBranchIds: [],
  };
}

export function setProfileSelectionBranchSelected(input: {
  selection: ProfileSelection;
  branchKind: ProfileBranchKind;
  branchId: string;
  selected: boolean;
}): ProfileSelection {
  const ids = [...idsForKind(input.selection, input.branchKind)];
  const existingIndex = ids.indexOf(input.branchId);

  if (input.selected) {
    if (existingIndex === -1) {
      ids.push(input.branchId);
    }
  } else if (existingIndex !== -1) {
    ids.splice(existingIndex, 1);
  }

  return withIdsForKind(input.selection, input.branchKind, ids);
}

export function removeProfileSelectionBranch(
  selection: ProfileSelection,
  branchId: string,
): ProfileSelection {
  return {
    ...selection,
    projectBranchIds: (selection.projectBranchIds ?? []).filter((id) => id !== branchId),
    learningBranchIds: (selection.learningBranchIds ?? []).filter((id) => id !== branchId),
    personalBranchIds: (selection.personalBranchIds ?? []).filter((id) => id !== branchId),
  };
}

export function moveProfileSelectionBranch(input: {
  selection: ProfileSelection;
  branchKind: ProfileBranchKind;
  branchId: string;
  direction: ProfileSelectionBranchMoveDirection;
}): ProfileSelection {
  const ids = [...idsForKind(input.selection, input.branchKind)];
  const from = ids.indexOf(input.branchId);
  if (from === -1) return input.selection;

  const to = input.direction === 'up' ? from - 1 : from + 1;
  if (to < 0 || to >= ids.length) return input.selection;

  const [moved] = ids.splice(from, 1);
  ids.splice(to, 0, moved!);
  return withIdsForKind(input.selection, input.branchKind, ids);
}
