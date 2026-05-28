import { z } from 'zod';
import {
  assertValidContextPack,
  scopedNodeRefKey,
  type ContextPack,
  type ContextScopeLegendEntry,
  type ScopedNodeRef,
} from '../../ontology';

export const CONCEPTUALIZE_PROMPT_VERSION = 'conceptualize-prompt-v1';
export const CONCEPTUALIZE_PROMPT_OUTPUT_VERSION = 'conceptualize-output-v1';
/** @internal */
export const MAX_DIAGNOSTIC_CANDIDATE_REFS_HARD_CAP = 12;

interface ConceptualizePromptRenderCaps {
  maxUseWhenPerNode: number;
  maxDoNotUseWhenPerNode: number;
  maxExamplesPerNode: number;
}

const PROMPT_RENDER_CAPS: ConceptualizePromptRenderCaps = Object.freeze({
  maxUseWhenPerNode: 3,
  maxDoNotUseWhenPerNode: 3,
  maxExamplesPerNode: 3,
});

const ScopedNodeRefOutputSchema = z.object({
  scopeId: z.string().min(1),
  nodeId: z.string().min(1),
}).strict();

const DiagnosticCandidateRefSchema = z.object({
  ref: ScopedNodeRefOutputSchema,
  rank: z.number().int().min(2),
  score: z.number().min(0).max(1).optional(),
}).strict();

const SuggestedConceptSchema = z.object({
  label: z.string().min(1).max(120),
  kind: z.enum(['category', 'subcategory', 'tag', 'relationshipType']),
  parentNodeRef: ScopedNodeRefOutputSchema.nullable().optional(),
  meaning: z.string().min(1).max(500),
  reason: z.string().min(1).max(700),
}).strict();

export const ConceptualizePromptOutputSchema = z.object({
  schemaVersion: z.literal(CONCEPTUALIZE_PROMPT_OUTPUT_VERSION),
  classification: z.object({
    primaryNodeRef: ScopedNodeRefOutputSchema.nullable(),
    noStrongMatch: z.boolean(),
    suggestedNewConcept: SuggestedConceptSchema.nullable(),
    confidence: z.number().min(0).max(1),
    rationale: z.string().min(1).max(1000),
  }).strict(),
  diagnostics: z.object({
    candidateRefs: z.array(DiagnosticCandidateRefSchema).max(MAX_DIAGNOSTIC_CANDIDATE_REFS_HARD_CAP),
  }).strict(),
}).strict();

export type ConceptualizePromptOutput = z.infer<typeof ConceptualizePromptOutputSchema>;
export type ConceptualizePromptClassification = ConceptualizePromptOutput['classification'];
/** @internal */
export type ConceptualizePromptDiagnosticCandidate = ConceptualizePromptOutput['diagnostics']['candidateRefs'][number];

export interface BuildConceptualizePromptInput {
  pack: ContextPack;
}

export interface ConceptualizePromptNodePayload {
  ref: ScopedNodeRef;
  refKey: string;
  label: string;
  meaning: string;
  useWhen: readonly string[];
  doNotUseWhen: readonly string[];
  examples: readonly string[];
  relationshipRefKeys: readonly string[];
}

/** @internal */
export interface ConceptualizeDiagnosticCandidatePolicy {
  enabled: boolean;
  maxCandidateRefs: number;
  minCandidateScore: number;
  visibility: 'internalOnly';
  persistence: 'correctionEvidenceOnly';
  selectionRule: 'closestDecisionRelevantRefsOnly';
  derivedFrom: {
    ontologyNodeCount: number;
    sameLabelAmbiguityCount: number;
    correctionEvidenceCount: number;
    proposalSnapshotCount: number;
    userFitNodeSignalCount: number;
    userFitProposalSignalCount: number;
    branchDepth: number;
    trustMode: ContextPack['policy']['trustMode'];
  };
}

