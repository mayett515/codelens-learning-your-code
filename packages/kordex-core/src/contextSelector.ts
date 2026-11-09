import { scopedNodeRefKey } from './contextAssembly';
import { normalizeOntologyDisplayLabel } from './scopedMeaning';
import type { ProfileChangeProposalTarget } from './types';
import type {
  ContextBudgetCaps,
  ContextEvidenceClaimInput,
  ContextFocal,
  ContextGraphSectionInput,
  ContextOntologyNodeInput,
  ContextPackConsumer,
  ContextProposalEventSignalInput,
  ContextProposalSnapshotInput,
  ContextUserFitNodeSignalInput,
  ContextUserFitProposalSignalInput,
  ScopedNodeRef,
} from './contextAssembly';

export type ContextSelectionSection =
  | 'ontology'
  | 'evidence'
  | 'proposals'
  | 'proposalEvents'
  | 'userFit'
  | 'graph';

export type ContextSelectionBucket = 'pinned' | 'elastic' | 'omitted';

export type ContextSelectionReason =
  | 'focal'
  | 'directReference'
  | 'sameLabelAmbiguity'
  | 'crossScopeEvidence'
  | 'policyRequired'
  | 'recent'
  | 'callerPriority'
  | 'cap'
  | 'callerExcluded';

export interface ContextSelectionTraceEntry {
  candidateId: string;
  section: ContextSelectionSection;
  bucket: ContextSelectionBucket;
  reason: ContextSelectionReason;
}

export interface ContextSelection {
  consumer: ContextPackConsumer;
  focal: ContextFocal;
  ontologyNodes: readonly ContextOntologyNodeInput[];
  evidenceClaims: readonly ContextEvidenceClaimInput[];
  proposalSnapshots: readonly ContextProposalSnapshotInput[];
  proposalEventSignals: readonly ContextProposalEventSignalInput[];
  userFitNodeSignals: readonly ContextUserFitNodeSignalInput[];
  userFitProposalSignals: readonly ContextUserFitProposalSignalInput[];
  graph?: ContextGraphSectionInput | undefined;
  caps?: Partial<ContextBudgetCaps> | undefined;
  trace: readonly ContextSelectionTraceEntry[];
}

export interface ContextSelector<TInput> {
  select(input: TInput): ContextSelection;
}

export interface SharedContextSelectorInput {
  focal: ContextFocal;
  ontologyNodes?: readonly ContextOntologyNodeInput[] | undefined;
  evidenceClaims?: readonly ContextEvidenceClaimInput[] | undefined;
  proposalSnapshots?: readonly ContextProposalSnapshotInput[] | undefined;
  proposalEventSignals?: readonly ContextProposalEventSignalInput[] | undefined;
  userFitNodeSignals?: readonly ContextUserFitNodeSignalInput[] | undefined;
  userFitProposalSignals?: readonly ContextUserFitProposalSignalInput[] | undefined;
  graph?: ContextGraphSectionInput | undefined;
  caps?: Partial<ContextBudgetCaps> | undefined;
  requiredNodeRefs?: readonly ScopedNodeRef[] | undefined;
  pinnedEvidenceIds?: readonly string[] | undefined;
  pinnedProposalIds?: readonly string[] | undefined;
  pinnedProposalEventIds?: readonly string[] | undefined;
}

export interface ConceptualizeContextSelectorInput extends SharedContextSelectorInput {}

export interface CheckerContextSelectorInput extends SharedContextSelectorInput {}

export function createConceptualizeContextSelector(): ContextSelector<ConceptualizeContextSelectorInput> {
  return {
    select: selectConceptualizeContext,
  };
}

export function createCheckerContextSelector(): ContextSelector<CheckerContextSelectorInput> {
  return {
    select: selectCheckerContext,
  };
}

export function selectConceptualizeContext(
  input: ConceptualizeContextSelectorInput,
): ContextSelection {
  return selectContext(input, 'conceptualize');
}

export function selectCheckerContext(
  input: CheckerContextSelectorInput,
): ContextSelection {
  return selectContext(input, 'checker');
}

