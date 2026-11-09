import { validateProfileChangeProposal } from './codecs/profileChangeProposal';
import { assertValidContextPack, type ContextPack } from './contextAssembly';
import { canonicalizeOntologyDisplayLabel } from './scopedMeaning';
import type { CheckerPromptFinding, CheckerPromptOutput } from './checkerPromptBuilder';
import type { OntologyNode, ProfileChangeProposal } from './types';

export const CHECKER_MAX_PROPOSALS_PER_RUN = 5;
export const CHECKER_BRANCH_LOCAL_ADDITIVE_RISK_SCORE = 20;

export interface CheckerTargetBranchSnapshot {
  branchId: string;
  updatedAt: number;
}

export type CheckerProposalSkipReason =
  | 'no-active-branch'
  | 'invalid-node-id'
  | 'unknown-evidence'
  | 'duplicate-output-node'
  | 'duplicate-pending-proposal'
  | 'proposal-cap'
  | 'patch-conflict';

export interface CheckerProposalSkippedFinding {
  label: string;
  reason: CheckerProposalSkipReason;
  proposedNodeId?: string | undefined;
  existingProposalId?: string | undefined;
}

export interface CheckerProposalMapperExplanation {
  summary: string;
  relationshipOrBoundaryObservations: readonly string[];
  skippedFindings: readonly CheckerProposalSkippedFinding[];
}

export interface CheckerProposalMapperResult {
  proposals: readonly ProfileChangeProposal[];
  explanation: CheckerProposalMapperExplanation;
}

export interface MapCheckerOutputToProfileChangeProposalsInput {
  output: CheckerPromptOutput;
  pack: ContextPack;
  targetBranch: CheckerTargetBranchSnapshot | null;
  existingPendingProposals?: readonly ProfileChangeProposal[] | undefined;
  now: number;
  createProposalId: (finding: CheckerPromptFinding, index: number) => string;
  maxProposals?: number | undefined;
}

export function mapCheckerOutputToProfileChangeProposals(
  input: MapCheckerOutputToProfileChangeProposalsInput,
): CheckerProposalMapperResult {
  assertValidContextPack(input.pack);
  if (input.pack.consumer !== 'checker') {
    throw new Error('Checker proposal mapping requires a ContextPack with consumer "checker".');
  }

  const observations = input.output.explanation.relationshipOrBoundaryObservations ?? [];
  const skippedFindings: CheckerProposalSkippedFinding[] = [];
  if (!input.targetBranch) {
    for (const finding of input.output.findings) {
      skippedFindings.push({
        label: finding.label,
        reason: 'no-active-branch',
      });
    }
    return buildResult(input.output.explanation.summary, observations, [], skippedFindings);
  }

  const targetBranch = input.targetBranch;
  const maxProposals = normalizeMaxProposals(input.maxProposals);
  const evidenceIdsByCitableId = indexEvidenceIdsByCitableId(input.pack);
  const knownEvidenceIds = new Set(evidenceIdsByCitableId.keys());
  const existingNodeIds = new Set(input.pack.ontology.nodes.map((node) => node.ref.nodeId));
  const existingPendingByNodeId = indexExistingPendingProposals(
    input.existingPendingProposals ?? [],
    targetBranch.branchId,
  );
  const seenOutputNodeIds = new Set<string>();
  const candidates: ProfileChangeProposal[] = [];

  input.output.findings.forEach((finding, index) => {
    const label = canonicalizeOntologyDisplayLabel(finding.label);
    const nodeId = safeMakeCheckerNodeId(label);
    if (!nodeId) {
      skippedFindings.push({
        label: finding.label,
        reason: 'invalid-node-id',
      });
      return;
    }

    if (existingNodeIds.has(nodeId) || seenOutputNodeIds.has(nodeId)) {
      skippedFindings.push({
        label,
        reason: 'duplicate-output-node',
        proposedNodeId: nodeId,
      });
      return;
    }
    seenOutputNodeIds.add(nodeId);

    const unknownEvidence = finding.evidenceIds.find((evidenceId) => !knownEvidenceIds.has(evidenceId));
    if (unknownEvidence) {
      skippedFindings.push({
        label,
        reason: 'unknown-evidence',
        proposedNodeId: nodeId,
      });
      return;
    }

    const duplicate = existingPendingByNodeId.get(nodeId);
    if (duplicate) {
      skippedFindings.push({
        label,
        reason: 'duplicate-pending-proposal',
        proposedNodeId: nodeId,
        existingProposalId: duplicate.id,
      });
      return;
    }

    candidates.push(validateProfileChangeProposal({
      id: input.createProposalId(finding, index),
      proposalKind: 'ontology_node_patch',
      sourceKind: 'checker',
      baseProfileId: input.pack.compositionStamp.baseProfileId,
      sourceBranchId: null,
      target: {
        kind: 'profile_branch',
        branchId: targetBranch.branchId,
      },
      targetProfileVersion: null,
      targetBranchUpdatedAt: targetBranch.updatedAt,
      evidenceIds: expandFindingEvidenceIds(finding.evidenceIds, evidenceIdsByCitableId),
      patch: {
        addOntologyNodes: [buildCheckerNode({
          id: nodeId,
          label,
          parentId: finding.parentNodeRef?.nodeId ?? null,
          meaning: finding.meaning,
          now: input.now,
        })],
        addItemTypeNodeIds: [nodeId],
      },
      title: `Add ${label} type`,
      summary: `Create ${label} as a branch-local item type after checker review.`,
      reason: finding.rationale,
      riskScore: CHECKER_BRANCH_LOCAL_ADDITIVE_RISK_SCORE,
      semanticConfidence: finding.semanticConfidence,
      userFitConfidence: null,
      status: 'pending',
      supersededByProposalId: null,
      createdAt: input.now,
      updatedAt: input.now,
      reviewedAt: null,
      appliedAt: null,
    }));
  });

  const proposals = candidates.slice(0, maxProposals);
  for (const proposal of candidates.slice(maxProposals)) {
    const node = proposal.patch.addOntologyNodes?.[0];
    skippedFindings.push({
      label: node?.label ?? proposal.title,
      reason: 'proposal-cap',
      proposedNodeId: node?.id,
    });
  }

  return buildResult(input.output.explanation.summary, observations, proposals, skippedFindings);
}

