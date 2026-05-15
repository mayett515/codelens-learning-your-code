import type {
  ProfileBranchKind,
  ProfileChangeProposalKind,
  ProfileChangeProposalStatus,
  ProfileChangeProposalTarget,
  ProfileProposalEventAction,
  ProfileTrustMode,
} from './types';
import { normalizeOntologyDisplayLabel } from './scopedMeaning';

export type ContextPackConsumer =
  | 'conceptualize'
  | 'checker'
  | 'proposalReview'
  | 'graphSelectionChat'
  | 'repeatedMistakeReview'
  | 'backfill'
  | 'agent';

export interface ScopedNodeRef {
  scopeId: string;
  nodeId: string;
}

export interface ContextFocal {
  kind: 'capture' | 'item' | 'proposal' | 'graphSelection' | 'checkerRun' | 'agentTask';
  id: string;
  summary: string;
  nodeRefs?: readonly ScopedNodeRef[] | undefined;
  sourceIds?: readonly string[] | undefined;
}

export interface ContextCompositionStamp {
  baseProfileId: string;
  activeProfileId: string;
  branchOrder: readonly ContextBranchOrderEntry[];
  compositionHash: string;
}

export interface ContextBranchOrderEntry {
  branchId: string;
  kind: ProfileBranchKind;
}

export interface ContextScopeLegend {
  activeScopeId: string;
  scopes: readonly ContextScopeLegendEntry[];
}

export interface ContextScopeLegendEntry {
  scopeId: string;
  label: string;
  kind: 'baseProfile' | 'branch' | 'composedProfile';
}

export interface ContextRelationshipRef {
  typeNodeRef: ScopedNodeRef;
  targetNodeRef: ScopedNodeRef;
}

export interface ContextOntologyNode {
  ref: ScopedNodeRef;
  label: string;
  meaning: string;
  useWhen: readonly string[];
  doNotUseWhen: readonly string[];
  examples: readonly string[];
  relationshipRefs: readonly ContextRelationshipRef[];
}

export interface ContextOntologyNodeInput extends ContextOntologyNode {
  /** Pinned nodes survive caps. Same-label sibling nodes of included nodes also survive caps. */
  pinned?: boolean | undefined;
}

export interface ContextSameLabelSiblingGroup {
  label: string;
  normalizedLabel: string;
  nodeRefs: readonly ScopedNodeRef[];
}

export interface ContextOntologySection {
  nodes: readonly ContextOntologyNode[];
  sameLabelSiblings: readonly ContextSameLabelSiblingGroup[];
}

export interface ContextEvidenceClaim {
  evidenceId: string;
  subjectNodeRef?: ScopedNodeRef | undefined;
  previousNodeRef?: ScopedNodeRef | undefined;
  correctedNodeRef?: ScopedNodeRef | undefined;
  reason?: string | undefined;
  patternFrequency: number;
  latestAt: number;
  crossScope: boolean;
  sourceIds: readonly string[];
}

export interface ContextEvidenceClaimInput extends ContextEvidenceClaim {
  pinned?: boolean | undefined;
}

export interface ContextEvidenceSection {
  claims: readonly ContextEvidenceClaim[];
  omittedCount: number;
}

export interface ContextProposalSnapshot {
  proposalId: string;
  proposalKind: ProfileChangeProposalKind;
  target: ProfileChangeProposalTarget;
  status: ProfileChangeProposalStatus;
  title: string;
  summary: string;
  riskScore: number;
  evidenceIds: readonly string[];
  nodeRefs: readonly ScopedNodeRef[];
}

export interface ContextProposalSnapshotInput extends ContextProposalSnapshot {
  pinned?: boolean | undefined;
}

export interface ContextProposalSection {
  snapshots: readonly ContextProposalSnapshot[];
  aggregatedSignals: ContextProposalAggregatedSignals;
  omittedCount: number;
}

export interface ContextProposalAggregatedSignals {
  pendingCount: number;
  highestRiskScore: number;
  branchLocalCount: number;
  baseOrCoreTargetCount: number;
}

