import {
  DEFAULT_RUNTIME_PROFILE_BASE_PROFILE_ID,
  getActiveDomainProfile,
  resolveRuntimeProfileForProject,
  type ContextCompositionStamp,
  type ContextScopeLegend,
  type DomainProfile,
  type OntologyCorrectionActiveSelectionSnapshot,
  type ProfileBranch,
  type ProfileChangeProposalTarget,
  type ProfileRegistry,
} from '../../ontology';
import {
  getProfileBranchesByIds,
  getProjectProfileSelectionByProjectId,
  listProfileBranchesForParent,
  loadDefaultProfileRegistry,
} from '../../ontology/data';

export interface ConceptualizeProfileContext {
  profile: DomainProfile;
  baseProfile: DomainProfile;
  branches: readonly ProfileBranch[];
  selectionSnapshot: OntologyCorrectionActiveSelectionSnapshot;
  proposalTarget: ProfileChangeProposalTarget;
  compositionStamp: ContextCompositionStamp;
  scopeLegend: ContextScopeLegend;
}

export interface ResolveConceptualizeProfileContextDeps {
  loadRegistry: () => Promise<ProfileRegistry>;
  getSelectionByProjectId: typeof getProjectProfileSelectionByProjectId;
  getBranchesByIds: typeof getProfileBranchesByIds;
  listBranchesForParent: typeof listProfileBranchesForParent;
}

const defaultDeps: ResolveConceptualizeProfileContextDeps = {
  loadRegistry: loadDefaultProfileRegistry,
  getSelectionByProjectId: getProjectProfileSelectionByProjectId,
  getBranchesByIds: getProfileBranchesByIds,
  listBranchesForParent: listProfileBranchesForParent,
};

export async function resolveConceptualizeProfileContext(
  input?: {
    projectId?: string | null | undefined;
    deps?: Partial<ResolveConceptualizeProfileContextDeps> | undefined;
  },
): Promise<ConceptualizeProfileContext> {
  const projectId = input?.projectId?.trim();
  if (!projectId) {
    const profile = getActiveDomainProfile();
    return createConceptualizeProfileContext({
      profile,
      baseProfile: profile,
      branches: [],
      selectionSnapshot: { baseProfileId: profile.id },
      proposalTarget: { kind: 'base_profile', profileId: profile.id },
    });
  }

  const deps = { ...defaultDeps, ...input?.deps };
  const registry = await deps.loadRegistry();
  const result = await resolveRuntimeProfileForProject({
    projectId,
    profileRegistry: registry,
    selectionStore: {
      getProjectProfileSelectionByProjectId: async (id) =>
        deps.getSelectionByProjectId(id),
    },
    branchStore: {
      getBranch: async (id) => (await deps.getBranchesByIds([id]))[0] ?? null,
      getBranchesByIds: async (ids) => deps.getBranchesByIds(ids),
      listBranchesForParent: async (parentProfileId) =>
        deps.listBranchesForParent(parentProfileId),
    },
    defaultBaseProfileId: DEFAULT_RUNTIME_PROFILE_BASE_PROFILE_ID,
  });

  const selectionSnapshot: OntologyCorrectionActiveSelectionSnapshot = {
    baseProfileId: result.selection.baseProfileId,
    ...(result.selection.projectBranchIds ? { projectBranchIds: result.selection.projectBranchIds } : {}),
    ...(result.selection.learningBranchIds ? { learningBranchIds: result.selection.learningBranchIds } : {}),
    ...(result.selection.personalBranchIds ? { personalBranchIds: result.selection.personalBranchIds } : {}),
  };

  return createConceptualizeProfileContext({
    profile: result.profile,
    baseProfile: result.baseProfile,
    branches: result.branches,
    selectionSnapshot,
    proposalTarget: chooseProposalTarget(result.selection.baseProfileId, result.branches),
  });
}

export function createConceptualizeProfileContext(input: {
  profile: DomainProfile;
  baseProfile: DomainProfile;
  branches: readonly ProfileBranch[];
  selectionSnapshot: OntologyCorrectionActiveSelectionSnapshot;
  proposalTarget: ProfileChangeProposalTarget;
}): ConceptualizeProfileContext {
  return {
    ...input,
    branches: [...input.branches],
    compositionStamp: buildCompositionStamp(input.baseProfile, input.profile, input.branches),
    scopeLegend: buildScopeLegend(input.baseProfile, input.branches),
  };
}

function chooseProposalTarget(
  baseProfileId: string,
  branches: readonly ProfileBranch[],
): ProfileChangeProposalTarget {
  const personal = lastBranchOfKind(branches, 'personal');
  if (personal) return { kind: 'profile_branch', branchId: personal.id };
  const learning = lastBranchOfKind(branches, 'learning');
  if (learning) return { kind: 'profile_branch', branchId: learning.id };
  const project = lastBranchOfKind(branches, 'project');
  if (project) return { kind: 'profile_branch', branchId: project.id };
  return { kind: 'base_profile', profileId: baseProfileId };
}

function lastBranchOfKind(
  branches: readonly ProfileBranch[],
  kind: ProfileBranch['branchKind'],
): ProfileBranch | null {
  for (let index = branches.length - 1; index >= 0; index -= 1) {
    if (branches[index]?.branchKind === kind) return branches[index] ?? null;
  }
  return null;
}

function buildCompositionStamp(
  baseProfile: DomainProfile,
  profile: DomainProfile,
  branches: readonly ProfileBranch[],
): ContextCompositionStamp {
  const branchOrder = branches.map((branch) => ({
    branchId: branch.id,
    kind: branch.branchKind,
  }));

  return {
    baseProfileId: baseProfile.id,
    activeProfileId: profile.id,
    branchOrder,
    compositionHash: stableCompositionHash({
      baseProfileId: baseProfile.id,
      baseProfileVersion: baseProfile.version,
      activeProfileId: profile.id,
      activeProfileVersion: profile.version,
      branches: branches.map((branch) => ({
        id: branch.id,
        kind: branch.branchKind,
        overlayId: branch.overlay.id,
        updatedAt: branch.updatedAt,
      })),
    }),
  };
}

function buildScopeLegend(
  baseProfile: DomainProfile,
  branches: readonly ProfileBranch[],
): ContextScopeLegend {
  const activeScopeId = branches[branches.length - 1]?.id ?? baseProfile.id;
  return {
    activeScopeId,
    scopes: [
      {
        scopeId: baseProfile.id,
        label: baseProfile.label,
        kind: 'baseProfile',
      },
      ...branches.map((branch) => ({
        scopeId: branch.id,
        label: branch.name,
        kind: 'branch' as const,
      })),
    ],
  };
}

function stableCompositionHash(value: unknown): string {
  const json = JSON.stringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < json.length; index += 1) {
    hash ^= json.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a32:${hash.toString(16).padStart(8, '0')}`;
}
