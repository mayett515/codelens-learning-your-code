import { nanoid } from 'nanoid';
import { db, type DbOrTx } from '../../../db/client';
import { BranchLocalProposalApplyError, compileBranchLocalProposalApplyOperation } from '../branchLocalProposalApply';
import {
  assembleContextPack,
  validateContextPack,
  type ContextEvidenceClaimInput,
  type ContextOntologyNodeInput,
  type ContextPack,
  type ContextPackValidationResult,
  type ContextPolicy,
  type ContextProposalEventSignalInput,
  type ContextProposalSnapshotInput,
  type ContextUserFitNodeSignalInput,
  type ContextUserFitProposalSignalInput,
  type ScopedNodeRef,
} from '../contextAssembly';
import { selectCheckerContext, type ContextSelectionTraceEntry } from '../contextSelector';
import {
  buildCheckerPrompt,
  validateCheckerPromptOutput,
  type CheckerPromptBuildResult,
  type CheckerPromptOutput,
} from '../checkerPromptBuilder';
import {
  mapCheckerOutputToProfileChangeProposals,
  type CheckerProposalMapperExplanation,
  type CheckerProposalSkippedFinding,
} from '../checkerProposalMapper';
import { ProfileNotFoundError } from '../profileRegistry';
import {
  projectUserFitSignals,
  userFitActiveSelectionScopeKey,
  type UserFitNodeSignal,
  type UserFitProjection,
  type UserFitProposalSignal,
} from '../userFitProjection';
import type {
  DomainProfile,
  OntologyCorrectionEvidence,
  OntologyNode,
  ProfileBranch,
  ProfileChangeProposal,
  ProfileProposalEvent,
  ProfileRegistry,
} from '../types';
import { getProfileBranchById } from './profileBranchRepo';
import {
  insertProfileChangeProposal,
  listProfileChangeProposalsForTargetBranch,
} from './profileChangeProposalRepo';
import { loadDefaultProfileRegistry } from './profileRegistryBootstrap';
import {
  loadUserFitProjectionFacts,
  type LoadUserFitProjectionFactsInput,
  type UserFitProjectionFacts,
} from './userFitHistoryRepo';

const CHECKER_RUNTIME_CONTEXT_CAPS = Object.freeze({
  maxNodes: 40,
  maxEvidenceClaims: 20,
  maxProposals: 10,
  maxProposalEvents: 20,
  maxUserFitNodeSignals: 10,
  maxUserFitProposalSignals: 8,
  maxGraphNeighbors: 20,
});

const CHECKER_RUNTIME_POLICY: ContextPolicy = Object.freeze({
  trustMode: 'suggest_first',
  autoApplyEnabled: false,
  maxAutoApplyRiskScore: 0,
  approvalRequiredFor: ['base_profile_mutation', 'profile_branch_mutation'],
  forbiddenSilentMutations: ['base_profile', 'profile_branch', 'old_captures'],
  coreMutationRule: 'explicitUserIntentOrCrossScopeEvidenceOnly',
  opsMustUseNodeRef: true,
});

export type ManualCheckerRunServiceErrorCode =
  | 'branch_not_found'
  | 'branch_base_mismatch'
  | 'base_profile_not_found'
  | 'context_pack_invalid'
  | 'checker_output_invalid'
  | 'checker_model_missing';

export class ManualCheckerRunServiceError extends Error {
  constructor(
    public readonly code: ManualCheckerRunServiceErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ManualCheckerRunServiceError';
  }
}

export interface CheckerModelInvocation {
  prompt: CheckerPromptBuildResult;
  pack: ContextPack;
}

export interface ManualCheckerRunServiceDependencies {
  transaction<T>(callback: (tx: DbOrTx) => Promise<T>): Promise<T>;
  getBranchById(id: string, executor?: DbOrTx | undefined): Promise<ProfileBranch | undefined>;
  listProposalsForTargetBranch(branchId: string, executor?: DbOrTx | undefined): Promise<ProfileChangeProposal[]>;
  insertProposal(proposal: ProfileChangeProposal, executor: DbOrTx): Promise<void>;
  loadUserFitFacts(input: LoadUserFitProjectionFactsInput): Promise<UserFitProjectionFacts>;
  loadRegistry(): Promise<ProfileRegistry>;
  runCheckerModel(input: CheckerModelInvocation): Promise<unknown>;
  newProposalId(): string;
}