export interface ConceptualizePromptPayload {
  promptVersion: typeof CONCEPTUALIZE_PROMPT_VERSION;
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
  };
  scopes: ReadonlyArray<ContextScopeLegendEntry & { active: boolean }>;
  ontology: {
    allowedNodeRefKeys: readonly string[];
    nodes: readonly ConceptualizePromptNodePayload[];
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
      crossScope: boolean;
      sourceIds: readonly string[];
    }>;
    omittedCount: number;
  };
  proposals: {
    snapshots: ReadonlyArray<{
      proposalId: string;
      proposalKind: string;
      targetKind: string;
      status: string;
      title: string;
      summary: string;
      riskScore: number;
      evidenceIds: readonly string[];
      nodeRefKeys: readonly string[];
    }>;
    omittedCount: number;
  };
  proposalEvents: {
    recentDecisionSignals: ReadonlyArray<{
      eventId: string;
      proposalId: string;
      action: string;
      reason?: string | undefined;
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
    maxAutoApplyRiskScore: number;
    approvalRequiredFor: readonly string[];
    forbiddenSilentMutations: readonly string[];
    coreMutationRule: ContextPack['policy']['coreMutationRule'];
    opsMustUseNodeRef: true;
  };
  diagnostics: {
    candidatePolicy: ConceptualizeDiagnosticCandidatePolicy;
  };
  budgetReport: ContextPack['budgetReport'];
}

export interface ConceptualizePromptBuildResult {
  instructionShell: string;
  dataPayload: ConceptualizePromptPayload;
  dataPayloadJson: string;
  promptText: string;
  outputSchemaName: 'ConceptualizePromptOutputSchema';
  allowedNodeRefKeys: readonly string[];
}

export type ConceptualizePromptOutputValidationCode =
  | 'schema'
  | 'unknown-ref'
  | 'primary-required'
  | 'primary-forbidden'
  | 'duplicate-ref'
  | 'rank-order'
  | 'diagnostic-candidate-limit'
  | 'suggestion-without-no-strong-match';

export interface ConceptualizePromptOutputValidationError {
  code: ConceptualizePromptOutputValidationCode;
  path: string;
  message: string;
}

export interface ConceptualizePromptOutputValidationResult {
  valid: boolean;
  errors: readonly ConceptualizePromptOutputValidationError[];
  output?: ConceptualizePromptOutput | undefined;
}

/** @internal */
export function deriveConceptualizeDiagnosticCandidatePolicy(
  pack: ContextPack,
): ConceptualizeDiagnosticCandidatePolicy {
  assertValidContextPack(pack);
  return buildDiagnosticCandidatePolicy(pack);
}

export function buildConceptualizePrompt(
  input: BuildConceptualizePromptInput,
): ConceptualizePromptBuildResult {
  assertValidContextPack(input.pack);

  const diagnosticCandidatePolicy = buildDiagnosticCandidatePolicy(input.pack);
  const dataPayload = buildPromptPayload(input.pack, diagnosticCandidatePolicy);
  const dataPayloadJson = `${JSON.stringify(toCanonicalJsonValue(dataPayload), null, 2)}\n`;
  const instructionShell = buildInstructionShell(diagnosticCandidatePolicy);

  return {
    instructionShell,
    dataPayload,
    dataPayloadJson,
    promptText: [
      instructionShell,
      'KORDEX_CONTEXT_PAYLOAD_JSON:',
      dataPayloadJson,
    ].join('\n\n'),
    outputSchemaName: 'ConceptualizePromptOutputSchema',
    allowedNodeRefKeys: dataPayload.ontology.allowedNodeRefKeys,
  };
}

export function getConceptualizePublicClassification(
  output: ConceptualizePromptOutput,
): ConceptualizePromptClassification {
  return output.classification;
}

