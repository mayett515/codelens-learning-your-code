import type { OntologyCorrectionEvidence } from '../types';
import type { ontologyCorrectionEvidence } from '../data/schema';
import { parseJsonColumn, parseActiveSelectionSnapshot, validateOntologyCorrectionEvidenceForWrite } from '@kordex/core/codecs/ontologyCorrectionEvidence';

export * from '@kordex/core/codecs/ontologyCorrectionEvidence';


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
    rawProposedTypeNodeId: row.rawProposedTypeNodeId,
    nearMissCandidates: parseJsonColumn(row.nearMissCandidatesJson, 'near_miss_candidates_json'),
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
    rawProposedTypeNodeId: validated.rawProposedTypeNodeId ?? null,
    nearMissCandidatesJson: validated.nearMissCandidates ?? null,
    reason: validated.reason ?? null,
    source: validated.source,
    createdAt: validated.createdAt,
  };
}
