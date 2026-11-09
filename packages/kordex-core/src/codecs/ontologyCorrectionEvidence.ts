import { z } from 'zod';
import type {
  OntologyCorrectionActiveSelectionSnapshot,
  OntologyCorrectionEvidence,
} from '../types';

const BranchIdArraySchema = z.array(z.string().min(1));

const ActiveSelectionSnapshotSchema = z
  .object({
    baseProfileId: z.string().min(1),
    projectBranchIds: BranchIdArraySchema.optional(),
    learningBranchIds: BranchIdArraySchema.optional(),
    personalBranchIds: BranchIdArraySchema.optional(),
  })
  .strict();

const NearMissCandidateSchema = z
  .object({
    scopeId: z.string().min(1),
    nodeId: z.string().min(1),
    rank: z.number().int().min(2),
    score: z.number().min(0).max(1).nullable().optional(),
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
    rawProposedTypeNodeId: z.string().min(1).nullable().optional(),
    nearMissCandidates: z.array(NearMissCandidateSchema).nullable().optional(),
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

export function parseJsonColumn(raw: unknown, columnName: string): unknown {
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
