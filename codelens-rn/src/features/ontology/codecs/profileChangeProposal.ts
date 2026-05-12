import { z } from 'zod';
import type {
  ProfileChangeProposal,
  ProfileChangeProposalStatus,
  ProfilePatch,
} from '../types';
import type { profileChangeProposals } from '../data/schema';
import { MetadataFieldSchema, OntologyNodeSchema } from './profileBranch';

const ProposalKindSchema = z.enum([
  'classification_patch',
  'ontology_node_patch',
  'relationship_patch',
  'branch_merge',
  'manual_draft',
]);

const SourceKindSchema = z.enum(['checker', 'model', 'user', 'system']);
const TargetKindSchema = z.enum(['base_profile', 'profile_branch']);
const StatusSchema = z.enum(['pending', 'accepted', 'rejected', 'postponed', 'superseded']);

const StringRecordSchema = z.record(z.string(), z.string());

const DomainLabelOverridesSchema = z
  .object({
    hubTitle: z.string().optional(),
    captureSingular: z.string().optional(),
    capturePlural: z.string().optional(),
    itemSingular: z.string().optional(),
    itemPlural: z.string().optional(),
    saveAction: z.string().optional(),
    reviewModeTitle: z.string().optional(),
    strengthLabel: z.string().optional(),
    bodyFieldLabel: z.string().optional(),
    contextFieldLabel: z.string().optional(),
    sourceFieldLabel: z.string().optional(),
    originSectionTitle: z.string().optional(),
    relationshipSectionTitle: z.string().optional(),
    reviewEntryText: z.string().optional(),
    conceptListTitle: z.string().optional(),
    conceptListSortLabel: z.string().optional(),
    conceptListEmptyLabel: z.string().optional(),
    flashback: z.object({
      bannerPrefix: z.string().optional(),
      fallbackTitle: z.string().optional(),
      noMetadataLabel: z.string().optional(),
      savedSectionTitle: z.string().optional(),
      emptyLabel: z.string().optional(),
      unknownDateLabel: z.string().optional(),
      conceptCountTemplate: z.string().optional(),
      conceptCountSingularLabel: z.string().optional(),
      conceptCountPluralLabel: z.string().optional(),
      captureCountTemplate: z.string().optional(),
      captureCountSingularLabel: z.string().optional(),
      captureCountPluralLabel: z.string().optional(),
    }).strict().optional(),
  })
  .strict();

const GraphProfileOverridesSchema = z
  .object({
    nodeColors: StringRecordSchema.optional(),
    relationshipLabels: StringRecordSchema.optional(),
    relationshipSectionLabels: StringRecordSchema.optional(),
    screenTitle: z.string().optional(),
    focusedScreenTitle: z.string().optional(),
    focusedViewLabel: z.string().optional(),
    fullViewLabel: z.string().optional(),
    emptyLabel: z.string().optional(),
    modeLabels: StringRecordSchema.optional(),
    statusLabels: z.object({
      loading: z.string().optional(),
      unavailable: z.string().optional(),
      retryAction: z.string().optional(),
      emptyBody: z.string().optional(),
      capBannerTemplate: z.string().optional(),
    }).strict().optional(),
    tooltipLabels: z.object({
      neverAccessed: z.string().optional(),
      lastAccessedTemplate: z.string().optional(),
      scoreTemplate: z.string().optional(),
      strengthTemplate: z.string().optional(),
      viewDetailAction: z.string().optional(),
      dayAgoTemplate: z.string().optional(),
      daySingularLabel: z.string().optional(),
      dayPluralLabel: z.string().optional(),
    }).strict().optional(),
    legendHelperLabels: z.object({
      title: z.string().optional(),
      recencyRecent: z.string().optional(),
      recencyModerate: z.string().optional(),
      recencyOld: z.string().optional(),
      recencyStale: z.string().optional(),
      strengthGradient: z.string().optional(),
      strengthSize: z.string().optional(),
    }).strict().optional(),
  })
  .strict();

const OntologyProfileOverrideSchema = z
  .object({
    nodes: z.array(OntologyNodeSchema).optional(),
    itemTypeNodeIds: z.array(z.string().min(1)).optional(),
    relationshipTypeNodeIds: z.array(z.string().min(1)).optional(),
  })
  .strict();