function selectContext(
  input: SharedContextSelectorInput,
  consumer: ContextPackConsumer,
): ContextSelection {
  const trace: ContextSelectionTraceEntry[] = [];
  const focalNodeRefKeys = new Set((input.focal.nodeRefs ?? []).map(scopedNodeRefKey));
  const requiredNodeRefKeys = new Set([
    ...focalNodeRefKeys,
    ...(input.requiredNodeRefs ?? []).map(scopedNodeRefKey),
  ]);
  const ontologyNodes = selectOntologyNodes(
    input.ontologyNodes ?? [],
    input.caps?.maxNodes,
    focalNodeRefKeys,
    requiredNodeRefKeys,
    trace,
  );
  const pinnedDecisionNodeRefKeys = new Set(requiredNodeRefKeys);
  for (const node of ontologyNodes) {
    if (node.pinned) pinnedDecisionNodeRefKeys.add(scopedNodeRefKey(node.ref));
  }

  return {
    consumer,
    focal: cloneFocal(input.focal),
    ontologyNodes,
    evidenceClaims: selectEvidenceClaims(
      input.evidenceClaims ?? [],
      input.caps?.maxEvidenceClaims,
      new Set(input.pinnedEvidenceIds ?? []),
      pinnedDecisionNodeRefKeys,
      trace,
    ),
    proposalSnapshots: selectProposalSnapshots(
      input.proposalSnapshots ?? [],
      input.caps?.maxProposals,
      new Set(input.pinnedProposalIds ?? []),
      trace,
    ),
    proposalEventSignals: selectProposalEventSignals(
      input.proposalEventSignals ?? [],
      input.caps?.maxProposalEvents,
      new Set(input.pinnedProposalEventIds ?? []),
      trace,
    ),
    userFitNodeSignals: selectUserFitNodeSignals(
      input.userFitNodeSignals ?? [],
      input.caps?.maxUserFitNodeSignals,
      trace,
    ),
    userFitProposalSignals: selectUserFitProposalSignals(
      input.userFitProposalSignals ?? [],
      input.caps?.maxUserFitProposalSignals,
      trace,
    ),
    graph: selectGraph(input.graph, input.caps?.maxGraphNeighbors, trace),
    caps: input.caps ? { ...input.caps } : undefined,
    trace,
  };
}

function selectOntologyNodes(
  candidates: readonly ContextOntologyNodeInput[],
  cap: number | undefined,
  focalNodeRefKeys: ReadonlySet<string>,
  requiredNodeRefKeys: ReadonlySet<string>,
  trace: ContextSelectionTraceEntry[],
): ContextOntologyNodeInput[] {
  const deduped = dedupeBy(candidates, (node) => scopedNodeRefKey(node.ref));
  const sameLabelRequiredKeys = sameLabelAmbiguityKeys(deduped, requiredNodeRefKeys);
  const selected: ContextOntologyNodeInput[] = [];
  const selectedKeys = new Set<string>();

  const include = (
    node: ContextOntologyNodeInput,
    pinned: boolean,
    reason: ContextSelectionReason,
  ) => {
    const key = scopedNodeRefKey(node.ref);
    selected.push(cloneOntologyNode(node, pinned));
    selectedKeys.add(key);
    trace.push({
      candidateId: key,
      section: 'ontology',
      bucket: pinned ? 'pinned' : 'elastic',
      reason,
    });
  };

  for (const node of deduped) {
    const key = scopedNodeRefKey(node.ref);
    if (
      !node.pinned &&
      !requiredNodeRefKeys.has(key) &&
      !sameLabelRequiredKeys.has(key)
    ) {
      continue;
    }

    include(node, true, ontologyPinnedReason(
      key,
      focalNodeRefKeys,
      requiredNodeRefKeys,
      sameLabelRequiredKeys,
    ));
  }

  const effectiveCap = cap ?? deduped.length;
  for (const node of deduped) {
    const key = scopedNodeRefKey(node.ref);
    if (selectedKeys.has(key)) continue;
    if (selected.length >= effectiveCap) continue;
    include(node, false, 'callerPriority');
  }

  const sameLabelSelectedKeys = sameLabelAmbiguityKeys(deduped, selectedKeys);
  for (const node of deduped) {
    const key = scopedNodeRefKey(node.ref);
    if (selectedKeys.has(key) || !sameLabelSelectedKeys.has(key)) continue;
    include(node, true, 'sameLabelAmbiguity');
  }

  for (const node of deduped) {
    const key = scopedNodeRefKey(node.ref);
    if (selectedKeys.has(key)) continue;
    trace.push({
      candidateId: key,
      section: 'ontology',
      bucket: 'omitted',
      reason: 'cap',
    });
  }

  return selected;
}

