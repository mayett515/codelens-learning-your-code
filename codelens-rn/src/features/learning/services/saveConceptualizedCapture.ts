import { nanoid } from 'nanoid';
import type { DbOrTx } from '../../../db/client';
import {
  getOntologyNodeLabel,
  type DomainProfile,
  type OntologyCorrectionActiveSelectionSnapshot,
  type OntologyCorrectionEvidence,
  type OntologyNode,
  type ProfileChangeProposal,
  type ProfileChangeProposalTarget,
} from '../../ontology';
import {
  insertOntologyCorrectionEvidence,
  insertProfileChangeProposal,
} from '../../ontology/data';
import { normalizeConceptKey } from '../codecs/concept';
import type { LearningCaptureId } from '../types/ids';
import type { ConceptHint } from '../types/learning';
import type { SaveModalCandidateData } from '../types/saveModal';
import { saveCapture, type SaveCaptureAfterInsertInput } from './saveCapture';

export interface ConceptualizeCorrectionDraft {
  correctedTypeNodeId?: string | null | undefined;
  reason?: string | null | undefined;
  newTypeLabel?: string | null | undefined;
}

export interface ConceptualizeSaveContext {
  profile: DomainProfile;
  selectionSnapshot: OntologyCorrectionActiveSelectionSnapshot;
  proposalTarget: ProfileChangeProposalTarget;
}

export interface SaveConceptualizedCaptureDeps {
  save: typeof saveCapture;
  insertEvidence: typeof insertOntologyCorrectionEvidence;
  insertProposal: typeof insertProfileChangeProposal;
  now: () => number;
  newEvidenceId: () => string;
  newProposalId: () => string;
}

interface ResolvedConceptualizeCorrection {
  candidate: SaveModalCandidateData;
  previousTypeNodeId: string | null;
  correctedTypeNodeId: string | null;
  rawProposedTypeNodeId: string | null;
  reason: string | null;
  proposedNode: OntologyNode | null;
}

const defaultDeps: SaveConceptualizedCaptureDeps = {
  save: saveCapture,
  insertEvidence: insertOntologyCorrectionEvidence,
  insertProposal: insertProfileChangeProposal,
  now: Date.now,
  newEvidenceId: () => `ev_${nanoid(21)}`,
  newProposalId: () => `proposal_${nanoid(21)}`,
};

export async function saveConceptualizedCapture(
  candidate: SaveModalCandidateData,
  context: ConceptualizeSaveContext,
  correction?: ConceptualizeCorrectionDraft | null,
  options?: {
    saveAsProposedNew?: boolean | undefined;
    deps?: Partial<SaveConceptualizedCaptureDeps> | undefined;
  },
): Promise<LearningCaptureId> {
  const deps = { ...defaultDeps, ...options?.deps };
  const resolved = resolveConceptualizeCorrection(candidate, context.profile, correction, deps.now);

  const saveOptions: Parameters<typeof saveCapture>[2] = {
    afterInsert: async (input, tx) => {
      await persistConceptualizeCorrection({
        resolved,
        input,
        context,
        tx,
        deps,
      });
    },
  };
  if (options?.saveAsProposedNew !== undefined) {
    saveOptions.saveAsProposedNew = options.saveAsProposedNew;
  }

  return deps.save(resolved.candidate, {}, saveOptions);
}

