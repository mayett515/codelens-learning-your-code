import type {
  DomainProfile,
  ProfileBranch,
  ProfileBranchStore,
  ProfileSelection,
  ProjectProfileSelection,
} from './types';
import {
  composeRuntimeDomainProfileFromSelection,
} from './profileSelection';
import type { ProfileRegistry } from './types';
import { ProfileNotFoundError } from './profileRegistry';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default base profile id used when no project selection row exists. */
export const DEFAULT_RUNTIME_PROFILE_BASE_PROFILE_ID = 'coding';

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

/** Structured error codes for runtime profile activation failures. */
export type RuntimeProfileActivationErrorCode =
  | 'missing-base-profile'
  | 'missing-branch-id'
  | 'wrong-kind-branch-id';

/**
 * Thrown when runtime profile activation fails for a specific project.
 *
 * Wraps underlying errors (e.g. ProfileNotFoundError) and adds
 * project-scoped context. Does not mutate any input data.
 */
export class RuntimeProfileActivationError<
  TItemTypeNodeId extends string = string
> extends Error {
  readonly code: RuntimeProfileActivationErrorCode;
  readonly projectId: string;
  readonly branchId?: string | undefined;
  readonly expectedKind?:
    | 'project'
    | 'learning'
    | 'personal'
    | undefined;
  readonly actualKind?:
    | 'project'
    | 'learning'
    | 'personal'
    | undefined;

  constructor(params: {
    code: RuntimeProfileActivationErrorCode;
    projectId: string;
    message: string;
    cause?: unknown;
    branchId?: string | undefined;
    expectedKind?:
      | 'project'
      | 'learning'
      | 'personal'
      | undefined;
    actualKind?:
      | 'project'
      | 'learning'
      | 'personal'
      | undefined;
  }) {
    super(params.message);
    this.name = 'RuntimeProfileActivationError';
    this.code = params.code;
    this.projectId = params.projectId;
    this.branchId = params.branchId;
    this.expectedKind = params.expectedKind;
    this.actualKind = params.actualKind;
  }
}

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

/**
 * A tiny interface around a caller-supplied project profile selection source.
 *
 * Implementations may be DB-backed, in-memory, or remote. The activation
 * layer only needs this single async getter.
 */
export interface ProjectProfileSelectionStore {
  getProjectProfileSelectionByProjectId(
    projectId: string,
  ): Promise<ProjectProfileSelection | null | undefined>;
}

// ---------------------------------------------------------------------------
// Activation input / result
// ---------------------------------------------------------------------------

/**
 * Input for resolving a runtime profile for a project/context.
 *
 * All stores are caller-supplied so the activation layer remains
 * interface-based and testable without DB clients.
 */
export interface ProjectRuntimeProfileActivationInput<
  TItemTypeNodeId extends string = string,
> {
  projectId: string;
  selectionStore: ProjectProfileSelectionStore;
  profileRegistry: ProfileRegistry<TItemTypeNodeId>;
  branchStore: ProfileBranchStore<TItemTypeNodeId>;
  defaultBaseProfileId?: string | undefined;
}

/**
 * Result of resolving a runtime profile for a project/context.
 *
 * Includes the composed profile plus trace data for debugging and future
 * explanation surfaces.
 */
export interface ProjectRuntimeProfileActivationResult<
  TItemTypeNodeId extends string = string,
> {
  profile: DomainProfile<TItemTypeNodeId>;
  selection: ProfileSelection;
  baseProfile: DomainProfile<TItemTypeNodeId>;
  branches: ProfileBranch<TItemTypeNodeId>[];
}
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve a runtime DomainProfile for a project/context.
 *
 * Pure-ish async wiring function: reads a project selection, resolves the
 * base profile through the caller-supplied registry, resolves selected
 * branch ids through the caller-supplied branch store, then composes
 * through the existing pure selection helper.
 *
 * - No global active profile state is stored.
 * - No composed runtime profiles are persisted.
 * - No inputs are mutated.
 * - Missing selection falls back to the default base profile.
 * - Invalid references throw structured RuntimeProfileActivationError.
 */
