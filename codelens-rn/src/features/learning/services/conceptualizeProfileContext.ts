import {
  DEFAULT_RUNTIME_PROFILE_BASE_PROFILE_ID,
  getActiveDomainProfile,
  resolveRuntimeProfileForProject,
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
  selectionSnapshot: OntologyCorrectionActiveSelectionSnapshot;
  proposalTarget: ProfileChangeProposalTarget;
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
    return {
      profile,
      selectionSnapshot: { baseProfileId: profile.id },
      proposalTarget: { kind: 'base_profile', profileId: profile.id },
    };
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

  return {
    profile: result.profile,
    selectionSnapshot,
    proposalTarget: chooseProposalTarget(result.selection.baseProfileId, result.branches),
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
