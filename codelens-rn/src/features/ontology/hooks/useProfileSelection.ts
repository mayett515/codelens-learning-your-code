import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { nanoid } from 'nanoid/non-secure';
import {
  profileBaseProfileKeys,
  profileBranchKeys,
  profileSelectionKeys,
} from '../data/queryKeys';
import { loadDefaultProfileRegistry } from '../data/profileRegistryBootstrap';
import {
  getProjectProfileSelectionByProjectId,
  upsertProjectProfileSelection,
} from '../data/profileSelectionRepo';
import {
  insertProfileBranch,
  listProfileBranchesForParent,
} from '../data/profileBranchRepo';
import type {
  ProfileBranch,
  ProfileBranchKind,
  ProfileSelection,
  ProjectProfileSelection,
} from '../types';

export type ProfileSelectionHookErrorCode =
  | 'project_id_required'
  | 'branch_name_required';

export class ProfileSelectionHookError extends Error {
  readonly code: ProfileSelectionHookErrorCode;

  constructor(code: ProfileSelectionHookErrorCode) {
    super(code === 'project_id_required'
      ? 'A project id is required to save a profile selection.'
      : 'A branch name is required to create a profile branch.');
    this.name = 'ProfileSelectionHookError';
    this.code = code;
  }
}

interface SaveProjectProfileSelectionDeps {
  now?: () => number;
  newSelectionId?: () => string;
  loadSelection?: typeof getProjectProfileSelectionByProjectId;
  upsertSelection?: typeof upsertProjectProfileSelection;
}

export interface SaveProjectProfileSelectionInput {
  projectId: string;
  selection: ProfileSelection;
}

export async function saveProjectProfileSelection(
  input: SaveProjectProfileSelectionInput,
  deps: SaveProjectProfileSelectionDeps = {},
): Promise<ProjectProfileSelection> {
  const projectId = input.projectId.trim();
  if (!projectId) {
    throw new ProfileSelectionHookError('project_id_required');
  }

  const now = deps.now?.() ?? Date.now();
  const loadSelection = deps.loadSelection ?? getProjectProfileSelectionByProjectId;
  const upsertSelection = deps.upsertSelection ?? upsertProjectProfileSelection;
  const existing = await loadSelection(projectId);
  const record: ProjectProfileSelection = {
    id: existing?.id ?? (deps.newSelectionId?.() ?? `profile_selection_${nanoid(21)}`),
    projectId,
    selection: {
      ...input.selection,
      projectBranchIds: input.selection.projectBranchIds ? [...input.selection.projectBranchIds] : undefined,
      learningBranchIds: input.selection.learningBranchIds ? [...input.selection.learningBranchIds] : undefined,
      personalBranchIds: input.selection.personalBranchIds ? [...input.selection.personalBranchIds] : undefined,
    },
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await upsertSelection(record);
  return record;
}

interface CreateEmptyProfileBranchDeps {
  now?: () => number;
  newBranchId?: () => string;
  insertBranch?: typeof insertProfileBranch;
}

export interface CreateEmptyProfileBranchInput {
  parentProfileId: string;
  branchKind: ProfileBranchKind;
  name: string;
}

export async function createEmptyProfileBranch(
  input: CreateEmptyProfileBranchInput,
  deps: CreateEmptyProfileBranchDeps = {},
): Promise<ProfileBranch> {
  const name = input.name.trim();
  if (!name) {
    throw new ProfileSelectionHookError('branch_name_required');
  }

  const now = deps.now?.() ?? Date.now();
  const branchId = deps.newBranchId?.() ?? `profile_branch_${nanoid(21)}`;
  const branch: ProfileBranch = {
    id: branchId,
    parentProfileId: input.parentProfileId,
    branchKind: input.branchKind,
    name,
    overlay: {
      id: `overlay_${branchId}`,
      kind: input.branchKind,
    },
    createdAt: now,
    updatedAt: now,
  };

  await (deps.insertBranch ?? insertProfileBranch)(branch);
  return branch;
}

export function useProjectProfileSelection(projectId: string | null | undefined) {
  const normalizedProjectId = projectId?.trim() ?? '';

  return useQuery({
    queryKey: normalizedProjectId
      ? profileSelectionKeys.byProject(normalizedProjectId)
      : profileSelectionKeys.byProject('__missing_project__'),
    queryFn: () => getProjectProfileSelectionByProjectId(normalizedProjectId),
    enabled: normalizedProjectId.length > 0,
  });
}

export function useOntologyProfileSummaries() {
  return useQuery({
    queryKey: profileBaseProfileKeys.summaries(),
    queryFn: async () => {
      const registry = await loadDefaultProfileRegistry();
      return registry.listProfiles();
    },
  });
}

export function useProfileBranchesForParent(parentProfileId: string | null | undefined) {
  const normalizedParentProfileId = parentProfileId?.trim() ?? '';

  return useQuery({
    queryKey: normalizedParentProfileId
      ? profileBranchKeys.byParentProfile(normalizedParentProfileId)
      : profileBranchKeys.byParentProfile('__missing_parent_profile__'),
    queryFn: () => listProfileBranchesForParent(normalizedParentProfileId),
    enabled: normalizedParentProfileId.length > 0,
  });
}

export function useSaveProjectProfileSelection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SaveProjectProfileSelectionInput) => saveProjectProfileSelection(input),
    onSuccess: (record) => {
      void queryClient.invalidateQueries({ queryKey: profileSelectionKeys.byProject(record.projectId) });
      void queryClient.invalidateQueries({ queryKey: profileSelectionKeys.all() });
    },
  });
}

export function useCreateEmptyProfileBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateEmptyProfileBranchInput) => createEmptyProfileBranch(input),
    onSuccess: (branch) => {
      void queryClient.invalidateQueries({ queryKey: profileBranchKeys.byParentProfile(branch.parentProfileId) });
      void queryClient.invalidateQueries({ queryKey: profileBranchKeys.all() });
    },
  });
}