export interface RunManualOntologyCheckerInput {
  baseProfileId: string;
  targetBranchId?: string | null | undefined;
  now: number;
  deps?: Partial<ManualCheckerRunServiceDependencies> | undefined;
}

export interface RunManualOntologyCheckerResult {
  pack: ContextPack | null;
  validation: ContextPackValidationResult | null;
  prompt: CheckerPromptBuildResult | null;
  output: CheckerPromptOutput | null;
  proposals: readonly ProfileChangeProposal[];
  explanation: CheckerProposalMapperExplanation;
  selectionTrace: readonly ContextSelectionTraceEntry[];
}

function resolveDeps(
  deps: Partial<ManualCheckerRunServiceDependencies> | undefined,
): ManualCheckerRunServiceDependencies {
  return {
    transaction: (callback) => db.transaction(callback),
    getBranchById: getProfileBranchById,
    listProposalsForTargetBranch: listProfileChangeProposalsForTargetBranch,
    insertProposal: insertProfileChangeProposal,
    loadUserFitFacts: (input) => loadUserFitProjectionFacts(input),
    loadRegistry: () => loadDefaultProfileRegistry(),
    runCheckerModel: async () => {
      throw new ManualCheckerRunServiceError(
        'checker_model_missing',
        'Manual checker runtime requires an injected checker model seam.',
      );
    },
    newProposalId: () => `checker_proposal_${nanoid(21)}`,
    ...deps,
  };
}

export async function runManualOntologyChecker(
  input: RunManualOntologyCheckerInput,
): Promise<RunManualOntologyCheckerResult> {
  if (!input.targetBranchId) {
    return explanationOnlyResult('Checker needs an active branch before it can create branch-local proposals.');
  }

  const deps = resolveDeps(input.deps);
  const registry = await deps.loadRegistry();
  const baseProfile = loadBaseProfile(input.baseProfileId, registry);
  const branch = await deps.getBranchById(input.targetBranchId);
  if (!branch) {
    throw new ManualCheckerRunServiceError(
      'branch_not_found',
      `Profile branch ${input.targetBranchId} was not found.`,
    );
  }
  assertBranchBelongsToBase(branch, baseProfile);

  const facts = await deps.loadUserFitFacts({ baseProfileId: baseProfile.id });
  const context = buildManualCheckerContext({
    baseProfile,
    branch,
    facts,
    now: input.now,
  });
  if (!context.validation.valid) {
    throw new ManualCheckerRunServiceError(
      'context_pack_invalid',
      'Checker ContextPack failed validation.',
      context.validation.errors,
    );
  }

  const prompt = buildCheckerPrompt({ pack: context.pack });
  const rawOutput = await deps.runCheckerModel({ prompt, pack: context.pack });
  const outputValidation = validateCheckerPromptOutput(rawOutput, context.pack);
  if (!outputValidation.valid || !outputValidation.output) {
    throw new ManualCheckerRunServiceError(
      'checker_output_invalid',
      'Checker model output failed validation.',
      outputValidation.errors,
    );
  }

  const output = outputValidation.output;
  const written = await deps.transaction(async (tx) => {
    const currentBranch = await deps.getBranchById(input.targetBranchId!, tx);
    if (!currentBranch) {
      throw new ManualCheckerRunServiceError(
        'branch_not_found',
        `Profile branch ${input.targetBranchId} was not found.`,
      );
    }
    assertBranchBelongsToBase(currentBranch, baseProfile);

    const pendingProposals = (await deps.listProposalsForTargetBranch(currentBranch.id, tx))
      .filter((proposal) => proposal.status === 'pending');
    const mapped = mapCheckerOutputToProfileChangeProposals({
      output,
      pack: context.pack,
      targetBranch: {
        branchId: currentBranch.id,
        updatedAt: currentBranch.updatedAt,
      },
      existingPendingProposals: pendingProposals,
      now: input.now,
      createProposalId: () => deps.newProposalId(),
    });

    const proposals: ProfileChangeProposal[] = [];
    const skippedFindings: CheckerProposalSkippedFinding[] = [
      ...mapped.explanation.skippedFindings,
    ];
    for (const proposal of mapped.proposals) {
      if (!dryRunBranchProposal({
        proposal,
        branch: currentBranch,
        baseProfile,
        now: input.now,
        skippedFindings,
      })) {
        continue;
      }

      await deps.insertProposal(proposal, tx);
      proposals.push(proposal);
    }

    return {
      proposals,
      explanation: {
        ...mapped.explanation,
        skippedFindings,
      },
    };
  });

  return {
    pack: context.pack,
    validation: context.validation,
    prompt,
    output,
    proposals: written.proposals,
    explanation: written.explanation,
    selectionTrace: context.selectionTrace,
  };
}

