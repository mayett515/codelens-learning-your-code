import { z } from 'zod';
import {
  assertValidContextPack,
  scopedNodeRefKey,
  type ContextPack,
  type ScopedNodeRef,
} from './contextAssembly';
import { normalizeOntologyDisplayLabel } from './scopedMeaning';

export const CHECKER_PROMPT_VERSION = 'checker-prompt-v1';
export const CHECKER_PROMPT_OUTPUT_VERSION = 'checker-output-v1';
export const MAX_CHECKER_FINDINGS_HARD_CAP = 12;

export type CheckerPromptFindingKind = 'missing_branch_item_type';

const ScopedNodeRefOutputSchema = z.object({
  scopeId: z.string().min(1),
  nodeId: z.string().min(1),
}).strict();

const CheckerFindingSchema = z.object({
  kind: z.literal('missing_branch_item_type'),
  label: z.string().min(1).max(120),
  parentNodeRef: ScopedNodeRefOutputSchema.nullable(),
  meaning: z.string().min(1).max(500),
  rationale: z.string().min(1).max(1000),
  evidenceIds: z.array(z.string().min(1)).min(1).max(20),
  semanticConfidence: z.number().min(0).max(1),
}).strict();

export const CheckerPromptOutputSchema = z.object({
  schemaVersion: z.literal(CHECKER_PROMPT_OUTPUT_VERSION),
  explanation: z.object({
    summary: z.string().min(1).max(1500),
    relationshipOrBoundaryObservations: z.array(z.string().min(1).max(500)).max(10).optional(),
  }).strict(),
  findings: z.array(CheckerFindingSchema).max(MAX_CHECKER_FINDINGS_HARD_CAP),
}).strict();

export type CheckerPromptOutput = z.infer<typeof CheckerPromptOutputSchema>;
export type CheckerPromptFinding = CheckerPromptOutput['findings'][number];

export interface BuildCheckerPromptInput {
  pack: ContextPack;
}

export interface CheckerPromptPayload {
  promptVersion: typeof CHECKER_PROMPT_VERSION;
  packId: string;
  packVersion: ContextPack['packVersion'];
  consumer: ContextPack['consumer'];
  focal: {
    kind: ContextPack['focal']['kind'];
    id: string;
    summary: string;
    nodeRefKeys: readonly string[];
    sourceIds: readonly string[];
  };
  composition: {
    baseProfileId: string;
    activeProfileId: string;
    branchOrder: ContextPack['compositionStamp']['branchOrder'];
    compositionHash: string;
    activeScopeId: string;
  };
  ontology: {
    allowedNodeRefKeys: readonly string[];
    nodes: ReadonlyArray<{
      ref: ScopedNodeRef;
      refKey: string;
      label: string;
      meaning: string;
      isItemType: boolean;
      useWhen: readonly string[];
      doNotUseWhen: readonly string[];
      examples: readonly string[];
      relationshipRefKeys: readonly string[];
    }>;
    sameLabelSiblings: ReadonlyArray<{
      label: string;
      normalizedLabel: string;
      refKeys: readonly string[];
    }>;
  };
  evidence: {
    claims: ReadonlyArray<{
      evidenceId: string;
      subjectRefKey?: string | undefined;
      previousRefKey?: string | undefined;
      correctedRefKey?: string | undefined;
      reason?: string | undefined;
      patternFrequency: number;
      latestAt: number;
      crossScope: boolean;
      sourceEvidenceIds: readonly string[];
      sourceIds: readonly string[];
    }>;
    omittedCount: number;
  };
  proposals: {
    pendingSnapshots: ReadonlyArray<{
      proposalId: string;
      proposalKind: string;
      targetKind: string;
      targetBranchId?: string | undefined;
      status: string;
      title: string;
      summary: string;
      riskScore: number;
      evidenceIds: readonly string[];
      nodeRefKeys: readonly string[];
    }>;
    omittedCount: number;
  };
  userFit: {
    nodeSignals: ReadonlyArray<{
      signalId: string;
      activeSelectionKey: string;
      nodeId: string;
      nodeRefKeys: readonly string[];
      confidence: number;
      score: number;
      positiveCorrectionCount: number;
      negativeCorrectionCount: number;
      missingConceptCorrectionCount: number;
      nearMissHitCount: number;
      evidenceIds: readonly string[];
      latestAt: number;
    }>;
    proposalSignals: ReadonlyArray<{
      signalId: string;
      proposalKind: string;
      targetKind: string;
      targetKey: string;
      confidence: number;
      score: number;
      appliedCount: number;
      rejectedCount: number;
      postponedCount: number;
      askedWhyCount: number;
      eventIds: readonly string[];
      latestAt: number;
    }>;
    omittedNodeSignalCount: number;
    omittedProposalSignalCount: number;
  };
  policy: {
    trustMode: ContextPack['policy']['trustMode'];
    autoApplyEnabled: boolean;
    approvalRequiredFor: readonly string[];
    forbiddenSilentMutations: readonly string[];
    coreMutationRule: ContextPack['policy']['coreMutationRule'];
    allowedFindingKinds: readonly CheckerPromptFindingKind[];
    maxFindingsHardCap: typeof MAX_CHECKER_FINDINGS_HARD_CAP;
  };
  budgetReport: ContextPack['budgetReport'];
}

