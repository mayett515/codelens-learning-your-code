import {
  assembleContextPack,
  selectConceptualizeContext,
  validateContextPack,
  type ContextEvidenceClaimInput,
  type ContextGraphSectionInput,
  type ContextOntologyNodeInput,
  type ContextPack,
  type ContextPackValidationResult,
  type ContextPolicy,
  type ContextProposalEventSignalInput,
  type ContextProposalSnapshotInput,
  type ContextSelectionTraceEntry,
  type ContextUserFitNodeSignalInput,
  type ContextUserFitProposalSignalInput,
  type DomainProfile,
  type OntologyNode,
  type ProfileBranch,
  type ScopedNodeRef,
  type UserFitNodeSignal,
  type UserFitProposalSignal,
  userFitActiveSelectionScopeKey,
} from '../../ontology';
import type { SaveModalCandidateData } from '../types/saveModal';
import type { ConceptualizeProfileContext } from './conceptualizeProfileContext';

const CONCEPTUALIZE_SHADOW_CONTEXT_CAPS = Object.freeze({
  maxNodes: 16,
  maxEvidenceClaims: 8,
  maxProposals: 6,
  maxProposalEvents: 8,
  maxUserFitNodeSignals: 6,
  maxUserFitProposalSignals: 4,
  maxGraphNeighbors: 8,
});

const CONCEPTUALIZE_SHADOW_POLICY: ContextPolicy = Object.freeze({
  trustMode: 'suggest_first',
  autoApplyEnabled: false,
  maxAutoApplyRiskScore: 0,
  approvalRequiredFor: ['base_profile_mutation', 'profile_branch_mutation'],
  forbiddenSilentMutations: ['base_profile', 'profile_branch', 'old_captures'],
  coreMutationRule: 'explicitUserIntentOrCrossScopeEvidenceOnly',
  opsMustUseNodeRef: true,
});

export interface ConceptualizeContextPackShadowInput {
  candidateId: string;
  candidate: SaveModalCandidateData;
  context: ConceptualizeProfileContext;
  now?: (() => number) | undefined;
  evidenceClaims?: readonly ContextEvidenceClaimInput[] | undefined;
  proposalSnapshots?: readonly ContextProposalSnapshotInput[] | undefined;
  proposalEventSignals?: readonly ContextProposalEventSignalInput[] | undefined;
  graph?: ContextGraphSectionInput | undefined;
}

export interface ConceptualizeContextPackShadowResult {
  pack: ContextPack;
  validation: ContextPackValidationResult;
  selectionTrace: readonly ContextSelectionTraceEntry[];
}

export function buildConceptualizeContextPackShadow(
  input: ConceptualizeContextPackShadowInput,
): ConceptualizeContextPackShadowResult {
  const ontologyNodes = buildOntologyNodeCandidates(input.context);
  const focalNodeRefs = candidateNodeRefs(input.candidate, ontologyNodes, input.context.scopeLegend.activeScopeId);
  const userFitNodeSignals = buildUserFitNodeSignals(input.context, ontologyNodes);
  const userFitProposalSignals = buildUserFitProposalSignals(input.context);
  const selection = selectConceptualizeContext({
    focal: {
      kind: 'capture',
      id: `draft:${input.candidateId}`,
      summary: summarizeCandidate(input.candidate),
      nodeRefs: focalNodeRefs.length > 0 ? focalNodeRefs : undefined,
      sourceIds: sourceIdsForCandidate(input.candidate),
    },
    ontologyNodes,
    evidenceClaims: input.evidenceClaims,
    proposalSnapshots: input.proposalSnapshots,
    proposalEventSignals: input.proposalEventSignals,
    userFitNodeSignals,
    userFitProposalSignals,
    graph: input.graph,
    caps: CONCEPTUALIZE_SHADOW_CONTEXT_CAPS,
    requiredNodeRefs: userFitNodeSignals.flatMap((signal) => signal.nodeRefs),
  });

  const pack = assembleContextPack({
    packId: `conceptualize-shadow:${safeId(input.candidateId)}`,
    createdAt: input.now?.() ?? Date.now(),
    consumer: selection.consumer,
    focal: selection.focal,
    compositionStamp: input.context.compositionStamp,
    scopeLegend: input.context.scopeLegend,
    ontologyNodes: selection.ontologyNodes,
    evidenceClaims: selection.evidenceClaims,
    proposalSnapshots: selection.proposalSnapshots,
    proposalEventSignals: selection.proposalEventSignals,
    userFitNodeSignals: selection.userFitNodeSignals,
    userFitProposalSignals: selection.userFitProposalSignals,
    graph: selection.graph,
    policy: CONCEPTUALIZE_SHADOW_POLICY,
    caps: selection.caps,
  });

  return {
    pack,
    validation: validateContextPack(pack),
    selectionTrace: selection.trace,
  };
}