function buildManualCheckerContext(input: {
  baseProfile: DomainProfile;
  branch: ProfileBranch;
  facts: UserFitProjectionFacts;
  now: number;
}): {
  pack: ContextPack;
  validation: ContextPackValidationResult;
  selectionTrace: readonly ContextSelectionTraceEntry[];
} {
  const ontologyNodes = buildOntologyNodeCandidates(input.baseProfile, input.branch);
  const evidenceClaims = aggregateCorrectionEvidenceClaims({
    correctionEvidence: input.facts.correctionEvidence.filter((evidence) => evidenceMatchesBranch(evidence, input.branch)),
    ontologyNodes,
    baseProfileId: input.baseProfile.id,
    branch: input.branch,
  });
  const projection = projectUserFitSignals({
    baseProfileId: input.baseProfile.id,
    correctionEvidence: input.facts.correctionEvidence,
    proposalEvents: input.facts.proposalEvents,
  });
  const userFitNodeSignals = buildUserFitNodeSignals({
    projection,
    baseProfile: input.baseProfile,
    branch: input.branch,
    ontologyNodes,
  });
  const userFitProposalSignals = buildUserFitProposalSignals({
    projection,
    baseProfile: input.baseProfile,
    branch: input.branch,
  });
  const proposalEventSignals = input.facts.proposalEvents
    .filter((event) => event.target.kind === 'profile_branch' && event.target.branchId === input.branch.id)
    .map(toContextProposalEventSignal);

  const selection = selectCheckerContext({
    focal: {
      kind: 'checkerRun',
      id: `checker:${safeId(input.branch.id)}:${input.now}`,
      summary: `Manual checker run for ${input.branch.name}.`,
      sourceIds: [`branch:${input.branch.id}`],
    },
    ontologyNodes,
    evidenceClaims,
    proposalEventSignals,
    userFitNodeSignals,
    userFitProposalSignals,
    caps: CHECKER_RUNTIME_CONTEXT_CAPS,
    requiredNodeRefs: userFitNodeSignals.flatMap((signal) => signal.nodeRefs),
    pinnedEvidenceIds: userFitNodeSignals.flatMap((signal) => signal.evidenceIds),
    pinnedProposalEventIds: userFitProposalSignals.flatMap((signal) => signal.eventIds),
  });

  const pack = assembleContextPack({
    packId: `checker:${safeId(input.branch.id)}:${input.now}`,
    createdAt: input.now,
    consumer: selection.consumer,
    focal: selection.focal,
    compositionStamp: {
      baseProfileId: input.baseProfile.id,
      activeProfileId: `${input.baseProfile.id}:${input.branch.id}`,
      branchOrder: [{
        branchId: input.branch.id,
        kind: input.branch.branchKind,
      }],
      compositionHash: `${input.baseProfile.id}:${input.baseProfile.version}:${input.branch.id}:${input.branch.updatedAt}`,
    },
    scopeLegend: {
      activeScopeId: input.branch.id,
      scopes: [
        {
          scopeId: input.baseProfile.id,
          label: input.baseProfile.label,
          kind: 'baseProfile',
        },
        {
          scopeId: input.branch.id,
          label: input.branch.name,
          kind: 'branch',
        },
      ],
    },
    ontologyNodes: selection.ontologyNodes,
    evidenceClaims: selection.evidenceClaims,
    proposalEventSignals: selection.proposalEventSignals,
    userFitNodeSignals: selection.userFitNodeSignals,
    userFitProposalSignals: selection.userFitProposalSignals,
    policy: CHECKER_RUNTIME_POLICY,
    caps: selection.caps,
  });

  return {
    pack,
    validation: validateContextPack(pack),
    selectionTrace: selection.trace,
  };
}

function dryRunBranchProposal(input: {
  proposal: ProfileChangeProposal;
  branch: ProfileBranch;
  baseProfile: DomainProfile;
  now: number;
  skippedFindings: CheckerProposalSkippedFinding[];
}): boolean {
  try {
    compileBranchLocalProposalApplyOperation({
      proposal: input.proposal,
      branch: input.branch,
      baseProfile: input.baseProfile,
      now: input.now,
    });
    return true;
  } catch (error) {
    if (error instanceof BranchLocalProposalApplyError && error.code === 'patch_conflict') {
      const node = input.proposal.patch.addOntologyNodes?.[0];
      input.skippedFindings.push({
        label: node?.label ?? input.proposal.title,
        reason: 'patch-conflict',
        proposedNodeId: node?.id,
      });
      return false;
    }
    throw error;
  }
}