export interface ContextProposalEventSignal {
  eventId: string;
  proposalId: string;
  action: ProfileProposalEventAction | 'edited' | 'superseded' | 'stale' | 'obsolete';
  createdAt: number;
  reason?: string | undefined;
}

export interface ContextProposalEventSignalInput extends ContextProposalEventSignal {
  pinned?: boolean | undefined;
}

export interface ContextProposalEventSection {
  recentDecisionSignals: readonly ContextProposalEventSignal[];
  omittedCount: number;
}

export interface ContextPolicy {
  trustMode: ProfileTrustMode;
  autoApplyEnabled: boolean;
  maxAutoApplyRiskScore: number;
  approvalRequiredFor: readonly string[];
  forbiddenSilentMutations: readonly string[];
  coreMutationRule: 'explicitUserIntentOrCrossScopeEvidenceOnly';
  opsMustUseNodeRef: true;
}

export interface ContextGraphSectionInput {
  selectedNodeRefs: readonly ScopedNodeRef[];
  neighborNodeRefs?: readonly ScopedNodeRef[] | undefined;
  expansionDepth: number;
}

export interface ContextGraphSection {
  selectedNodeRefs: readonly ScopedNodeRef[];
  neighborNodeRefs: readonly ScopedNodeRef[];
  expansionDepth: number;
  omittedNeighborCount: number;
}

export interface ContextBudgetCaps {
  maxNodes: number;
  maxEvidenceClaims: number;
  maxProposals: number;
  maxProposalEvents: number;
  maxGraphNeighbors: number;
}

export type ContextBudgetSection =
  | 'ontology.nodes'
  | 'evidence.claims'
  | 'proposals.snapshots'
  | 'proposalEvents.recentDecisionSignals'
  | 'graph.neighborNodeRefs';

export interface ContextBudgetTruncation {
  section: ContextBudgetSection;
  dropped: number;
  reason: 'cap' | 'notPinned' | 'callerExcluded';
}

export interface ContextBudgetReport {
  caps: ContextBudgetCaps;
  included: Record<ContextBudgetSection, number>;
  omitted: Record<ContextBudgetSection, number>;
  truncationLog: readonly ContextBudgetTruncation[];
}

export interface ContextExpandHandle {
  kind: string;
  id: string;
  reason: string;
}

export interface ContextPack {
  packId: string;
  packVersion: 'context-pack-v1';
  createdAt: number;
  consumer: ContextPackConsumer;
  focal: ContextFocal;
  compositionStamp: ContextCompositionStamp;
  scopeLegend: ContextScopeLegend;
  ontology: ContextOntologySection;
  evidence: ContextEvidenceSection;
  proposals: ContextProposalSection;
  proposalEvents: ContextProposalEventSection;
  policy: ContextPolicy;
  graph?: ContextGraphSection | undefined;
  budgetReport: ContextBudgetReport;
  expandHandles: Readonly<Record<string, ContextExpandHandle>>;
}

export interface AssembleContextPackInput {
  packId: string;
  createdAt: number;
  consumer: ContextPackConsumer;
  focal: ContextFocal;
  compositionStamp: ContextCompositionStamp;
  scopeLegend: ContextScopeLegend;
  ontologyNodes?: readonly ContextOntologyNodeInput[] | undefined;
  evidenceClaims?: readonly ContextEvidenceClaimInput[] | undefined;
  proposalSnapshots?: readonly ContextProposalSnapshotInput[] | undefined;
  proposalEventSignals?: readonly ContextProposalEventSignalInput[] | undefined;
  policy: ContextPolicy;
  graph?: ContextGraphSectionInput | undefined;
  caps?: Partial<ContextBudgetCaps> | undefined;
  expandHandles?: Readonly<Record<string, ContextExpandHandle>> | undefined;
}

export type ContextPackValidationCode =
  | 'missing-composition-stamp'
  | 'missing-branch-order'
  | 'invalid-branch-order'
  | 'invalid-node-ref'
  | 'missing-cross-scope'
  | 'missing-policy'
  | 'missing-same-label-siblings'
  | 'invalid-same-label-siblings'
  | 'forbidden-label-target-key';