export function resolveConceptualizeCorrection(
  candidate: SaveModalCandidateData,
  profile: DomainProfile,
  correction: ConceptualizeCorrectionDraft | null | undefined,
  now: () => number = Date.now,
): ResolvedConceptualizeCorrection {
  const previousTypeNodeId = candidate.conceptHint?.proposedConceptType ?? null;
  const rawProposedTypeNodeId = normalizeNullableText(candidate.rawProposedTypeNodeId);
  const reason = normalizeNullableText(correction?.reason);
  const newTypeLabel = normalizeNullableText(correction?.newTypeLabel);
  const selectedTypeNodeId = normalizeNullableText(correction?.correctedTypeNodeId);

  if (newTypeLabel) {
    const newTypeNodeId = makeTypeNodeId(newTypeLabel);
    if (profile.ontology.itemTypeNodeIds.includes(newTypeNodeId)) {
      return {
        candidate: withConceptHintType(candidate, newTypeNodeId, newTypeNodeId !== previousTypeNodeId),
        previousTypeNodeId,
        correctedTypeNodeId: newTypeNodeId,
        rawProposedTypeNodeId,
        reason,
        proposedNode: null,
      };
    }

    const proposedNode = buildProposedTypeNode({
      label: newTypeLabel,
      parentTypeNodeId: selectedTypeNodeId ?? previousTypeNodeId,
      previousTypeNodeId,
      reason,
      profile,
      now: now(),
    });

    return {
      candidate: withConceptHintType(candidate, proposedNode.id, true),
      previousTypeNodeId,
      correctedTypeNodeId: proposedNode.id,
      rawProposedTypeNodeId,
      reason,
      proposedNode,
    };
  }

  if (!selectedTypeNodeId || selectedTypeNodeId === previousTypeNodeId) {
    return {
      candidate,
      previousTypeNodeId,
      correctedTypeNodeId: previousTypeNodeId,
      rawProposedTypeNodeId,
      reason,
      proposedNode: null,
    };
  }

  assertKnownTypeNode(profile, selectedTypeNodeId);
  return {
    candidate: withConceptHintType(candidate, selectedTypeNodeId, true),
    previousTypeNodeId,
    correctedTypeNodeId: selectedTypeNodeId,
    rawProposedTypeNodeId,
    reason,
    proposedNode: null,
  };
}

async function persistConceptualizeCorrection(input: {
  resolved: ResolvedConceptualizeCorrection;
  input: SaveCaptureAfterInsertInput;
  context: ConceptualizeSaveContext;
  tx: DbOrTx;
  deps: SaveConceptualizedCaptureDeps;
}): Promise<void> {
  const { resolved, context, tx, deps } = input;
  if (!resolved.correctedTypeNodeId) return;
  if (resolved.previousTypeNodeId === resolved.correctedTypeNodeId && !resolved.proposedNode) return;

  const evidenceId = deps.newEvidenceId();
  const evidence: OntologyCorrectionEvidence = {
    id: evidenceId,
    profileId: context.profile.id,
    activeSelectionSnapshot: context.selectionSnapshot,
    subjectKind: 'capture',
    subjectId: input.input.captureId,
    field: 'typeNodeId',
    previousTypeNodeId: resolved.previousTypeNodeId,
    correctedTypeNodeId: resolved.correctedTypeNodeId,
    rawProposedTypeNodeId: resolved.rawProposedTypeNodeId,
    reason: resolved.reason,
    source: 'user',
    createdAt: input.input.createdAt,
  };

  await deps.insertEvidence(evidence, tx);

  if (!resolved.proposedNode) return;

  const proposal = buildNewTypeProposal({
    proposalId: deps.newProposalId(),
    evidenceId,
    node: resolved.proposedNode,
    context,
    reason: resolved.reason,
    now: input.input.createdAt,
  });
  await deps.insertProposal(proposal, tx);
}

function buildNewTypeProposal(input: {
  proposalId: string;
  evidenceId: string;
  node: OntologyNode;
  context: ConceptualizeSaveContext;
  reason: string | null;
  now: number;
}): ProfileChangeProposal {
  const targetIsBranch = input.context.proposalTarget.kind === 'profile_branch';
  return {
    id: input.proposalId,
    proposalKind: 'ontology_node_patch',
    sourceKind: 'user',
    baseProfileId: input.context.profile.id,
    sourceBranchId: targetIsBranch ? input.context.proposalTarget.branchId ?? null : null,
    target: input.context.proposalTarget,
    evidenceIds: [input.evidenceId],
    patch: {
      addOntologyNodes: [input.node],
      addItemTypeNodeIds: [input.node.id],
    },
    title: `Add ${input.node.label} type`,
    summary: `Create ${input.node.label} as an item type from Conceptualize correction.`,
    reason: input.reason ?? 'The user created this type while correcting a Conceptualize draft.',
    riskScore: targetIsBranch ? 25 : 70,
    semanticConfidence: null,
    userFitConfidence: 1,
    status: 'pending',
    supersededByProposalId: null,
    createdAt: input.now,
    updatedAt: input.now,
    reviewedAt: null,
    appliedAt: null,
  };
}