const ProfilePatchSchema = z
  .object({
    addOntologyNodes: z.array(OntologyNodeSchema).optional(),
    overrideOntologyNodes: z.array(OntologyNodeSchema).optional(),
    addItemTypeNodeIds: z.array(z.string().min(1)).optional(),
    addRelationshipTypeNodeIds: z.array(z.string().min(1)).optional(),
    overrideLabels: DomainLabelOverridesSchema.optional(),
    overrideMetadataFields: z.array(MetadataFieldSchema).optional(),
    overrideGraph: GraphProfileOverridesSchema.optional(),
    overrideOntology: OntologyProfileOverrideSchema.optional(),
  })
  .strict()
  .superRefine((patch, ctx) => {
    if (!hasPatchOperation(patch as Record<string, unknown>)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Profile change proposal patch must contain at least one operation',
      });
    }
  });

const ProposalTargetSchema = z
  .object({
    kind: TargetKindSchema,
    profileId: z.string().min(1).nullable().optional(),
    branchId: z.string().min(1).nullable().optional(),
  })
  .strict();

const ProfileChangeProposalSchema = z
  .object({
    id: z.string().min(1),
    proposalKind: ProposalKindSchema,
    sourceKind: SourceKindSchema,
    baseProfileId: z.string().min(1),
    sourceBranchId: z.string().min(1).nullable().optional(),
    target: ProposalTargetSchema,
    evidenceIds: z.array(z.string().min(1)),
    patch: ProfilePatchSchema,
    title: z.string().min(1),
    summary: z.string(),
    reason: z.string(),
    riskScore: z.number().min(0).max(100),
    semanticConfidence: z.number().min(0).max(1).nullable().optional(),
    userFitConfidence: z.number().min(0).max(1).nullable().optional(),
    status: StatusSchema,
    supersededByProposalId: z.string().min(1).nullable().optional(),
    createdAt: z.number().int().nonnegative(),
    updatedAt: z.number().int().nonnegative(),
    reviewedAt: z.number().int().nonnegative().nullable().optional(),
    appliedAt: z.number().int().nonnegative().nullable().optional(),
  })
  .strict()
  .superRefine((proposal, ctx) => {
    validateTargetShape(proposal.target, ctx);

    if (proposal.proposalKind === 'manual_draft' && proposal.sourceKind !== 'user') {
      ctx.addIssue({
        code: 'custom',
        message: 'Manual draft proposals must come from the user source kind',
        path: ['sourceKind'],
      });
    }

    if (proposal.proposalKind === 'branch_merge' && !proposal.sourceBranchId) {
      ctx.addIssue({
        code: 'custom',
        message: 'Branch merge proposals require a source branch id',
        path: ['sourceBranchId'],
      });
    }

    if (
      proposal.proposalKind !== 'manual_draft' &&
      proposal.sourceKind !== 'user' &&
      proposal.evidenceIds.length === 0 &&
      !proposal.sourceBranchId
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Non-manual model/checker/system proposals require evidence ids or a source branch id',
        path: ['evidenceIds'],
      });
    }

    if (proposal.status === 'superseded' && !proposal.supersededByProposalId) {
      ctx.addIssue({
        code: 'custom',
        message: 'Superseded proposals require supersededByProposalId',
        path: ['supersededByProposalId'],
      });
    }

    if (proposal.status === 'accepted' && proposal.reviewedAt == null) {
      ctx.addIssue({
        code: 'custom',
        message: 'Accepted proposals require reviewedAt',
        path: ['reviewedAt'],
      });
    }

    if (proposal.appliedAt != null && proposal.status !== 'accepted') {
      ctx.addIssue({
        code: 'custom',
        message: 'Only accepted proposals may be marked applied',
        path: ['appliedAt'],
      });
    }
  });

function parseJsonColumn(raw: unknown, columnName: string): unknown {
  if (typeof raw !== 'string') return raw;

  try {
    return JSON.parse(raw);
  } catch (cause) {
    throw new Error(`Invalid JSON in ${columnName}`, { cause });
  }
}

function hasObjectKeys(value: unknown): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length > 0;
}