export interface ContextPackValidationError {
  code: ContextPackValidationCode;
  path: string;
  message: string;
}

export interface ContextPackValidationResult {
  valid: boolean;
  errors: readonly ContextPackValidationError[];
}

export const DEFAULT_CONTEXT_BUDGET_CAPS: ContextBudgetCaps = Object.freeze({
  maxNodes: 40,
  maxEvidenceClaims: 20,
  maxProposals: 10,
  maxProposalEvents: 20,
  maxGraphNeighbors: 40,
});

const EMPTY_SECTION_COUNTS: Record<ContextBudgetSection, number> = {
  'ontology.nodes': 0,
  'evidence.claims': 0,
  'proposals.snapshots': 0,
  'proposalEvents.recentDecisionSignals': 0,
  'graph.neighborNodeRefs': 0,
};

const FORBIDDEN_LABEL_TARGET_KEYS = new Set([
  // Keep these literals split so the source-level Doc 26 guard can continue
  // banning label-only target identifiers from production code.
  ['target', 'Label'].join(''),
  ['target', 'Node', 'Label'].join(''),
  ['target', 'Ontology', 'Label'].join(''),
  ['corrected', 'Type', 'Label'].join(''),
  ['previous', 'Type', 'Label'].join(''),
  ['proposed', 'Type', 'Label'].join(''),
]);

export function scopedNodeRefKey(ref: ScopedNodeRef): string {
  return `${ref.scopeId}:${ref.nodeId}`;
}

export function assembleContextPack(input: AssembleContextPackInput): ContextPack {
  const caps = normalizeCaps(input.caps);
  const truncationLog: ContextBudgetTruncation[] = [];

  const ontologyCandidates = dedupeBy(
    (input.ontologyNodes ?? []).map(normalizeOntologyNodeInput),
    (node) => scopedNodeRefKey(node.ref),
  );
  const selectedNodes = selectOntologyNodes(ontologyCandidates, caps.maxNodes, truncationLog);
  const sameLabelSiblings = buildSameLabelSiblingGroups(selectedNodes);

  const evidenceCandidates = dedupeBy(input.evidenceClaims ?? [], (claim) => claim.evidenceId);
  const selectedEvidence = selectWithPinned(
    evidenceCandidates,
    // No ranking in this slice: all cross-scope evidence is pinned because it
    // can affect whether base/core mutation is even allowed.
    (claim) => Boolean(claim.pinned || claim.crossScope),
    caps.maxEvidenceClaims,
    'evidence.claims',
    truncationLog,
  ).map(stripPinned);

  const proposalCandidates = dedupeBy(input.proposalSnapshots ?? [], (proposal) => proposal.proposalId);
  const selectedProposals = selectWithPinned(
    proposalCandidates,
    (proposal) => Boolean(proposal.pinned),
    caps.maxProposals,
    'proposals.snapshots',
    truncationLog,
  ).map(stripPinned);

  const proposalEventCandidates = dedupeBy(input.proposalEventSignals ?? [], (event) => event.eventId);
  const selectedProposalEvents = selectWithPinned(
    proposalEventCandidates,
    (event) => Boolean(event.pinned),
    caps.maxProposalEvents,
    'proposalEvents.recentDecisionSignals',
    truncationLog,
  ).map(stripPinned);

  const graph = input.graph
    ? assembleGraphSection(input.graph, caps.maxGraphNeighbors, truncationLog)
    : undefined;

  const included = { ...EMPTY_SECTION_COUNTS };
  included['ontology.nodes'] = selectedNodes.length;
  included['evidence.claims'] = selectedEvidence.length;
  included['proposals.snapshots'] = selectedProposals.length;
  included['proposalEvents.recentDecisionSignals'] = selectedProposalEvents.length;
  included['graph.neighborNodeRefs'] = graph?.neighborNodeRefs.length ?? 0;

  const omitted = { ...EMPTY_SECTION_COUNTS };
  omitted['ontology.nodes'] = ontologyCandidates.length - selectedNodes.length;
  omitted['evidence.claims'] = evidenceCandidates.length - selectedEvidence.length;
  omitted['proposals.snapshots'] = proposalCandidates.length - selectedProposals.length;
  omitted['proposalEvents.recentDecisionSignals'] =
    proposalEventCandidates.length - selectedProposalEvents.length;
  omitted['graph.neighborNodeRefs'] = graph?.omittedNeighborCount ?? 0;

  return {
    packId: input.packId,
    packVersion: 'context-pack-v1',
    createdAt: input.createdAt,
    consumer: input.consumer,
    focal: input.focal,
    compositionStamp: input.compositionStamp,
    scopeLegend: input.scopeLegend,
    ontology: {
      nodes: selectedNodes,
      sameLabelSiblings,
    },
    evidence: {
      claims: selectedEvidence,
      omittedCount: omitted['evidence.claims'],
    },
    proposals: {
      snapshots: selectedProposals,
      aggregatedSignals: aggregateProposalSignals(selectedProposals),
      omittedCount: omitted['proposals.snapshots'],
    },
    proposalEvents: {
      recentDecisionSignals: selectedProposalEvents,
      omittedCount: omitted['proposalEvents.recentDecisionSignals'],
    },
    policy: input.policy,
    graph,
    budgetReport: {
      caps,
      included,
      omitted,
      truncationLog,
    },
    expandHandles: input.expandHandles ?? {},
  };
}