function buildUserFitNodeSignals(
  context: ConceptualizeProfileContext,
  ontologyNodes: readonly ContextOntologyNodeInput[],
): ContextUserFitNodeSignalInput[] {
  const projection = context.userFitProjection;
  if (!projection) return [];

  const activeSelectionKey = userFitActiveSelectionScopeKey(context.selectionSnapshot);
  const signals: ContextUserFitNodeSignalInput[] = [];

  for (const signal of projection.nodeSignals) {
    if (signal.baseProfileId !== context.baseProfile.id) continue;
    // Only use corrections from this exact active selection; branch-local user fit
    // must not leak into the base/core or sibling branches.
    if (signal.scopeId !== activeSelectionKey) continue;

    const nodeRefs = userFitNodeRefs(signal, ontologyNodes, context.scopeLegend.activeScopeId);
    if (nodeRefs.length === 0) continue;

    signals.push({
      signalId: `node:${signal.scopeId}:${signal.nodeId}`,
      baseProfileId: signal.baseProfileId,
      activeSelectionKey: signal.scopeId,
      activeSelectionSnapshot: signal.activeSelectionSnapshot,
      nodeId: signal.nodeId,
      nodeRefs,
      userFitConfidence: signal.userFitConfidence,
      score: signal.score,
      positiveCorrectionCount: signal.positiveCorrectionCount,
      negativeCorrectionCount: signal.negativeCorrectionCount,
      missingConceptCorrectionCount: signal.missingConceptCorrectionCount,
      nearMissHitCount: signal.nearMissHitCount,
      evidenceIds: signal.evidenceIds,
      latestAt: signal.latestAt,
    });

    if (signals.length >= CONCEPTUALIZE_SHADOW_CONTEXT_CAPS.maxUserFitNodeSignals) break;
  }

  return signals;
}

function buildUserFitProposalSignals(
  context: ConceptualizeProfileContext,
): ContextUserFitProposalSignalInput[] {
  const projection = context.userFitProjection;
  if (!projection) return [];

  const activeProposalTargetKeys = userFitProposalTargetKeysForActiveSelection(context);
  return projection.proposalSignals
    .filter((signal) =>
      signal.baseProfileId === context.baseProfile.id &&
      activeProposalTargetKeys.has(signal.targetKey))
    .slice(0, CONCEPTUALIZE_SHADOW_CONTEXT_CAPS.maxUserFitProposalSignals)
    .map((signal) => toContextUserFitProposalSignal(signal));
}

function userFitProposalTargetKeysForActiveSelection(
  context: ConceptualizeProfileContext,
): Set<string> {
  const branchIds = [
    ...(context.selectionSnapshot.projectBranchIds ?? []),
    ...(context.selectionSnapshot.learningBranchIds ?? []),
    ...(context.selectionSnapshot.personalBranchIds ?? []),
  ];

  if (branchIds.length === 0) {
    return new Set([`base_profile:${context.baseProfile.id}`]);
  }

  return new Set(branchIds.map((branchId) => `profile_branch:${branchId}`));
}

function userFitNodeRefs(
  signal: UserFitNodeSignal,
  ontologyNodes: readonly ContextOntologyNodeInput[],
  activeScopeId: string,
): ScopedNodeRef[] {
  const active = ontologyNodes.find((node) =>
    node.ref.scopeId === activeScopeId && node.ref.nodeId === signal.nodeId);
  if (active) return [cloneScopedNodeRef(active.ref)];

  return ontologyNodes
    .filter((node) => node.ref.nodeId === signal.nodeId)
    .map((node) => cloneScopedNodeRef(node.ref));
}

