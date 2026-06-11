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
  projectUserFitSignals,
  type UserFitProjection,
} from '../../ontology';
import {
  getProfileBranchesByIds,
  getProjectProfileSelectionByProjectId,
  listProfileBranchesForParent,
  loadUserFitProjectionFacts,
  loadDefaultProfileRegistry,
} from '../../ontology/data';

export interface ConceptualizeProfileContext {
  profile: DomainProfile;
  baseProfile: DomainProfile;
  branches: readonly ProfileBranch[];
  selectionSnapshot: OntologyCorrectionActiveSelectionSnapshot;
  proposalTarget: ProfileChangeProposalTarget;
  proposalTargetBranchUpdatedAt?: number | null | undefined;
  compositionStamp: ContextCompositionStamp;
  scopeLegend: ContextScopeLegend;
  userFitProjection?: UserFitProjection | undefined;
}

export interface ConceptualizeProposalTargetSummary {
  targetKind: ProfileChangeProposalTarget['kind'];
  label: string;
  body: string;
}

export interface ResolveConceptualizeProfileContextDeps {
  loadRegistry: () => Promise<ProfileRegistry>;
  getSelectionByProjectId: typeof getProjectProfileSelectionByProjectId;
  getBranchesByIds: typeof getProfileBranchesByIds;
  listBranchesForParent: typeof listProfileBranchesForParent;
  loadUserFitFacts: typeof loadUserFitProjectionFacts;
}

const defaultDeps: ResolveConceptualizeProfileContextDeps = {
  loadRegistry: loadDefaultProfileRegistry,
  getSelectionByProjectId: getProjectProfileSelectionByProjectId,
  getBranchesByIds: getProfileBranchesByIds,
  listBranchesForParent: listProfileBranchesForParent,
  loadUserFitFacts: loadUserFitProjectionFacts,
};

export async function resolveConceptualizeProfileContext(
  input?: {
    projectId?: string | null | undefined;
    deps?: Partial<ResolveConceptualizeProfileContextDeps> | undefined;
  },
): Promise<ConceptualizeProfileContext> {
  const projectId = input?.projectId?.trim();
  const deps = { ...defaultDeps, ...input?.deps };
  if (!projectId) {
    const profile = getActiveDomainProfile();
    const userFitProjection = await loadUserFitProjection(profile.id, deps);
    return createConceptualizeProfileContext({
      profile,
      baseProfile: profile,
      branches: [],
      selectionSnapshot: { baseProfileId: profile.id },
      proposalTarget: { kind: 'base_profile', profileId: profile.id },
      userFitProjection,
    });
  }

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
    ...chooseProposalTarget(result.selection.baseProfileId, result.branches),
    userFitProjection: await loadUserFitProjection(result.selection.baseProfileId, deps),
  });
}

export function createConceptualizeProfileContext(input: {
  profile: DomainProfile;
  baseProfile: DomainProfile;
  branches: readonly ProfileBranch[];
  selectionSnapshot: OntologyCorrectionActiveSelectionSnapshot;
  proposalTarget: ProfileChangeProposalTarget;
  proposalTargetBranchUpdatedAt?: number | null | undefined;
  userFitProjection?: UserFitProjection | undefined;
}): ConceptualizeProfileContext {
  return {
    ...input,
    proposalTargetBranchUpdatedAt: input.proposalTargetBranchUpdatedAt
      ?? resolveProposalTargetBranchUpdatedAt(input.proposalTarget, input.branches),
    userFitProjection: input.userFitProjection ?? emptyUserFitProjection(input.baseProfile.id),
    branches: [...input.branches],
    compositionStamp: buildCompositionStamp(input.baseProfile, input.profile, input.branches),
    scopeLegend: buildScopeLegend(input.baseProfile, input.branches),
  };
}

export function getConceptualizeProposalTargetSummary(
  context: ConceptualizeProfileContext,
): ConceptualizeProposalTargetSummary {
  if (context.proposalTarget.kind === 'profile_branch') {
    const branch = context.branches.find((candidate) =>
      candidate.id === context.proposalTarget.branchId);
    const branchName = branch?.name.trim();
    const branchLabel = branchName ? branchName : context.proposalTarget.branchId;
    return {
      targetKind: 'profile_branch',
      label: `Propose in ${branchLabel}`,
      body: `This creates a pending branch-local proposal. It does not change ${context.baseProfile.label}, sibling branches, or old cards unless you explicitly apply or merge later.`,
    };
  }

  const baseLabel = context.proposalTarget.profileId === context.baseProfile.id
    ? context.baseProfile.label
    : context.proposalTarget.profileId;
  return {
    targetKind: 'base_profile',
    label: `Propose in ${baseLabel}`,
    body: 'This creates a pending base/core proposal with version checks. It will not apply automatically; review uses Apply to core.',
  };
}

async function loadUserFitProjection(
  baseProfileId: string,
  deps: ResolveConceptualizeProfileContextDeps,
): Promise<UserFitProjection> {
  try {
    const facts = await deps.loadUserFitFacts({ baseProfileId });
    return projectUserFitSignals({
      baseProfileId,
      correctionEvidence: facts.correctionEvidence,
      proposalEvents: facts.proposalEvents,
    });
  } catch {
    // User-fit is advisory context. If history cannot be loaded, Conceptualize
    // should still classify from the current ontology instead of blocking save.
    return emptyUserFitProjection(baseProfileId);
  }
}

function emptyUserFitProjection(baseProfileId: string): UserFitProjection {
  return {
    baseProfileId,
    nodeSignals: [],
    proposalSignals: [],
    summary: {
      correctionEvidenceCount: 0,
      proposalEventCount: 0,
      missingConceptCorrectionCount: 0,
      nearMissHitCount: 0,
      omittedNodeSignalCount: 0,
      omittedProposalSignalCount: 0,
    },
  };
}

function chooseProposalTarget(
  baseProfileId: string,
  branches: readonly ProfileBranch[],
): {
  proposalTarget: ProfileChangeProposalTarget;
  proposalTargetBranchUpdatedAt: number | null;
} {
  const personal = lastBranchOfKind(branches, 'personal');
  if (personal) {
    return {
      proposalTarget: { kind: 'profile_branch', branchId: personal.id },
      proposalTargetBranchUpdatedAt: personal.updatedAt,
    };
  }
  const learning = lastBranchOfKind(branches, 'learning');
  if (learning) {
    return {
      proposalTarget: { kind: 'profile_branch', branchId: learning.id },
      proposalTargetBranchUpdatedAt: learning.updatedAt,
    };
  }
  const project = lastBranchOfKind(branches, 'project');
  if (project) {
    return {
      proposalTarget: { kind: 'profile_branch', branchId: project.id },
      proposalTargetBranchUpdatedAt: project.updatedAt,
    };
  }
  return {
    proposalTarget: { kind: 'base_profile', profileId: baseProfileId },
    proposalTargetBranchUpdatedAt: null,
  };
}

function resolveProposalTargetBranchUpdatedAt(
  target: ProfileChangeProposalTarget,
  branches: readonly ProfileBranch[],
): number | null {
  if (target.kind !== 'profile_branch' || !target.branchId) return null;
  return branches.find((branch) => branch.id === target.branchId)?.updatedAt ?? null;
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
