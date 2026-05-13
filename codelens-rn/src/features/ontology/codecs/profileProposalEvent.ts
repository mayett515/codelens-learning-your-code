import { z } from 'zod';
import type { profileProposalEvents } from '../data/schema';
import type { ProfileProposalEvent } from '../types';

const ProposalKindSchema = z.enum([
  'classification_patch',
  'ontology_node_patch',
  'relationship_patch',
  'branch_merge',
  'manual_draft',
]);

const ProposalStatusSchema = z.enum([
  'pending',
  'accepted',
  'rejected',
  'postponed',
  'superseded',
]);

const TargetKindSchema = z.enum(['base_profile', 'profile_branch']);

const ProposalTargetSchema = z
  .object({
    kind: TargetKindSchema,
    profileId: z.string().min(1).nullable().optional(),
    branchId: z.string().min(1).nullable().optional(),
  })
  .strict();

const DetailsSchema = z.record(z.string(), z.unknown());

const ProfileProposalEventSchema = z
  .object({
    id: z.string().min(1),
    proposalId: z.string().min(1),
    action: z.enum(['applied', 'rejected', 'postponed', 'asked_why']),
    actorKind: z.enum(['user', 'system', 'model']),
    actorId: z.string().min(1).nullable().optional(),
    baseProfileId: z.string().min(1),
    proposalKind: ProposalKindSchema,
    target: ProposalTargetSchema,
    statusBefore: ProposalStatusSchema,
    statusAfter: ProposalStatusSchema,
    proposalUpdatedAtBefore: z.number().int().nonnegative(),
    proposalUpdatedAtAfter: z.number().int().nonnegative(),
    branchUpdatedAtBefore: z.number().int().nonnegative().nullable().optional(),
    branchUpdatedAtAfter: z.number().int().nonnegative().nullable().optional(),
    reason: z.string().nullable().optional(),
    details: DetailsSchema.nullable().optional(),
    createdAt: z.number().int().nonnegative(),
  })
  .strict()
  .superRefine((event, ctx) => {
    validateTargetShape(event.target, ctx);

    if (event.proposalUpdatedAtAfter < event.proposalUpdatedAtBefore) {
      ctx.addIssue({
        code: 'custom',
        message: 'Proposal event after timestamp must not be older than before timestamp',
        path: ['proposalUpdatedAtAfter'],
      });
    }

    if (
      event.branchUpdatedAtBefore != null &&
      event.branchUpdatedAtAfter != null &&
      event.branchUpdatedAtAfter < event.branchUpdatedAtBefore
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Branch event after timestamp must not be older than before timestamp',
        path: ['branchUpdatedAtAfter'],
      });
    }

    if (event.action === 'applied' && event.statusAfter !== 'accepted') {
      ctx.addIssue({
        code: 'custom',
        message: 'Applied proposal events must transition to accepted status',
        path: ['statusAfter'],
      });
    }

    if (event.action === 'rejected' && event.statusAfter !== 'rejected') {
      ctx.addIssue({
        code: 'custom',
        message: 'Rejected proposal events must transition to rejected status',
        path: ['statusAfter'],
      });
    }

    if (event.action === 'postponed' && event.statusAfter !== 'postponed') {
      ctx.addIssue({
        code: 'custom',
        message: 'Postponed proposal events must transition to postponed status',
        path: ['statusAfter'],
      });
    }

    if (event.action !== 'asked_why' && event.statusBefore === event.statusAfter) {
      ctx.addIssue({
        code: 'custom',
        message: 'Proposal decision events must record a status transition',
        path: ['statusAfter'],
      });
    }
  });

function parseJsonColumn(raw: unknown, columnName: string): unknown {
  if (raw == null || typeof raw !== 'string') return raw;

  try {
    return JSON.parse(raw);
  } catch (cause) {
    throw new Error(`Invalid JSON in ${columnName}`, { cause });
  }
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
        message: 'Base-profile proposal events require profileId and must not set branchId',
        path: ['target'],
      });
    }
    return;
  }

  if (!hasValue(target.branchId) || (target.profileId !== undefined && target.profileId !== null)) {
    ctx.addIssue({
      code: 'custom',
      message: 'Profile-branch proposal events require branchId and must not set profileId',
      path: ['target'],
    });
  }
}

export function parseProfileProposalEventDetails(raw: unknown): Record<string, unknown> | null {
  const parsed = parseJsonColumn(raw, 'details_json');
  if (parsed == null) return null;
  return DetailsSchema.parse(parsed);
}

export function validateProfileProposalEvent(raw: unknown): ProfileProposalEvent {
  return ProfileProposalEventSchema.parse(raw) as ProfileProposalEvent;
}

export function rowToProfileProposalEvent(
  row: typeof profileProposalEvents.$inferSelect,
): ProfileProposalEvent {
  return validateProfileProposalEvent({
    id: row.id,
    proposalId: row.proposalId,
    action: row.action,
    actorKind: row.actorKind,
    actorId: row.actorId,
    baseProfileId: row.baseProfileId,
    proposalKind: row.proposalKind,
    target: {
      kind: row.targetKind,
      profileId: row.targetProfileId,
      branchId: row.targetBranchId,
    },
    statusBefore: row.statusBefore,
    statusAfter: row.statusAfter,
    proposalUpdatedAtBefore: row.proposalUpdatedAtBefore,
    proposalUpdatedAtAfter: row.proposalUpdatedAtAfter,
    branchUpdatedAtBefore: row.branchUpdatedAtBefore,
    branchUpdatedAtAfter: row.branchUpdatedAtAfter,
    reason: row.reason,
    details: parseProfileProposalEventDetails(row.detailsJson),
    createdAt: row.createdAt,
  });
}

export function profileProposalEventToRow(
  event: ProfileProposalEvent,
): typeof profileProposalEvents.$inferInsert {
  const parsed = validateProfileProposalEvent(event);
  return {
    id: parsed.id,
    proposalId: parsed.proposalId,
    action: parsed.action,
    actorKind: parsed.actorKind,
    actorId: parsed.actorId ?? null,
    baseProfileId: parsed.baseProfileId,
    proposalKind: parsed.proposalKind,
    targetKind: parsed.target.kind,
    targetProfileId: parsed.target.kind === 'base_profile' ? parsed.target.profileId ?? null : null,
    targetBranchId: parsed.target.kind === 'profile_branch' ? parsed.target.branchId ?? null : null,
    statusBefore: parsed.statusBefore,
    statusAfter: parsed.statusAfter,
    proposalUpdatedAtBefore: parsed.proposalUpdatedAtBefore,
    proposalUpdatedAtAfter: parsed.proposalUpdatedAtAfter,
    branchUpdatedAtBefore: parsed.branchUpdatedAtBefore ?? null,
    branchUpdatedAtAfter: parsed.branchUpdatedAtAfter ?? null,
    reason: parsed.reason ?? null,
    detailsJson: parsed.details ?? null,
    createdAt: parsed.createdAt,
  };
}