export function makeCheckerNodeId(label: string): string {
  const normalized = label
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!normalized) {
    throw new Error('Checker proposal label must contain at least one letter or number.');
  }
  return normalized;
}

function safeMakeCheckerNodeId(label: string): string | null {
  try {
    return makeCheckerNodeId(label);
  } catch {
    return null;
  }
}

function buildCheckerNode(input: {
  id: string;
  label: string;
  parentId: string | null;
  meaning: string;
  now: number;
}): OntologyNode {
  return {
    id: input.id,
    label: input.label,
    kind: input.parentId ? 'subcategory' : 'category',
    parentId: input.parentId,
    meaning: input.meaning,
    useWhen: [`Use when an item belongs to ${input.label}.`],
    doNotUseWhen: [],
    examples: [],
    // Parentage is already represented by parentId; relationship semantics stay for the later typed-operations gate.
    relatedNodeIds: [],
    contrastNodeIds: [],
    status: 'active',
    createdBy: 'model',
    createdAt: input.now,
    updatedAt: input.now,
  };
}

function indexEvidenceIdsByCitableId(pack: ContextPack): Map<string, readonly string[]> {
  const result = new Map<string, readonly string[]>();
  for (const claim of pack.evidence.claims) {
    const sourceEvidenceIds = claim.sourceEvidenceIds?.length
      ? [...claim.sourceEvidenceIds]
      : [claim.evidenceId];
    result.set(claim.evidenceId, sourceEvidenceIds);
    for (const sourceEvidenceId of sourceEvidenceIds) {
      if (result.has(sourceEvidenceId)) continue;
      result.set(sourceEvidenceId, [sourceEvidenceId]);
    }
  }
  return result;
}

function expandFindingEvidenceIds(
  evidenceIds: readonly string[],
  evidenceIdsByCitableId: ReadonlyMap<string, readonly string[]>,
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const evidenceId of evidenceIds) {
    const expanded = evidenceIdsByCitableId.get(evidenceId) ?? [evidenceId];
    for (const concreteEvidenceId of expanded) {
      if (seen.has(concreteEvidenceId)) continue;
      seen.add(concreteEvidenceId);
      result.push(concreteEvidenceId);
    }
  }
  return result;
}

function indexExistingPendingProposals(
  proposals: readonly ProfileChangeProposal[],
  targetBranchId: string,
): Map<string, ProfileChangeProposal> {
  const byNodeId = new Map<string, ProfileChangeProposal>();
  for (const proposal of proposals) {
    if (proposal.status !== 'pending') continue;
    if (proposal.sourceKind !== 'checker') continue;
    if (proposal.proposalKind !== 'ontology_node_patch') continue;
    if (proposal.target.kind !== 'profile_branch' || proposal.target.branchId !== targetBranchId) continue;

    for (const nodeId of proposal.patch.addItemTypeNodeIds ?? []) {
      if (!byNodeId.has(nodeId)) byNodeId.set(nodeId, proposal);
    }
    for (const node of proposal.patch.addOntologyNodes ?? []) {
      if (!byNodeId.has(node.id)) byNodeId.set(node.id, proposal);
    }
  }
  return byNodeId;
}

function normalizeMaxProposals(maxProposals: number | null | undefined): number {
  if (maxProposals == null) return CHECKER_MAX_PROPOSALS_PER_RUN;
  if (!Number.isFinite(maxProposals)) return CHECKER_MAX_PROPOSALS_PER_RUN;
  return Math.max(0, Math.min(CHECKER_MAX_PROPOSALS_PER_RUN, Math.floor(maxProposals)));
}

function buildResult(
  summary: string,
  observations: readonly string[],
  proposals: readonly ProfileChangeProposal[],
  skippedFindings: readonly CheckerProposalSkippedFinding[],
): CheckerProposalMapperResult {
  return {
    proposals,
    explanation: {
      summary,
      relationshipOrBoundaryObservations: [...observations],
      skippedFindings,
    },
  };
}