function loadBaseProfile(baseProfileId: string, registry: ProfileRegistry): DomainProfile {
  try {
    return registry.getProfile(baseProfileId);
  } catch (error) {
    if (error instanceof ProfileNotFoundError) {
      throw new ManualCheckerRunServiceError(
        'base_profile_not_found',
        `Base profile ${baseProfileId} was not found.`,
      );
    }
    throw error;
  }
}

function assertBranchBelongsToBase(branch: ProfileBranch, baseProfile: DomainProfile): void {
  if (branch.parentProfileId === baseProfile.id) return;
  throw new ManualCheckerRunServiceError(
    'branch_base_mismatch',
    `Profile branch ${branch.id} belongs to ${branch.parentProfileId}, not ${baseProfile.id}.`,
  );
}

function buildOntologyNodeCandidates(
  baseProfile: DomainProfile,
  branch: ProfileBranch,
): ContextOntologyNodeInput[] {
  const candidates: ContextOntologyNodeInput[] = [];
  const baseItemTypeIds = new Set(baseProfile.ontology.itemTypeNodeIds);
  const branchItemTypeIds = itemTypeIdsForBranchContext(baseProfile, branch);
  for (const node of baseProfile.ontology.nodes) {
    candidates.push(toContextOntologyNodeInput(baseProfile.id, node, baseItemTypeIds.has(node.id)));
  }

  const overlay = branch.overlay;
  const branchNodes = [
    ...(overlay.addOntologyNodes ?? []),
    ...(overlay.overrideOntologyNodes ?? []),
    ...(overlay.overrideOntology?.nodes ?? []),
  ];
  for (const node of branchNodes) {
    candidates.push(toContextOntologyNodeInput(branch.id, node, branchItemTypeIds.has(node.id)));
  }

  return candidates;
}

function toContextOntologyNodeInput(
  scopeId: string,
  node: OntologyNode,
  isItemType: boolean,
): ContextOntologyNodeInput {
  return {
    ref: {
      scopeId,
      nodeId: node.id,
    },
    label: node.label,
    meaning: node.meaning,
    isItemType,
    useWhen: [...node.useWhen],
    doNotUseWhen: node.doNotUseWhen.map((rule) => rule.text),
    examples: [...node.examples],
    relationshipRefs: [],
  };
}

function itemTypeIdsForBranchContext(
  baseProfile: DomainProfile,
  branch: ProfileBranch,
): Set<string> {
  return new Set([
    ...baseProfile.ontology.itemTypeNodeIds,
    ...(branch.overlay.addItemTypeNodeIds ?? []),
    ...(branch.overlay.overrideOntology?.itemTypeNodeIds ?? []),
  ]);
}

function aggregateCorrectionEvidenceClaims(input: {
  correctionEvidence: readonly OntologyCorrectionEvidence[];
  ontologyNodes: readonly ContextOntologyNodeInput[],
  baseProfileId: string;
  branch: ProfileBranch;
}): ContextEvidenceClaimInput[] {
  const groups = new Map<string, ContextEvidenceClaimInput>();

  for (const evidence of input.correctionEvidence) {
    const claim = toContextEvidenceClaim(evidence, input.ontologyNodes, input.baseProfileId, input.branch.id);
    const key = correctionEvidencePatternKey(evidence, claim);
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        ...claim,
        sourceEvidenceIds: [evidence.id],
      });
      continue;
    }

    const isNewest = claim.latestAt >= existing.latestAt;
    groups.set(key, {
      ...existing,
      ...(isNewest ? {
        evidenceId: claim.evidenceId,
        latestAt: claim.latestAt,
        ...(claim.reason ? { reason: claim.reason } : {}),
      } : {}),
      patternFrequency: existing.patternFrequency + 1,
      sourceEvidenceIds: uniqueStrings([
        ...(isNewest ? [claim.evidenceId] : []),
        ...(existing.sourceEvidenceIds ?? [existing.evidenceId]),
        ...(!isNewest ? [claim.evidenceId] : []),
      ]),
      sourceIds: uniqueStrings([
        ...(isNewest ? claim.sourceIds : []),
        ...existing.sourceIds,
        ...(!isNewest ? claim.sourceIds : []),
      ]),
    });
  }

  return [...groups.values()].sort(compareEvidenceClaimsForChecker);
}

