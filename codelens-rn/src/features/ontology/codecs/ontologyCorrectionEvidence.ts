import { z } from 'zod';
import type {
  OntologyCorrectionActiveSelectionSnapshot,
  OntologyCorrectionEvidence,
} from '../types';
import type { ontologyCorrectionEvidence } from '../data/schema';

const BranchIdArraySchema = z.array(z.string().min(1));

const ActiveSelectionSnapshotSchema = z
  .object({
    baseProfileId: z.string().min(1),
    projectBranchIds: BranchIdArraySchema.optional(),
    learningBranchIds: BranchIdArraySchema.optional(),
    personalBranchIds: BranchIdArraySchema.optional(),
  })
  .strict();

const OntologyCorrectionEvidenceSchema = z
  .object({
    id: z.string().min(1),
    profileId: z.string().min(1),
    activeSelectionSnapshot: ActiveSelectionSnapshotSchema,
    subjectKind: z.enum(['capture', 'item']),
    subjectId: z.string().min(1),
    field: z.literal('typeNodeId'),
    previousTypeNodeId: z.string().min(1).nullable(),
    correctedTypeNodeId: z.string().min(1),
    reason: z.string().nullable().optional(),
    source: z.literal('user'),
    createdAt: z.number().int().nonnegative(),
  })
  .strict()
  .superRefine((evidence, ctx) => {
    if (evidence.profileId !== evidence.activeSelectionSnapshot.baseProfileId) {
      ctx.addIssue({
        code: 'custom',
        message: 'profileId must match activeSelectionSnapshot.baseProfileId',
        path: ['activeSelectionSnapshot', 'baseProfileId'],
      });
    }
    if (evidence.previousTypeNodeId === evidence.correctedTypeNodeId) {
      ctx.addIssue({
        code: 'custom',
        message: 'previousTypeNodeId and correctedTypeNodeId must differ',
        path: ['correctedTypeNodeId'],
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

export function parseActiveSelectionSnapshot(
  raw: unknown,
): OntologyCorrectionActiveSelectionSnapshot {
  return ActiveSelectionSnapshotSchema.parse(
    parseJsonColumn(raw, 'active_selection_snapshot_json'),
  ) as OntologyCorrectionActiveSelectionSnapshot;
}

export function validateOntologyCorrectionEvidenceForWrite(
  raw: unknown,
): OntologyCorrectionEvidence {
  return OntologyCorrectionEvidenceSchema.parse(raw) as OntologyCorrectionEvidence;
}

export function rowToOntologyCorrectionEvidence(
  row: typeof ontologyCorrectionEvidence.$inferSelect,
): OntologyCorrectionEvidence {
  return validateOntologyCorrectionEvidenceForWrite({
    id: row.id,
    profileId: row.profileId,
    activeSelectionSnapshot: parseActiveSelectionSnapshot(row.activeSelectionSnapshotJson),
    subjectKind: row.subjectKind,
    subjectId: row.subjectId,
    field: row.field,
    previousTypeNodeId: row.previousTypeNodeId,
    correctedTypeNodeId: row.correctedTypeNodeId,
    reason: row.reason,
    source: row.source,
    createdAt: row.createdAt,
  });
}

export function ontologyCorrectionEvidenceToRow(
  evidence: OntologyCorrectionEvidence,
): typeof ontologyCorrectionEvidence.$inferInsert {
  const validated = validateOntologyCorrectionEvidenceForWrite(evidence);
  return {
    id: validated.id,
    profileId: validated.profileId,
    activeSelectionSnapshotJson: validated.activeSelectionSnapshot,
    subjectKind: validated.subjectKind,
    subjectId: validated.subjectId,
    field: validated.field,
    previousTypeNodeId: validated.previousTypeNodeId,
    correctedTypeNodeId: validated.correctedTypeNodeId,
    reason: validated.reason ?? null,
    source: validated.source,
    createdAt: validated.createdAt,
  };
}