export interface CheckerPromptBuildResult {
  instructionShell: string;
  dataPayload: CheckerPromptPayload;
  dataPayloadJson: string;
  promptText: string;
  outputSchemaName: 'CheckerPromptOutputSchema';
  allowedNodeRefKeys: readonly string[];
  allowedEvidenceIds: readonly string[];
}

export type CheckerPromptOutputValidationCode =
  | 'schema'
  | 'wrong-consumer'
  | 'unknown-ref'
  | 'invalid-parent-ref'
  | 'unknown-evidence'
  | 'duplicate-finding';

export interface CheckerPromptOutputValidationError {
  code: CheckerPromptOutputValidationCode;
  path: string;
  message: string;
}

export interface CheckerPromptOutputValidationResult {
  valid: boolean;
  errors: readonly CheckerPromptOutputValidationError[];
  output?: CheckerPromptOutput | undefined;
}

export function buildCheckerPrompt(input: BuildCheckerPromptInput): CheckerPromptBuildResult {
  assertValidContextPack(input.pack);
  if (input.pack.consumer !== 'checker') {
    throw new Error('Checker prompt requires a ContextPack with consumer "checker".');
  }

  const dataPayload = buildPromptPayload(input.pack);
  const dataPayloadJson = `${JSON.stringify(toCanonicalJsonValue(dataPayload), null, 2)}\n`;
  const instructionShell = buildInstructionShell();

  return {
    instructionShell,
    dataPayload,
    dataPayloadJson,
    promptText: [
      instructionShell,
      'KORDEX_CHECKER_CONTEXT_PAYLOAD_JSON:',
      dataPayloadJson,
    ].join('\n\n'),
    outputSchemaName: 'CheckerPromptOutputSchema',
    allowedNodeRefKeys: dataPayload.ontology.allowedNodeRefKeys,
    allowedEvidenceIds: evidenceIdsAllowedForCheckerOutput(input.pack),
  };
}

export function validateCheckerPromptOutput(
  rawOutput: unknown,
  pack: ContextPack,
): CheckerPromptOutputValidationResult {
  assertValidContextPack(pack);

  const parsed = CheckerPromptOutputSchema.safeParse(rawOutput);
  if (!parsed.success) {
    return {
      valid: false,
      errors: parsed.error.issues.map((issue) => ({
        code: 'schema',
        path: issue.path.join('.') || '<root>',
        message: issue.message,
      })),
    };
  }

  const errors: CheckerPromptOutputValidationError[] = [];
  if (pack.consumer !== 'checker') {
    errors.push({
      code: 'wrong-consumer',
      path: 'consumer',
      message: 'Checker output can only be validated against a checker ContextPack.',
    });
  }

  const nodesByRefKey = new Map(pack.ontology.nodes.map((node) => [scopedNodeRefKey(node.ref), node]));
  const allowedNodeRefKeys = new Set(nodesByRefKey.keys());
  const allowedEvidenceIds = new Set(evidenceIdsAllowedForCheckerOutput(pack));
  const seenFindings = new Set<string>();
  const output = parsed.data;

  output.findings.forEach((finding, index) => {
    const parentKey = finding.parentNodeRef ? scopedNodeRefKey(finding.parentNodeRef) : '';
    if (parentKey && !allowedNodeRefKeys.has(parentKey)) {
      errors.push({
        code: 'unknown-ref',
        path: `findings[${index}].parentNodeRef`,
        message: `${parentKey} is not present in this ContextPack.`,
      });
    } else if (parentKey && nodesByRefKey.get(parentKey)?.isItemType !== true) {
      errors.push({
        code: 'invalid-parent-ref',
        path: `findings[${index}].parentNodeRef`,
        message: `${parentKey} is not an item-type node in this ContextPack.`,
      });
    }

    const normalizedFindingKey = [
      finding.kind,
      normalizeOntologyDisplayLabel(finding.label),
      parentKey,
    ].join('\u0000');
    if (seenFindings.has(normalizedFindingKey)) {
      errors.push({
        code: 'duplicate-finding',
        path: `findings[${index}]`,
        message: 'Checker findings must be unique by kind, label, and parent.',
      });
    }
    seenFindings.add(normalizedFindingKey);

    finding.evidenceIds.forEach((evidenceId, evidenceIndex) => {
      if (allowedEvidenceIds.has(evidenceId)) return;
      errors.push({
        code: 'unknown-evidence',
        path: `findings[${index}].evidenceIds[${evidenceIndex}]`,
        message: `${evidenceId} is not present in this ContextPack.`,
      });
    });
  });

  return {
    valid: errors.length === 0,
    errors,
    ...(errors.length === 0 ? { output } : {}),
  };
}