function toContextEvidenceClaim(
  evidence: OntologyCorrectionEvidence,
  ontologyNodes: readonly ContextOntologyNodeInput[],
  baseProfileId: string,
  activeBranchId: string,
): ContextEvidenceClaimInput {
  const previousNodeRef = evidence.previousTypeNodeId
    ? resolveKnownNodeRef(evidence.previousTypeNodeId, ontologyNodes, activeBranchId, baseProfileId)
    : undefined;
  const correctedNodeRef = resolveKnownNodeRef(
    evidence.correctedTypeNodeId,
    ontologyNodes,
    activeBranchId,
    baseProfileId,
  );

  return {
    evidenceId: evidence.id,
    ...(previousNodeRef ? { previousNodeRef } : {}),
    ...(correctedNodeRef ? { correctedNodeRef } : {}),
    ...(evidence.reason ? { reason: evidence.reason } : {}),
    patternFrequency: 1,
    latestAt: evidence.createdAt,
    crossScope: false,
    sourceEvidenceIds: [evidence.id],
    sourceIds: [evidence.subjectId],
  };
}

function correctionEvidencePatternKey(
  evidence: OntologyCorrectionEvidence,
  claim: ContextEvidenceClaimInput,
): string {
  return [
    userFitActiveSelectionScopeKey(evidence.activeSelectionSnapshot),
    evidence.field,
    claim.previousNodeRef ? scopedRefPatternKey(claim.previousNodeRef) : '-',
    claim.correctedNodeRef ? scopedRefPatternKey(claim.correctedNodeRef) : '-',
  ].join('\u0000');
}

function scopedRefPatternKey(ref: ScopedNodeRef): string {
  return `${ref.scopeId}:${ref.nodeId}`;
}