function ontologyPinnedReason(
  key: string,
  focalNodeRefKeys: ReadonlySet<string>,
  requiredNodeRefKeys: ReadonlySet<string>,
  sameLabelRequiredKeys: ReadonlySet<string>,
): ContextSelectionReason {
  if (focalNodeRefKeys.has(key)) return 'focal';
  if (requiredNodeRefKeys.has(key)) return 'directReference';
  if (sameLabelRequiredKeys.has(key)) return 'sameLabelAmbiguity';
  return 'callerPriority';
}

function selectEvidenceClaims(
  candidates: readonly ContextEvidenceClaimInput[],
  cap: number | undefined,
  pinnedEvidenceIds: ReadonlySet<string>,
  pinnedDecisionNodeRefKeys: ReadonlySet<string>,
  trace: ContextSelectionTraceEntry[],
): ContextEvidenceClaimInput[] {
  return selectWithCap({
    candidates: dedupeBy(candidates, (claim) => claim.evidenceId),
    cap,
    section: 'evidence',
    getId: (claim) => claim.evidenceId,
    isPinned: (claim) =>
      Boolean(claim.pinned) ||
      claim.crossScope ||
      pinnedEvidenceIds.has(claim.evidenceId) ||
      claimReferencesPinnedDecisionNode(claim, pinnedDecisionNodeRefKeys),
    reasonForPinned: (claim) => {
      if (claim.crossScope) return 'crossScopeEvidence';
      if (pinnedEvidenceIds.has(claim.evidenceId)) return 'directReference';
      if (claimReferencesPinnedDecisionNode(claim, pinnedDecisionNodeRefKeys)) return 'directReference';
      return 'callerPriority';
    },
    reasonForElastic: () => 'recent',
    cloneIncluded: (claim, pinned) => ({
      ...claim,
      pinned,
      sourceEvidenceIds: claim.sourceEvidenceIds ? [...claim.sourceEvidenceIds] : undefined,
      sourceIds: [...claim.sourceIds],
    }),
    trace,
  });
}

function selectProposalSnapshots(
  candidates: readonly ContextProposalSnapshotInput[],
  cap: number | undefined,
  pinnedProposalIds: ReadonlySet<string>,
  trace: ContextSelectionTraceEntry[],
): ContextProposalSnapshotInput[] {
  return selectWithCap({
    candidates: dedupeBy(candidates, (proposal) => proposal.proposalId),
    cap,
    section: 'proposals',
    getId: (proposal) => proposal.proposalId,
    isPinned: (proposal) => Boolean(proposal.pinned) || pinnedProposalIds.has(proposal.proposalId),
    reasonForPinned: (proposal) =>
      pinnedProposalIds.has(proposal.proposalId) ? 'directReference' : 'callerPriority',
    reasonForElastic: () => 'callerPriority',
    cloneIncluded: (proposal, pinned) => ({
      ...proposal,
      pinned,
      evidenceIds: [...proposal.evidenceIds],
      nodeRefs: proposal.nodeRefs.map(cloneScopedNodeRef),
    }),
    trace,
  });
}

function selectProposalEventSignals(
  candidates: readonly ContextProposalEventSignalInput[],
  cap: number | undefined,
  pinnedProposalEventIds: ReadonlySet<string>,
  trace: ContextSelectionTraceEntry[],
): ContextProposalEventSignalInput[] {
  return selectWithCap({
    candidates: dedupeBy(candidates, (event) => event.eventId),
    cap,
    section: 'proposalEvents',
    getId: (event) => event.eventId,
    isPinned: (event) => Boolean(event.pinned) || pinnedProposalEventIds.has(event.eventId),
    reasonForPinned: (event) =>
      pinnedProposalEventIds.has(event.eventId) ? 'directReference' : 'callerPriority',
    reasonForElastic: () => 'recent',
    cloneIncluded: (event, pinned) => ({
      ...event,
      pinned,
    }),
    trace,
  });
}