export async function resolveRuntimeProfileForProject<
  TItemTypeNodeId extends string = string,
>(
  input: ProjectRuntimeProfileActivationInput<TItemTypeNodeId>,
): Promise<ProjectRuntimeProfileActivationResult<TItemTypeNodeId>> {
  const { projectId, selectionStore, profileRegistry, branchStore } = input;
  const defaultBaseProfileId =
    input.defaultBaseProfileId ?? DEFAULT_RUNTIME_PROFILE_BASE_PROFILE_ID;

  // 1. Load project selection (or use fallback).
  const row = await selectionStore.getProjectProfileSelectionByProjectId(
    projectId,
  );
  const selection: ProfileSelection =
    row != null && row.selection != null
      ? row.selection
      : { baseProfileId: defaultBaseProfileId };

  // 2. Resolve base profile through the registry.
  let baseProfile: DomainProfile<TItemTypeNodeId>;
  try {
    baseProfile = profileRegistry.getProfile(selection.baseProfileId);
  } catch (e) {
    if (e instanceof ProfileNotFoundError) {
      throw new RuntimeProfileActivationError<TItemTypeNodeId>({
        code: 'missing-base-profile',
        projectId,
        message:
          'Base profile "' +
          selection.baseProfileId +
          '" not found for project "' +
          projectId +
          '".',
        cause: e,
      });
    }
    throw e;
  }

  // 3. Collect all selected branch ids in project -> learning -> personal order.
  const allSelectedIds: string[] = [];
  if (selection.projectBranchIds) {
    allSelectedIds.push(...selection.projectBranchIds);
  }
  if (selection.learningBranchIds) {
    allSelectedIds.push(...selection.learningBranchIds);
  }
  if (selection.personalBranchIds) {
    allSelectedIds.push(...selection.personalBranchIds);
  }

  // 4. Resolve branches through the branch store.
  const branches = await branchStore.getBranchesByIds(allSelectedIds);

  // 5. Detect missing branch ids (branchStore skips missing ids).
  if (allSelectedIds.length > 0) {
    const foundIds = new Set(branches.map((b) => b.id));
    for (const id of allSelectedIds) {
      if (!foundIds.has(id)) {
        throw new RuntimeProfileActivationError<TItemTypeNodeId>({
          code: 'missing-branch-id',
          projectId,
          message:
            'Selected branch id "' +
            id +
            '" not found in branch store for project "' +
            projectId +
            '".',
          branchId: id,
        });
      }
    }
  }

  // 6. Detect wrong-kind branch ids before composition.
  const kindOfId = new Map<string, 'project' | 'learning' | 'personal'>();
  for (const branch of branches) {
    kindOfId.set(branch.id, branch.branchKind);
  }

  const kindLabels: ReadonlyArray<{
    key: keyof Pick<ProfileSelection,
      'projectBranchIds' | 'learningBranchIds' | 'personalBranchIds'>;
    expectedKind: 'project' | 'learning' | 'personal';
  }> = [
    { key: 'projectBranchIds', expectedKind: 'project' },
    { key: 'learningBranchIds', expectedKind: 'learning' },
    { key: 'personalBranchIds', expectedKind: 'personal' },
  ];

  for (const { key, expectedKind } of kindLabels) {
    const ids = selection[key];
    if (!ids) continue;
    for (const id of ids) {
      const actualKind = kindOfId.get(id);
      if (actualKind !== undefined && actualKind !== expectedKind) {
        throw new RuntimeProfileActivationError<TItemTypeNodeId>({
          code: 'wrong-kind-branch-id',
          projectId,
          message:
            'Branch id "' +
            id +
            '" has kind "' +
            actualKind +
            '" but was listed under "' +
            expectedKind +
            '" for project "' +
            projectId +
            '".',
          branchId: id,
          expectedKind,
          actualKind,
        });
      }
    }
  }

  // 7. Compose through the existing pure selection helper.
  const profile = composeRuntimeDomainProfileFromSelection({
    selection,
    baseProfile,
    branches,
  });

  // 8. Return the result with trace data.
  return {
    profile,
    selection,
    baseProfile,
    branches,
  };
}