function buildPromptPayload(pack: ContextPack): CheckerPromptPayload {
  return {
    promptVersion: CHECKER_PROMPT_VERSION,
    packId: pack.packId,
    packVersion: pack.packVersion,
    consumer: pack.consumer,
    focal: {
      kind: pack.focal.kind,
      id: pack.focal.id,
      summary: pack.focal.summary,
      nodeRefKeys: pack.focal.nodeRefs?.map(scopedNodeRefKey) ?? [],
      sourceIds: [...(pack.focal.sourceIds ?? [])],
    },
    composition: {
      baseProfileId: pack.compositionStamp.baseProfileId,
      activeProfileId: pack.compositionStamp.activeProfileId,
      branchOrder: pack.compositionStamp.branchOrder.map((entry) => ({ ...entry })),
      compositionHash: pack.compositionStamp.compositionHash,
      activeScopeId: pack.scopeLegend.activeScopeId,
    },
    ontology: {
      allowedNodeRefKeys: pack.ontology.nodes.map((node) => scopedNodeRefKey(node.ref)),
      nodes: pack.ontology.nodes.map((node) => ({
        ref: cloneRef(node.ref),
        refKey: scopedNodeRefKey(node.ref),
        label: node.label,
        meaning: node.meaning,
        isItemType: node.isItemType === true,
        useWhen: [...node.useWhen],
        doNotUseWhen: [...node.doNotUseWhen],
        examples: [...node.examples],
        relationshipRefKeys: node.relationshipRefs.map((relationship) =>
          `${scopedNodeRefKey(relationship.typeNodeRef)}->${scopedNodeRefKey(relationship.targetNodeRef)}`),
      })),
      sameLabelSiblings: pack.ontology.sameLabelSiblings.map((group) => ({
        label: group.label,
        normalizedLabel: group.normalizedLabel,
        refKeys: group.nodeRefs.map(scopedNodeRefKey),
      })),
    },
    evidence: {
      claims: pack.evidence.claims.map((claim) => ({
        evidenceId: claim.evidenceId,
        ...(claim.subjectNodeRef ? { subjectRefKey: scopedNodeRefKey(claim.subjectNodeRef) } : {}),
        ...(claim.previousNodeRef ? { previousRefKey: scopedNodeRefKey(claim.previousNodeRef) } : {}),
        ...(claim.correctedNodeRef ? { correctedRefKey: scopedNodeRefKey(claim.correctedNodeRef) } : {}),
        ...(claim.reason ? { reason: claim.reason } : {}),
        patternFrequency: claim.patternFrequency,
        latestAt: claim.latestAt,
        crossScope: claim.crossScope,
        sourceEvidenceIds: [...(claim.sourceEvidenceIds ?? [])],
        sourceIds: [...claim.sourceIds],
      })),
      omittedCount: pack.evidence.omittedCount,
    },
    proposals: {
      pendingSnapshots: pack.proposals.snapshots
        .filter((proposal) => proposal.status === 'pending')
        .map((proposal) => ({
          proposalId: proposal.proposalId,
          proposalKind: proposal.proposalKind,
          targetKind: proposal.target.kind,
          ...(proposal.target.branchId ? { targetBranchId: proposal.target.branchId } : {}),
          status: proposal.status,
          title: proposal.title,
          summary: proposal.summary,
          riskScore: proposal.riskScore,
          evidenceIds: [...proposal.evidenceIds],
          nodeRefKeys: proposal.nodeRefs.map(scopedNodeRefKey),
        })),
      omittedCount: pack.proposals.omittedCount,
    },
    userFit: {
      nodeSignals: pack.userFit.nodeSignals.map((signal) => ({
        signalId: signal.signalId,
        activeSelectionKey: signal.activeSelectionKey,
        nodeId: signal.nodeId,
        nodeRefKeys: signal.nodeRefs.map(scopedNodeRefKey),
        confidence: signal.userFitConfidence,
        score: signal.score,
        positiveCorrectionCount: signal.positiveCorrectionCount,
        negativeCorrectionCount: signal.negativeCorrectionCount,
        missingConceptCorrectionCount: signal.missingConceptCorrectionCount,
        nearMissHitCount: signal.nearMissHitCount,
        evidenceIds: [...signal.evidenceIds],
        latestAt: signal.latestAt,
      })),
      proposalSignals: pack.userFit.proposalSignals.map((signal) => ({
        signalId: signal.signalId,
        proposalKind: signal.proposalKind,
        targetKind: signal.target.kind,
        targetKey: signal.targetKey,
        confidence: signal.userFitConfidence,
        score: signal.score,
        appliedCount: signal.appliedCount,
        rejectedCount: signal.rejectedCount,
        postponedCount: signal.postponedCount,
        askedWhyCount: signal.askedWhyCount,
        eventIds: [...signal.eventIds],
        latestAt: signal.latestAt,
      })),
      omittedNodeSignalCount: pack.userFit.omittedNodeSignalCount,
      omittedProposalSignalCount: pack.userFit.omittedProposalSignalCount,
    },
    policy: {
      trustMode: pack.policy.trustMode,
      autoApplyEnabled: pack.policy.autoApplyEnabled,
      approvalRequiredFor: [...pack.policy.approvalRequiredFor],
      forbiddenSilentMutations: [...pack.policy.forbiddenSilentMutations],
      coreMutationRule: pack.policy.coreMutationRule,
      allowedFindingKinds: ['missing_branch_item_type'],
      maxFindingsHardCap: MAX_CHECKER_FINDINGS_HARD_CAP,
    },
    budgetReport: pack.budgetReport,
  };
}