function arrayLength(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function hasPatchOperation(patch: Record<string, unknown>): boolean {
  return (
    arrayLength(patch['addOntologyNodes']) > 0 ||
    arrayLength(patch['overrideOntologyNodes']) > 0 ||
    arrayLength(patch['addItemTypeNodeIds']) > 0 ||
    arrayLength(patch['addRelationshipTypeNodeIds']) > 0 ||
    arrayLength(patch['overrideMetadataFields']) > 0 ||
    hasObjectKeys(patch['overrideLabels']) ||
    hasObjectKeys(patch['overrideGraph']) ||
    hasObjectKeys(patch['overrideOntology'])
  );
}

function hasValue(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.length > 0;
}

function validateTargetShape(
  target: z.infer<typeof ProposalTargetSchema>,
  ctx: z.RefinementCtx,
): void {
  if (target.kind === 'base_profile') {
    if (!hasValue(target.profileId) || (target.branchId !== undefined && target.branchId !== null)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Base-profile proposals require profileId and must not set branchId',
        path: ['target'],
      });
    }
    return;
  }

  if (!hasValue(target.branchId) || (target.profileId !== undefined && target.profileId !== null)) {
    ctx.addIssue({
      code: 'custom',
      message: 'Profile-branch proposals require branchId and must not set profileId',
      path: ['target'],
    });
  }
}

export function parseProfilePatch(raw: unknown): ProfilePatch {
  return ProfilePatchSchema.parse(parseJsonColumn(raw, 'patch_json')) as unknown as ProfilePatch;
}

export function parseProposalEvidenceIds(raw: unknown): string[] {
  return z.array(z.string().min(1)).parse(parseJsonColumn(raw, 'evidence_ids_json'));
}

export function validateProfileChangeProposal(raw: unknown): ProfileChangeProposal {
  return ProfileChangeProposalSchema.parse(raw) as unknown as ProfileChangeProposal;
}

export function rowToProfileChangeProposal(
  row: typeof profileChangeProposals.$inferSelect,
): ProfileChangeProposal {
  return validateProfileChangeProposal({
    id: row.id,
    proposalKind: row.proposalKind,
    sourceKind: row.sourceKind,
    baseProfileId: row.baseProfileId,
    sourceBranchId: row.sourceBranchId,
    target: {
      kind: row.targetKind,
      profileId: row.targetProfileId,
      branchId: row.targetBranchId,
    },
    evidenceIds: parseProposalEvidenceIds(row.evidenceIdsJson),
    patch: parseProfilePatch(row.patchJson),
    title: row.title,
    summary: row.summary,
    reason: row.reason,
    riskScore: row.riskScore,
    semanticConfidence: row.semanticConfidence,
    userFitConfidence: row.userFitConfidence,
    status: row.status,
    supersededByProposalId: row.supersededByProposalId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    reviewedAt: row.reviewedAt,
    appliedAt: row.appliedAt,
  });
}

export function profileChangeProposalToRow(
  proposal: ProfileChangeProposal,
): typeof profileChangeProposals.$inferInsert {
  const parsed = validateProfileChangeProposal(proposal);
  return {
    id: parsed.id,
    proposalKind: parsed.proposalKind,
    sourceKind: parsed.sourceKind,
    baseProfileId: parsed.baseProfileId,
    sourceBranchId: parsed.sourceBranchId ?? null,
    targetKind: parsed.target.kind,
    targetProfileId: parsed.target.kind === 'base_profile' ? parsed.target.profileId ?? null : null,
    targetBranchId: parsed.target.kind === 'profile_branch' ? parsed.target.branchId ?? null : null,
    evidenceIdsJson: [...parsed.evidenceIds],
    patchJson: parsed.patch,
    title: parsed.title,
    summary: parsed.summary,
    reason: parsed.reason,
    riskScore: parsed.riskScore,
    semanticConfidence: parsed.semanticConfidence ?? null,
    userFitConfidence: parsed.userFitConfidence ?? null,
    status: parsed.status,
    supersededByProposalId: parsed.supersededByProposalId ?? null,
    createdAt: parsed.createdAt,
    updatedAt: parsed.updatedAt,
    reviewedAt: parsed.reviewedAt ?? null,
    appliedAt: parsed.appliedAt ?? null,
  };
}

export function isTerminalProposalStatus(status: ProfileChangeProposalStatus): boolean {
  return status === 'accepted' || status === 'rejected' || status === 'superseded';
}