export function validateConceptualizePromptOutput(
  rawOutput: unknown,
  pack: ContextPack,
): ConceptualizePromptOutputValidationResult {
  assertValidContextPack(pack);

  const parsed = ConceptualizePromptOutputSchema.safeParse(rawOutput);
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

  const allowedNodeRefKeys = new Set(pack.ontology.nodes.map((node) => scopedNodeRefKey(node.ref)));
  const diagnosticCandidatePolicy = buildDiagnosticCandidatePolicy(pack);
  const errors: ConceptualizePromptOutputValidationError[] = [];
  const output = parsed.data;
  const classification = output.classification;
  const primaryKey = classification.primaryNodeRef
    ? scopedNodeRefKey(classification.primaryNodeRef)
    : null;

  if (classification.noStrongMatch && classification.primaryNodeRef) {
    errors.push({
      code: 'primary-forbidden',
      path: 'classification.primaryNodeRef',
      message: 'primaryNodeRef must be null when noStrongMatch is true.',
    });
  }

  if (!classification.noStrongMatch && !classification.primaryNodeRef) {
    errors.push({
      code: 'primary-required',
      path: 'classification.primaryNodeRef',
      message: 'primaryNodeRef is required when noStrongMatch is false.',
    });
  }

  if (classification.suggestedNewConcept && !classification.noStrongMatch) {
    errors.push({
      code: 'suggestion-without-no-strong-match',
      path: 'classification.suggestedNewConcept',
      message: 'suggestedNewConcept is allowed only when noStrongMatch is true in this slice.',
    });
  }

  const seenRefs = new Set<string>();
  if (primaryKey) validateKnownRef(primaryKey, allowedNodeRefKeys, seenRefs, 'classification.primaryNodeRef', errors);

  if (output.diagnostics.candidateRefs.length > diagnosticCandidatePolicy.maxCandidateRefs) {
    errors.push({
      code: 'diagnostic-candidate-limit',
      path: 'diagnostics.candidateRefs',
      message: `diagnostics.candidateRefs exceeds this ContextPack policy limit of ${diagnosticCandidatePolicy.maxCandidateRefs}.`,
    });
  }

  let previousRank = 1;
  output.diagnostics.candidateRefs.forEach((candidate, index) => {
    if (candidate.rank <= previousRank) {
      errors.push({
        code: 'rank-order',
        path: `diagnostics.candidateRefs[${index}].rank`,
        message: 'diagnostic candidate ranks must be strictly increasing and start after the primary placement.',
      });
    }
    previousRank = candidate.rank;

    validateKnownRef(
      scopedNodeRefKey(candidate.ref),
      allowedNodeRefKeys,
      seenRefs,
      `diagnostics.candidateRefs[${index}].ref`,
      errors,
    );
  });

  const parentRef = classification.suggestedNewConcept?.parentNodeRef;
  if (parentRef) {
    validateKnownRef(
      scopedNodeRefKey(parentRef),
      allowedNodeRefKeys,
      new Set(),
      'classification.suggestedNewConcept.parentNodeRef',
      errors,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    ...(errors.length === 0 ? { output } : {}),
  };
}

function buildPromptPayload(
  pack: ContextPack,
  diagnosticCandidatePolicy: ConceptualizeDiagnosticCandidatePolicy,
): ConceptualizePromptPayload {
  const nodes = pack.ontology.nodes.map((node) => ({
    ref: cloneRef(node.ref),
    refKey: scopedNodeRefKey(node.ref),
    label: node.label,
    meaning: node.meaning,
    useWhen: node.useWhen.slice(0, PROMPT_RENDER_CAPS.maxUseWhenPerNode),
    doNotUseWhen: node.doNotUseWhen.slice(0, PROMPT_RENDER_CAPS.maxDoNotUseWhenPerNode),
    examples: node.examples.slice(0, PROMPT_RENDER_CAPS.maxExamplesPerNode),
    relationshipRefKeys: node.relationshipRefs.map((relationship) =>
      `${scopedNodeRefKey(relationship.typeNodeRef)}->${scopedNodeRefKey(relationship.targetNodeRef)}`),
  }));

  return {
    promptVersion: CONCEPTUALIZE_PROMPT_VERSION,
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
    },
    scopes: pack.scopeLegend.scopes.map((scope) => ({
      ...scope,
      active: scope.scopeId === pack.scopeLegend.activeScopeId,
    })),
    ontology: {
      allowedNodeRefKeys: nodes.map((node) => node.refKey),
      nodes,
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
        crossScope: claim.crossScope,
        sourceIds: [...claim.sourceIds],
      })),
      omittedCount: pack.evidence.omittedCount,
    },
    proposals: {
      snapshots: pack.proposals.snapshots.map((proposal) => ({
        proposalId: proposal.proposalId,
        proposalKind: proposal.proposalKind,
        targetKind: proposal.target.kind,
        status: proposal.status,
        title: proposal.title,
        summary: proposal.summary,
        riskScore: proposal.riskScore,
        evidenceIds: [...proposal.evidenceIds],
        nodeRefKeys: proposal.nodeRefs.map(scopedNodeRefKey),
      })),
      omittedCount: pack.proposals.omittedCount,
    },
    proposalEvents: {
      recentDecisionSignals: pack.proposalEvents.recentDecisionSignals.map((event) => ({
        eventId: event.eventId,
        proposalId: event.proposalId,
        action: event.action,
        ...(event.reason ? { reason: event.reason } : {}),
      })),
      omittedCount: pack.proposalEvents.omittedCount,
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
      maxAutoApplyRiskScore: pack.policy.maxAutoApplyRiskScore,
      approvalRequiredFor: [...pack.policy.approvalRequiredFor],
      forbiddenSilentMutations: [...pack.policy.forbiddenSilentMutations],
      coreMutationRule: pack.policy.coreMutationRule,
      opsMustUseNodeRef: true,
    },
    diagnostics: {
      candidatePolicy: diagnosticCandidatePolicy,
    },
    budgetReport: pack.budgetReport,
  };
}