function withConceptHintType(
  candidate: SaveModalCandidateData,
  typeNodeId: string,
  clearLink: boolean,
): SaveModalCandidateData {
  const conceptHint = candidate.conceptHint ?? createFallbackConceptHint(candidate, typeNodeId);
  return {
    ...candidate,
    linkedConceptId: clearLink ? null : candidate.linkedConceptId,
    linkedConceptName: clearLink ? null : candidate.linkedConceptName,
    linkedConceptLanguages: clearLink ? null : candidate.linkedConceptLanguages,
    matchSimilarity: clearLink ? null : candidate.matchSimilarity,
    isNewLanguageForExistingConcept: clearLink ? false : candidate.isNewLanguageForExistingConcept,
    conceptHint: {
      ...conceptHint,
      proposedConceptType: typeNodeId,
      linkedConceptId: clearLink ? null : conceptHint.linkedConceptId,
      linkedConceptName: clearLink ? null : conceptHint.linkedConceptName,
      linkedConceptLanguages: clearLink ? null : conceptHint.linkedConceptLanguages,
      isNewLanguageForExistingConcept: clearLink ? false : conceptHint.isNewLanguageForExistingConcept,
    },
  };
}

function createFallbackConceptHint(
  candidate: SaveModalCandidateData,
  typeNodeId: string,
): ConceptHint {
  return {
    proposedName: candidate.title,
    proposedNormalizedKey: normalizeConceptKey(candidate.title),
    proposedConceptType: typeNodeId,
    extractionConfidence: candidate.extractionConfidence ?? 0,
    linkedConceptId: null,
    linkedConceptName: null,
    linkedConceptLanguages: null,
    isNewLanguageForExistingConcept: false,
  };
}

function buildProposedTypeNode(input: {
  label: string;
  parentTypeNodeId: string | null;
  previousTypeNodeId: string | null;
  reason: string | null;
  profile: DomainProfile;
  now: number;
}): OntologyNode {
  const id = makeTypeNodeId(input.label);
  const parentId = input.parentTypeNodeId && input.profile.ontology.itemTypeNodeIds.includes(input.parentTypeNodeId)
    ? input.parentTypeNodeId
    : null;
  const previousLabel = input.previousTypeNodeId
    ? getOntologyNodeLabel(input.previousTypeNodeId, input.profile)
    : null;

  return {
    id,
    label: input.label,
    kind: parentId ? 'subcategory' : 'category',
    parentId,
    meaning: input.reason ?? `User-created item type for ${input.label}.`,
    useWhen: [input.reason ?? `Use when an item belongs to ${input.label}.`],
    doNotUseWhen: previousLabel && input.previousTypeNodeId
      ? [{
          id: `boundary_${id}_not_${input.previousTypeNodeId}`,
          text: `Do not classify as ${previousLabel} when the user means ${input.label}.`,
          preferNodeId: id,
          source: 'user_correction',
          evidenceIds: [],
        }]
      : [],
    examples: [],
    relatedNodeIds: parentId ? [parentId] : [],
    contrastNodeIds: input.previousTypeNodeId ? [input.previousTypeNodeId] : [],
    status: 'suggested',
    createdBy: 'user',
    createdAt: input.now,
    updatedAt: input.now,
  };
}

function makeTypeNodeId(label: string): string {
  const normalized = label
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!normalized) {
    throw new Error('New type label must contain at least one letter or number');
  }
  return normalized;
}

function assertKnownTypeNode(profile: DomainProfile, typeNodeId: string): void {
  if (!profile.ontology.itemTypeNodeIds.includes(typeNodeId)) {
    throw new Error(`Unknown type node id: ${typeNodeId}`);
  }
}

function normalizeNullableText(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}