function selectUserFitNodeSignals(
  candidates: readonly ContextUserFitNodeSignalInput[],
  cap: number | undefined,
  trace: ContextSelectionTraceEntry[],
): ContextUserFitNodeSignalInput[] {
  return selectWithCap({
    candidates: dedupeBy(candidates, (signal) => signal.signalId),
    cap,
    section: 'userFit',
    getId: (signal) => signal.signalId,
    isPinned: (signal) => Boolean(signal.pinned),
    reasonForPinned: () => 'directReference',
    reasonForElastic: () => 'recent',
    cloneIncluded: (signal, pinned) => ({
      ...signal,
      pinned,
      activeSelectionSnapshot: {
        baseProfileId: signal.activeSelectionSnapshot.baseProfileId,
        projectBranchIds: [...signal.activeSelectionSnapshot.projectBranchIds],
        learningBranchIds: [...signal.activeSelectionSnapshot.learningBranchIds],
        personalBranchIds: [...signal.activeSelectionSnapshot.personalBranchIds],
      },
      nodeRefs: signal.nodeRefs.map(cloneScopedNodeRef),
      evidenceIds: [...signal.evidenceIds],
    }),
    trace,
  });
}

function selectUserFitProposalSignals(
  candidates: readonly ContextUserFitProposalSignalInput[],
  cap: number | undefined,
  trace: ContextSelectionTraceEntry[],
): ContextUserFitProposalSignalInput[] {
  return selectWithCap({
    candidates: dedupeBy(candidates, (signal) => signal.signalId),
    cap,
    section: 'userFit',
    getId: (signal) => signal.signalId,
    isPinned: (signal) => Boolean(signal.pinned),
    reasonForPinned: () => 'directReference',
    reasonForElastic: () => 'recent',
    cloneIncluded: (signal, pinned) => ({
      ...signal,
      pinned,
      target: cloneProfileChangeProposalTarget(signal.target),
      eventIds: [...signal.eventIds],
    }),
    trace,
  });
}

function selectGraph(
  graph: ContextGraphSectionInput | undefined,
  maxGraphNeighbors: number | undefined,
  trace: ContextSelectionTraceEntry[],
): ContextGraphSectionInput | undefined {
  if (!graph) return undefined;

  const selectedNodeRefs = dedupeBy(graph.selectedNodeRefs, scopedNodeRefKey).map(cloneScopedNodeRef);
  const neighborNodeRefs = dedupeBy(graph.neighborNodeRefs ?? [], scopedNodeRefKey)
    .filter((ref) => !selectedNodeRefs.some((selected) => sameScopedNodeRef(selected, ref)));
  const cap = maxGraphNeighbors ?? neighborNodeRefs.length;
  const includedNeighborRefs = neighborNodeRefs.slice(0, cap).map(cloneScopedNodeRef);

  for (const ref of selectedNodeRefs) {
    trace.push({
      candidateId: scopedNodeRefKey(ref),
      section: 'graph',
      bucket: 'pinned',
      reason: 'focal',
    });
  }

  for (const ref of includedNeighborRefs) {
    trace.push({
      candidateId: scopedNodeRefKey(ref),
      section: 'graph',
      bucket: 'elastic',
      reason: 'callerPriority',
    });
  }

  for (const ref of neighborNodeRefs.slice(cap)) {
    trace.push({
      candidateId: scopedNodeRefKey(ref),
      section: 'graph',
      bucket: 'omitted',
      reason: 'cap',
    });
  }

  return {
    selectedNodeRefs,
    neighborNodeRefs: includedNeighborRefs,
    expansionDepth: graph.expansionDepth,
  };
}