function buildInstructionShell(): string {
  return [
    'You are the Kordex ontology checker.',
    'Use KORDEX_CHECKER_CONTEXT_PAYLOAD_JSON as the only ontology, evidence, proposal, and user-fit map for this run.',
    'Return JSON only, matching CheckerPromptOutputSchema.',
    'Do not include markdown fences.',
    'Do not include prose outside the JSON object.',
    'This run is manual-on-demand and proposal-only. Do not claim that you changed ontology, profiles, captures, or old notes.',
    'Emit zero findings when the evidence does not support a concrete missing branch-local item type.',
    'Do not fill proposal slots. The maximum is a cap, not a quota.',
    'The only supported finding kind is missing_branch_item_type.',
    'Use parentNodeRef only when the parent scoped ref exists in ontology.allowedNodeRefKeys and that ontology node has isItemType true.',
    'Every finding must reference evidenceIds from evidence.claims evidenceId or sourceEvidenceIds. Do not invent evidence ids.',
    'Relationship, boundary, split, merge, rename, move, deprecate, base/core, maturity, and temporary-tag observations belong only in explanation.relationshipOrBoundaryObservations.',
    'Do not output proposed node ids, target fields, risk, sourceKind, proposalKind, status, createdBy, or persistence metadata. Kordex owns those fields.',
  ].join('\n');
}

function evidenceIdsAllowedForCheckerOutput(pack: ContextPack): string[] {
  const ids = new Set<string>();
  for (const claim of pack.evidence.claims) {
    ids.add(claim.evidenceId);
    for (const sourceEvidenceId of claim.sourceEvidenceIds ?? []) {
      ids.add(sourceEvidenceId);
    }
  }
  return [...ids];
}

function cloneRef(ref: ScopedNodeRef): ScopedNodeRef {
  return {
    scopeId: ref.scopeId,
    nodeId: ref.nodeId,
  };
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