function compareEvidenceClaimsForChecker(a: ContextEvidenceClaimInput, b: ContextEvidenceClaimInput): number {
  return b.patternFrequency - a.patternFrequency || b.latestAt - a.latestAt || a.evidenceId.localeCompare(b.evidenceId);
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function toContextProposalEventSignal(event: ProfileProposalEvent): ContextProposalEventSignalInput {
  return {
    eventId: event.id,
    proposalId: event.proposalId,
    action: event.action,
    createdAt: event.createdAt,
    ...(event.reason ? { reason: event.reason } : {}),
  };
}

function evidenceMatchesBranch(
  evidence: OntologyCorrectionEvidence,
  branch: ProfileBranch,
): boolean {
  const snapshot = evidence.activeSelectionSnapshot;
  if (snapshot.baseProfileId !== branch.parentProfileId) return false;
  const branchIds = branchIdsForKind(snapshot, branch.branchKind);
  return branchIds.includes(branch.id);
}

function branchIdsForKind(
  snapshot: OntologyCorrectionEvidence['activeSelectionSnapshot'],
  kind: ProfileBranch['branchKind'],
): readonly string[] {
  if (kind === 'project') return snapshot.projectBranchIds ?? [];
  if (kind === 'learning') return snapshot.learningBranchIds ?? [];
  return snapshot.personalBranchIds ?? [];
}

function buildUserFitNodeSignals(input: {
  projection: UserFitProjection;
  baseProfile: DomainProfile;
  branch: ProfileBranch;
  ontologyNodes: readonly ContextOntologyNodeInput[];
}): ContextUserFitNodeSignalInput[] {
  const activeSelectionKey = userFitActiveSelectionScopeKey(activeSelectionSnapshot(input.baseProfile.id, input.branch));
  return input.projection.nodeSignals
    .filter((signal) => signal.baseProfileId === input.baseProfile.id && signal.scopeId === activeSelectionKey)
    .map((signal) => toContextUserFitNodeSignal(signal, input.ontologyNodes, input.branch.id))
    .filter((signal) => signal.nodeRefs.length > 0)
    .slice(0, CHECKER_RUNTIME_CONTEXT_CAPS.maxUserFitNodeSignals);
}

function buildUserFitProposalSignals(input: {
  projection: UserFitProjection;
  baseProfile: DomainProfile;
  branch: ProfileBranch;
}): ContextUserFitProposalSignalInput[] {
  const targetKey = `profile_branch:${input.branch.id}`;
  return input.projection.proposalSignals
    .filter((signal) => signal.baseProfileId === input.baseProfile.id && signal.targetKey === targetKey)
    .slice(0, CHECKER_RUNTIME_CONTEXT_CAPS.maxUserFitProposalSignals)
    .map(toContextUserFitProposalSignal);
}

function toContextUserFitNodeSignal(
  signal: UserFitNodeSignal,
  ontologyNodes: readonly ContextOntologyNodeInput[],
  activeBranchId: string,
): ContextUserFitNodeSignalInput {
  return {
    signalId: `node:${signal.scopeId}:${signal.nodeId}`,
    baseProfileId: signal.baseProfileId,
    activeSelectionKey: signal.scopeId,
    activeSelectionSnapshot: signal.activeSelectionSnapshot,
    nodeId: signal.nodeId,
    nodeRefs: userFitNodeRefs(signal, ontologyNodes, activeBranchId),
    userFitConfidence: signal.userFitConfidence,
    score: signal.score,
    positiveCorrectionCount: signal.positiveCorrectionCount,
    negativeCorrectionCount: signal.negativeCorrectionCount,
    missingConceptCorrectionCount: signal.missingConceptCorrectionCount,
    nearMissHitCount: signal.nearMissHitCount,
    evidenceIds: [...signal.evidenceIds],
    latestAt: signal.latestAt,
  };
}

function toContextUserFitProposalSignal(signal: UserFitProposalSignal): ContextUserFitProposalSignalInput {
  return {
    signalId: `proposal:${signal.proposalKind}:${signal.targetKey}`,
    baseProfileId: signal.baseProfileId,
    proposalKind: signal.proposalKind,
    target: {
      kind: signal.target.kind,
      ...(signal.target.profileId === undefined ? {} : { profileId: signal.target.profileId }),
      ...(signal.target.branchId === undefined ? {} : { branchId: signal.target.branchId }),
    },
    targetKey: signal.targetKey,
    userFitConfidence: signal.userFitConfidence,
    score: signal.score,
    appliedCount: signal.appliedCount,
    rejectedCount: signal.rejectedCount,
    postponedCount: signal.postponedCount,
    askedWhyCount: signal.askedWhyCount,
    eventIds: [...signal.eventIds],
    latestAt: signal.latestAt,
  };
}

function userFitNodeRefs(
  signal: UserFitNodeSignal,
  ontologyNodes: readonly ContextOntologyNodeInput[],
  activeBranchId: string,
): ScopedNodeRef[] {
  const active = ontologyNodes.find((node) =>
    node.ref.scopeId === activeBranchId && node.ref.nodeId === signal.nodeId);
  if (active) return [cloneRef(active.ref)];

  return ontologyNodes
    .filter((node) => node.ref.nodeId === signal.nodeId)
    .map((node) => cloneRef(node.ref));
}

function resolveKnownNodeRef(
  nodeId: string,
  ontologyNodes: readonly ContextOntologyNodeInput[],
  activeBranchId: string,
  baseProfileId: string,
): ScopedNodeRef | undefined {
  const active = ontologyNodes.find((node) => node.ref.scopeId === activeBranchId && node.ref.nodeId === nodeId);
  if (active) return cloneRef(active.ref);

  const base = ontologyNodes.find((node) => node.ref.scopeId === baseProfileId && node.ref.nodeId === nodeId);
  if (base) return cloneRef(base.ref);

  return undefined;
}

function activeSelectionSnapshot(
  baseProfileId: string,
  branch: ProfileBranch,
): OntologyCorrectionEvidence['activeSelectionSnapshot'] {
  return {
    baseProfileId,
    projectBranchIds: branch.branchKind === 'project' ? [branch.id] : [],
    learningBranchIds: branch.branchKind === 'learning' ? [branch.id] : [],
    personalBranchIds: branch.branchKind === 'personal' ? [branch.id] : [],
  };
}

function explanationOnlyResult(summary: string): RunManualOntologyCheckerResult {
  return {
    pack: null,
    validation: null,
    prompt: null,
    output: null,
    proposals: [],
    explanation: {
      summary,
      relationshipOrBoundaryObservations: [],
      skippedFindings: [],
    },
    selectionTrace: [],
  };
}

function cloneRef(ref: ScopedNodeRef): ScopedNodeRef {
  return {
    scopeId: ref.scopeId,
    nodeId: ref.nodeId,
  };
}

function safeId(id: string): string {
  return id.trim().replace(/[^a-zA-Z0-9:_-]+/g, '_') || 'checker';
}