function selectWithCap<T>(input: {
  candidates: readonly T[];
  cap: number | undefined;
  section: ContextSelectionSection;
  getId: (candidate: T) => string;
  isPinned: (candidate: T) => boolean;
  reasonForPinned: (candidate: T) => ContextSelectionReason;
  reasonForElastic: (candidate: T) => ContextSelectionReason;
  cloneIncluded: (candidate: T, pinned: boolean) => T;
  trace: ContextSelectionTraceEntry[];
}): T[] {
  const selected: T[] = [];
  const selectedIds = new Set<string>();

  for (const candidate of input.candidates) {
    if (!input.isPinned(candidate)) continue;
    const id = input.getId(candidate);
    selected.push(input.cloneIncluded(candidate, true));
    selectedIds.add(id);
    input.trace.push({
      candidateId: id,
      section: input.section,
      bucket: 'pinned',
      reason: input.reasonForPinned(candidate),
    });
  }

  const cap = input.cap ?? input.candidates.length;
  for (const candidate of input.candidates) {
    const id = input.getId(candidate);
    if (selectedIds.has(id)) continue;
    if (selected.length >= cap) {
      input.trace.push({
        candidateId: id,
        section: input.section,
        bucket: 'omitted',
        reason: 'cap',
      });
      continue;
    }
    selected.push(input.cloneIncluded(candidate, false));
    selectedIds.add(id);
    input.trace.push({
      candidateId: id,
      section: input.section,
      bucket: 'elastic',
      reason: input.reasonForElastic(candidate),
    });
  }

  return selected;
}

function sameLabelAmbiguityKeys(
  nodes: readonly ContextOntologyNodeInput[],
  requiredNodeRefKeys: ReadonlySet<string>,
): Set<string> {
  const result = new Set<string>();
  const groups = new Map<
    string,
    {
      nodes: ContextOntologyNodeInput[];
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
    } else {
      groups.set(normalizedLabel, {
        nodes: [node],
        nodeIds: new Set([node.ref.nodeId]),
      });
    }
  }

  for (const group of groups.values()) {
    if (group.nodeIds.size <= 1) continue;
    if (!group.nodes.some((node) => requiredNodeRefKeys.has(scopedNodeRefKey(node.ref)))) continue;
    for (const node of group.nodes) result.add(scopedNodeRefKey(node.ref));
  }

  return result;
}

function claimReferencesPinnedDecisionNode(
  claim: ContextEvidenceClaimInput,
  pinnedDecisionNodeRefKeys: ReadonlySet<string>,
): boolean {
  return [
    claim.subjectNodeRef,
    claim.previousNodeRef,
    claim.correctedNodeRef,
  ].some((ref) => ref && pinnedDecisionNodeRefKeys.has(scopedNodeRefKey(ref)));
}

function cloneFocal(focal: ContextFocal): ContextFocal {
  return {
    ...focal,
    nodeRefs: focal.nodeRefs?.map(cloneScopedNodeRef),
    sourceIds: focal.sourceIds ? [...focal.sourceIds] : undefined,
  };
}

function cloneOntologyNode(
  node: ContextOntologyNodeInput,
  pinned: boolean,
): ContextOntologyNodeInput {
  return {
    ...node,
    pinned,
    ref: cloneScopedNodeRef(node.ref),
    useWhen: [...node.useWhen],
    doNotUseWhen: [...node.doNotUseWhen],
    examples: [...node.examples],
    relationshipRefs: node.relationshipRefs.map((relationship) => ({
      typeNodeRef: cloneScopedNodeRef(relationship.typeNodeRef),
      targetNodeRef: cloneScopedNodeRef(relationship.targetNodeRef),
    })),
  };
}

function cloneScopedNodeRef(ref: ScopedNodeRef): ScopedNodeRef {
  return {
    scopeId: ref.scopeId,
    nodeId: ref.nodeId,
  };
}

function sameScopedNodeRef(a: ScopedNodeRef, b: ScopedNodeRef): boolean {
  return a.scopeId === b.scopeId && a.nodeId === b.nodeId;
}

function cloneProfileChangeProposalTarget(
  target: ProfileChangeProposalTarget,
): ProfileChangeProposalTarget {
  return {
    kind: target.kind,
    ...(target.profileId === undefined ? {} : { profileId: target.profileId }),
    ...(target.branchId === undefined ? {} : { branchId: target.branchId }),
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