function toContextUserFitProposalSignal(
  signal: UserFitProposalSignal,
): ContextUserFitProposalSignalInput {
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
    eventIds: signal.eventIds,
    latestAt: signal.latestAt,
  };
}

function buildOntologyNodeCandidates(
  context: ConceptualizeProfileContext,
): ContextOntologyNodeInput[] {
  const candidates: ContextOntologyNodeInput[] = [];
  appendProfileNodes(candidates, context.baseProfile.id, context.baseProfile);

  for (const branch of context.branches) {
    appendBranchOverlayNodes(candidates, branch);
  }

  const knownKeys = new Set(candidates.map((node) => `${node.ref.scopeId}:${node.ref.nodeId}`));
  for (const node of context.profile.ontology.nodes) {
    const key = `${context.scopeLegend.activeScopeId}:${node.id}`;
    if (knownKeys.has(key)) continue;
    if (context.baseProfile.ontology.nodes.some((baseNode) => baseNode.id === node.id)) continue;
    candidates.push(toContextOntologyNodeInput(context.scopeLegend.activeScopeId, node));
    knownKeys.add(key);
  }

  return candidates;
}

function appendProfileNodes(
  target: ContextOntologyNodeInput[],
  scopeId: string,
  profile: DomainProfile,
): void {
  for (const node of profile.ontology.nodes) {
    target.push(toContextOntologyNodeInput(scopeId, node));
  }
}

function appendBranchOverlayNodes(
  target: ContextOntologyNodeInput[],
  branch: ProfileBranch,
): void {
  const overlay = branch.overlay;
  const nodes = [
    ...(overlay.addOntologyNodes ?? []),
    ...(overlay.overrideOntologyNodes ?? []),
    ...(overlay.overrideOntology?.nodes ?? []),
  ];

  for (const node of nodes) {
    target.push(toContextOntologyNodeInput(branch.id, node));
  }
}

function toContextOntologyNodeInput(
  scopeId: string,
  node: OntologyNode,
): ContextOntologyNodeInput {
  return {
    ref: {
      scopeId,
      nodeId: node.id,
    },
    label: node.label,
    meaning: node.meaning,
    useWhen: [...node.useWhen],
    doNotUseWhen: node.doNotUseWhen.map((rule) => rule.text),
    examples: [...node.examples],
    relationshipRefs: [],
  };
}

function candidateNodeRefs(
  candidate: SaveModalCandidateData,
  ontologyNodes: readonly ContextOntologyNodeInput[],
  activeScopeId: string,
): ScopedNodeRef[] {
  const proposedTypeNodeId = candidate.conceptHint?.proposedConceptType;
  if (!proposedTypeNodeId) return [];

  const preferred = ontologyNodes.find((node) =>
    node.ref.nodeId === proposedTypeNodeId && node.ref.scopeId === activeScopeId);
  if (preferred) return [cloneScopedNodeRef(preferred.ref)];

  const fallback = ontologyNodes.find((node) => node.ref.nodeId === proposedTypeNodeId);
  return fallback ? [cloneScopedNodeRef(fallback.ref)] : [];
}

function summarizeCandidate(candidate: SaveModalCandidateData): string {
  const parts = [candidate.title, candidate.whatClicked, candidate.whyItMattered]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  return parts.join('\n');
}

function sourceIdsForCandidate(candidate: SaveModalCandidateData): string[] | undefined {
  const ids = [
    candidate.chatMessageId,
    candidate.sessionId,
    candidate.derivedFromCaptureId,
  ].filter((id): id is string => Boolean(id));
  return ids.length > 0 ? ids : undefined;
}

function cloneScopedNodeRef(ref: ScopedNodeRef): ScopedNodeRef {
  return {
    scopeId: ref.scopeId,
    nodeId: ref.nodeId,
  };
}

function safeId(id: string): string {
  return id.trim().replace(/[^a-zA-Z0-9:_-]+/g, '_') || 'candidate';
}