export function validateContextPack(pack: ContextPack): ContextPackValidationResult {
  const errors: ContextPackValidationError[] = [];
  validateCompositionStamp(pack, errors);
  validatePolicy(pack, errors);
  validateScopedRefs(pack, errors);
  validateEvidence(pack, errors);
  validateSameLabelSiblings(pack, errors);
  validateForbiddenLabelTargetKeys(pack, errors);

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function assertValidContextPack(pack: ContextPack): void {
  const result = validateContextPack(pack);
  if (result.valid) return;

  const message = result.errors
    .map((error) => `${error.path}: ${error.message}`)
    .join('; ');
  throw new Error(`Invalid ContextPack: ${message}`);
}

export function serializeContextPack(pack: ContextPack): string {
  return `${JSON.stringify(toCanonicalJsonValue(pack), null, 2)}\n`;
}

function normalizeCaps(caps: Partial<ContextBudgetCaps> | undefined): ContextBudgetCaps {
  return {
    ...DEFAULT_CONTEXT_BUDGET_CAPS,
    ...caps,
  };
}

function normalizeOntologyNodeInput(node: ContextOntologyNodeInput): ContextOntologyNodeInput {
  return {
    ...node,
    useWhen: [...node.useWhen],
    doNotUseWhen: [...node.doNotUseWhen],
    examples: [...node.examples],
    relationshipRefs: node.relationshipRefs.map((relationship) => ({
      typeNodeRef: relationship.typeNodeRef,
      targetNodeRef: relationship.targetNodeRef,
    })),
  };
}

function selectOntologyNodes(
  candidates: readonly ContextOntologyNodeInput[],
  cap: number,
  truncationLog: ContextBudgetTruncation[],
): ContextOntologyNode[] {
  const initialSelection = new Map<string, ContextOntologyNodeInput>();

  for (const candidate of candidates) {
    if (!candidate.pinned) continue;
    initialSelection.set(scopedNodeRefKey(candidate.ref), candidate);
  }

  for (const candidate of candidates) {
    if (initialSelection.size >= cap) break;
    initialSelection.set(scopedNodeRefKey(candidate.ref), candidate);
  }

  const sameLabelGroups = buildSameLabelGroupsFromCandidates(candidates);
  for (const group of sameLabelGroups) {
    const groupKeys = group.nodes.map((node) => scopedNodeRefKey(node.ref));
    if (!groupKeys.some((key) => initialSelection.has(key))) continue;
    for (const node of group.nodes) {
      initialSelection.set(scopedNodeRefKey(node.ref), node);
    }
  }

  const selected = candidates
    .filter((candidate) => initialSelection.has(scopedNodeRefKey(candidate.ref)))
    .map(stripPinned);

  const dropped = candidates.length - selected.length;
  if (dropped > 0) {
    truncationLog.push({
      section: 'ontology.nodes',
      dropped,
      reason: 'cap',
    });
  }

  return selected;
}

function buildSameLabelSiblingGroups(
  nodes: readonly ContextOntologyNode[],
): ContextSameLabelSiblingGroup[] {
  return buildSameLabelGroupsFromCandidates(nodes).map((group) => ({
    label: group.label,
    normalizedLabel: group.normalizedLabel,
    nodeRefs: group.nodes.map((node) => node.ref),
  }));
}

function buildSameLabelGroupsFromCandidates<T extends ContextOntologyNode>(
  nodes: readonly T[],
): Array<{ label: string; normalizedLabel: string; nodes: T[] }> {
  const groups = new Map<
    string,
    {
      label: string;
      normalizedLabel: string;
      nodes: T[];
      nodeIds: Set<string>;
    }
  >();

  for (const node of nodes) {
    const normalizedLabel = normalizeOntologyDisplayLabel(node.label);
    if (!normalizedLabel) continue;

    const group = groups.get(normalizedLabel);
    if (group) {
      group.nodes.push(node);
      group.nodeIds.add(node.ref.nodeId);
      continue;
    }

    groups.set(normalizedLabel, {
      label: node.label.trim().replace(/\s+/g, ' '),
      normalizedLabel,
      nodes: [node],
      nodeIds: new Set([node.ref.nodeId]),
    });
  }

  return [...groups.values()].filter((group) => group.nodeIds.size > 1);
}

function selectWithPinned<T>(
  candidates: readonly T[],
  isPinned: (candidate: T) => boolean,
  cap: number,
  section: ContextBudgetSection,
  truncationLog: ContextBudgetTruncation[],
): T[] {
  const selected: T[] = [];
  const selectedSet = new Set<T>();

  for (const candidate of candidates) {
    if (!isPinned(candidate)) continue;
    selected.push(candidate);
    selectedSet.add(candidate);
  }

  for (const candidate of candidates) {
    if (selected.length >= cap) break;
    if (selectedSet.has(candidate)) continue;
    selected.push(candidate);
    selectedSet.add(candidate);
  }

  const dropped = candidates.length - selected.length;
  if (dropped > 0) {
    truncationLog.push({
      section,
      dropped,
      reason: 'cap',
    });
  }

  return selected;
}

function stripPinned<T extends { pinned?: boolean | undefined }>(
  input: T,
): Omit<T, 'pinned'> {
  const { pinned: _pinned, ...rest } = input;
  return rest;
}

function assembleGraphSection(
  input: ContextGraphSectionInput,
  maxGraphNeighbors: number,
  truncationLog: ContextBudgetTruncation[],
): ContextGraphSection {
  const selectedNodeRefs = dedupeBy(input.selectedNodeRefs, scopedNodeRefKey);
  const neighborNodeRefs = dedupeBy(input.neighborNodeRefs ?? [], scopedNodeRefKey)
    .filter((ref) => !selectedNodeRefs.some((selected) => sameScopedNodeRef(selected, ref)));
  const includedNeighbors = neighborNodeRefs.slice(0, maxGraphNeighbors);
  const omittedNeighborCount = neighborNodeRefs.length - includedNeighbors.length;

  if (omittedNeighborCount > 0) {
    truncationLog.push({
      section: 'graph.neighborNodeRefs',
      dropped: omittedNeighborCount,
      reason: 'cap',
    });
  }

  return {
    selectedNodeRefs,
    neighborNodeRefs: includedNeighbors,
    expansionDepth: input.expansionDepth,
    omittedNeighborCount,
  };
}

function aggregateProposalSignals(
  proposals: readonly ContextProposalSnapshot[],
): ContextProposalAggregatedSignals {
  return {
    pendingCount: proposals.filter((proposal) => proposal.status === 'pending').length,
    highestRiskScore: proposals.reduce(
      (highest, proposal) => Math.max(highest, proposal.riskScore),
      0,
    ),
    branchLocalCount: proposals.filter((proposal) => proposal.target.kind === 'profile_branch').length,
    baseOrCoreTargetCount: proposals.filter((proposal) => proposal.target.kind === 'base_profile').length,
  };
}

function dedupeBy<T>(items: readonly T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    const key = getKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

function sameScopedNodeRef(a: ScopedNodeRef, b: ScopedNodeRef): boolean {
  return a.scopeId === b.scopeId && a.nodeId === b.nodeId;
}

function validateCompositionStamp(
  pack: ContextPack,
  errors: ContextPackValidationError[],
): void {
  const stamp = pack.compositionStamp as ContextCompositionStamp | undefined;
  if (!stamp || !stamp.baseProfileId || !stamp.activeProfileId || !stamp.compositionHash) {
    errors.push({
      code: 'missing-composition-stamp',
      path: 'compositionStamp',
      message: 'ContextPack requires baseProfileId, activeProfileId, and compositionHash.',
    });
  }

  if (!stamp || !Array.isArray(stamp.branchOrder)) {
    errors.push({
      code: 'missing-branch-order',
      path: 'compositionStamp.branchOrder',
      message: 'branchOrder must be present, even when no branches are active.',
    });
    return;
  }

  stamp.branchOrder.forEach((entry, index) => {
    if (
      !entry ||
      !entry.branchId ||
      !['project', 'learning', 'personal'].includes(entry.kind)
    ) {
      errors.push({
        code: 'invalid-branch-order',
        path: `compositionStamp.branchOrder[${index}]`,
        message: 'branchOrder entries require branchId and kind.',
      });
    }
  });
}

function validatePolicy(pack: ContextPack, errors: ContextPackValidationError[]): void {
  if (!pack.policy || pack.policy.opsMustUseNodeRef !== true) {
    errors.push({
      code: 'missing-policy',
      path: 'policy.opsMustUseNodeRef',
      message: 'ContextPack policy must require scoped node refs.',
    });
  }

  if (pack.policy?.coreMutationRule !== 'explicitUserIntentOrCrossScopeEvidenceOnly') {
    errors.push({
      code: 'missing-policy',
      path: 'policy.coreMutationRule',
      message: 'ContextPack policy must encode the base/core mutation rule.',
    });
  }
}

function validateScopedRefs(pack: ContextPack, errors: ContextPackValidationError[]): void {
  const check = (ref: ScopedNodeRef | undefined, path: string) => {
    if (!ref || !ref.scopeId || !ref.nodeId) {
      errors.push({
        code: 'invalid-node-ref',
        path,
        message: 'Ontology references must include scopeId and nodeId.',
      });
    }
  };

  pack.focal.nodeRefs?.forEach((ref, index) => check(ref, `focal.nodeRefs[${index}]`));
  pack.ontology.nodes.forEach((node, nodeIndex) => {
    check(node.ref, `ontology.nodes[${nodeIndex}].ref`);
    node.relationshipRefs.forEach((relationship, relationshipIndex) => {
      check(
        relationship.typeNodeRef,
        `ontology.nodes[${nodeIndex}].relationshipRefs[${relationshipIndex}].typeNodeRef`,
      );
      check(
        relationship.targetNodeRef,
        `ontology.nodes[${nodeIndex}].relationshipRefs[${relationshipIndex}].targetNodeRef`,
      );
    });
  });
  pack.ontology.sameLabelSiblings.forEach((group, groupIndex) => {
    group.nodeRefs.forEach((ref, refIndex) => {
      check(ref, `ontology.sameLabelSiblings[${groupIndex}].nodeRefs[${refIndex}]`);
    });
  });
  pack.evidence.claims.forEach((claim, claimIndex) => {
    checkOptional(claim.subjectNodeRef, `evidence.claims[${claimIndex}].subjectNodeRef`, check);
    checkOptional(claim.previousNodeRef, `evidence.claims[${claimIndex}].previousNodeRef`, check);
    checkOptional(claim.correctedNodeRef, `evidence.claims[${claimIndex}].correctedNodeRef`, check);
  });
  pack.proposals.snapshots.forEach((proposal, proposalIndex) => {
    proposal.nodeRefs.forEach((ref, refIndex) => {
      check(ref, `proposals.snapshots[${proposalIndex}].nodeRefs[${refIndex}]`);
    });
  });
  pack.graph?.selectedNodeRefs.forEach((ref, index) => {
    check(ref, `graph.selectedNodeRefs[${index}]`);
  });
  pack.graph?.neighborNodeRefs.forEach((ref, index) => {
    check(ref, `graph.neighborNodeRefs[${index}]`);
  });
}

function checkOptional(
  ref: ScopedNodeRef | undefined,
  path: string,
  check: (ref: ScopedNodeRef | undefined, path: string) => void,
): void {
  if (ref) check(ref, path);
}

function validateEvidence(pack: ContextPack, errors: ContextPackValidationError[]): void {
  pack.evidence.claims.forEach((claim, index) => {
    if (typeof claim.crossScope !== 'boolean') {
      errors.push({
        code: 'missing-cross-scope',
        path: `evidence.claims[${index}].crossScope`,
        message: 'Every evidence claim must explicitly state crossScope.',
      });
    }
  });
}

function validateSameLabelSiblings(
  pack: ContextPack,
  errors: ContextPackValidationError[],
): void {
  const expectedGroups = buildSameLabelSiblingGroups(pack.ontology.nodes);
  const expectedGroupKeys = new Set(expectedGroups.map((group) => sameLabelGroupKey(group.nodeRefs)));
  const actualGroupKeys = new Set(
    pack.ontology.sameLabelSiblings.map((group) => sameLabelGroupKey(group.nodeRefs)),
  );

  for (const group of expectedGroups) {
    if (actualGroupKeys.has(sameLabelGroupKey(group.nodeRefs))) continue;
    errors.push({
      code: 'missing-same-label-siblings',
      path: 'ontology.sameLabelSiblings',
      message: `Same-label scoped meanings for "${group.label}" must be listed explicitly.`,
    });
  }

  pack.ontology.sameLabelSiblings.forEach((group, index) => {
    const key = sameLabelGroupKey(group.nodeRefs);
    if (expectedGroupKeys.has(key)) return;
    errors.push({
      code: 'invalid-same-label-siblings',
      path: `ontology.sameLabelSiblings[${index}]`,
      message: `sameLabelSiblings[${index}] does not match included ontology nodes.`,
    });
  });
}

function sameLabelGroupKey(refs: readonly ScopedNodeRef[]): string {
  return refs.map(scopedNodeRefKey).sort().join('|');
}

function validateForbiddenLabelTargetKeys(
  pack: ContextPack,
  errors: ContextPackValidationError[],
): void {
  walkObject(pack, (key, path) => {
    if (!FORBIDDEN_LABEL_TARGET_KEYS.has(key)) return;
    errors.push({
      code: 'forbidden-label-target-key',
      path,
      message: `${key} is a label-only ontology target. Use ScopedNodeRef instead.`,
    });
  });
}

function walkObject(value: unknown, visitor: (key: string, path: string) => void, path = ''): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkObject(item, visitor, `${path}[${index}]`));
    return;
  }

  if (!isPlainObject(value)) return;

  for (const [key, child] of Object.entries(value)) {
    const childPath = path ? `${path}.${key}` : key;
    visitor(key, childPath);
    walkObject(child, visitor, childPath);
  }
}

function toCanonicalJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toCanonicalJsonValue);

  if (!isPlainObject(value)) return value;

  const result: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    const child = value[key];
    if (typeof child === 'undefined') continue;
    result[key] = toCanonicalJsonValue(child);
  }
  return result;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