function buildDiagnosticCandidatePolicy(pack: ContextPack): ConceptualizeDiagnosticCandidatePolicy {
  const ontologyNodeCount = pack.ontology.nodes.length;
  const eligibleCandidateCount = Math.max(0, ontologyNodeCount - 1);
  const sameLabelAmbiguityCount = pack.ontology.sameLabelSiblings.reduce(
    (sum, group) => sum + Math.max(0, group.nodeRefs.length - 1),
    0,
  );
  const correctionEvidenceCount = pack.evidence.claims.filter((claim) => claim.correctedNodeRef).length;
  const proposalSnapshotCount = pack.proposals.snapshots.length;
  const userFitNodeSignalCount = pack.userFit.nodeSignals.length;
  const userFitProposalSignalCount = pack.userFit.proposalSignals.length;
  const branchDepth = pack.compositionStamp.branchOrder.length;
  const baseCandidateBudget = pack.policy.trustMode === 'manual_only' ? 1 : 2;
  const ambiguityPressure =
    sameLabelAmbiguityCount +
    correctionEvidenceCount +
    proposalSnapshotCount +
    userFitNodeSignalCount +
    Math.max(0, branchDepth - 1);
  const pressureBudget = Math.min(4, ambiguityPressure);
  const maxCandidateRefs = Math.min(
    eligibleCandidateCount,
    MAX_DIAGNOSTIC_CANDIDATE_REFS_HARD_CAP,
    Math.max(eligibleCandidateCount > 0 ? 1 : 0, baseCandidateBudget + pressureBudget),
  );

  return {
    enabled: maxCandidateRefs > 0,
    maxCandidateRefs,
    minCandidateScore: 0.15,
    visibility: 'internalOnly',
    persistence: 'correctionEvidenceOnly',
    selectionRule: 'closestDecisionRelevantRefsOnly',
    derivedFrom: {
      ontologyNodeCount,
      sameLabelAmbiguityCount,
      correctionEvidenceCount,
      proposalSnapshotCount,
      userFitNodeSignalCount,
      userFitProposalSignalCount,
      branchDepth,
      trustMode: pack.policy.trustMode,
    },
  };
}

function buildInstructionShell(
  diagnosticCandidatePolicy: ConceptualizeDiagnosticCandidatePolicy,
): string {
  return [
    'You are the Kordex Conceptualize classifier.',
    'Use the KORDEX_CONTEXT_PAYLOAD_JSON as the only ontology map for this decision.',
    'Return JSON only, matching ConceptualizePromptOutputSchema.',
    'Use scoped refs from ontology.allowedNodeRefKeys. Do not invent, pluralize, rename, or coerce refs.',
    'Use ontology.nodes[].meaning, useWhen, doNotUseWhen, examples, and sameLabelSiblings to choose between close categories.',
    'Use userFit.nodeSignals as user correction history, not semantic truth; prefer it only when it points to an allowed scoped ref that still fits the capture.',
    'classification is the single public Conceptualize result: choose one primaryNodeRef when there is a strong match.',
    'Do not return public extra tags or visible alternative placements.',
    `diagnostics.candidateRefs is internal calibration data only. Policy allows up to ${diagnosticCandidatePolicy.maxCandidateRefs} close alternatives for this ContextPack; use fewer or none when the decision is clear.`,
    'Diagnostic candidates must be scoped refs from ontology.allowedNodeRefKeys, must exclude the primaryNodeRef, and must not include rationale or chain-of-thought.',
    'If there is no strong match, set noStrongMatch true, set primaryNodeRef null, and optionally fill suggestedNewConcept.',
    'suggestedNewConcept is only a suggestion. It does not change the core, branch, ontology, proposals, captures, or old notes.',
    'Do not claim that you changed or created ontology nodes.',
  ].join('\n');
}

function validateKnownRef(
  refKey: string,
  allowedNodeRefKeys: ReadonlySet<string>,
  seenRefs: Set<string>,
  path: string,
  errors: ConceptualizePromptOutputValidationError[],
): void {
  if (!allowedNodeRefKeys.has(refKey)) {
    errors.push({
      code: 'unknown-ref',
      path,
      message: `${refKey} is not present in this ContextPack.`,
    });
    return;
  }

  if (seenRefs.has(refKey)) {
    errors.push({
      code: 'duplicate-ref',
      path,
      message: `${refKey} is duplicated in the classification output.`,
    });
    return;
  }

  seenRefs.add(refKey);
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
