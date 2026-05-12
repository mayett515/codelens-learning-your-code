import { and, asc, eq } from 'drizzle-orm';
import { db, type DbOrTx } from '../../../db/client';
import { ontologyCorrectionEvidence } from './schema';
import {
  ontologyCorrectionEvidenceToRow,
  rowToOntologyCorrectionEvidence,
} from '../codecs/ontologyCorrectionEvidence';
import type { OntologyCorrectionEvidence, OntologyCorrectionSubjectKind } from '../types';

export async function insertOntologyCorrectionEvidence(
  evidence: OntologyCorrectionEvidence,
  executor: DbOrTx = db,
): Promise<void> {
  await executor.insert(ontologyCorrectionEvidence).values(ontologyCorrectionEvidenceToRow(evidence));
}

export async function getOntologyCorrectionEvidenceById(
  id: string,
  executor: DbOrTx = db,
): Promise<OntologyCorrectionEvidence | undefined> {
  const rows = await executor
    .select()
    .from(ontologyCorrectionEvidence)
    .where(eq(ontologyCorrectionEvidence.id, id));
  return rows[0] ? rowToOntologyCorrectionEvidence(rows[0]) : undefined;
}

export async function listOntologyCorrectionEvidenceForProfile(
  profileId: string,
  executor: DbOrTx = db,
): Promise<OntologyCorrectionEvidence[]> {
  const rows = await executor
    .select()
    .from(ontologyCorrectionEvidence)
    .where(eq(ontologyCorrectionEvidence.profileId, profileId))
    .orderBy(asc(ontologyCorrectionEvidence.createdAt), asc(ontologyCorrectionEvidence.id));
  return rows.map(rowToOntologyCorrectionEvidence);
}

export async function listOntologyCorrectionEvidenceForSubject(
  subjectKind: OntologyCorrectionSubjectKind,
  subjectId: string,
  executor: DbOrTx = db,
): Promise<OntologyCorrectionEvidence[]> {
  const rows = await executor
    .select()
    .from(ontologyCorrectionEvidence)
    .where(and(
      eq(ontologyCorrectionEvidence.subjectKind, subjectKind),
      eq(ontologyCorrectionEvidence.subjectId, subjectId),
    ))
    .orderBy(asc(ontologyCorrectionEvidence.createdAt), asc(ontologyCorrectionEvidence.id));
  return rows.map(rowToOntologyCorrectionEvidence);
}

export async function deleteOntologyCorrectionEvidence(
  id: string,
  executor: DbOrTx = db,
): Promise<void> {
  await executor.delete(ontologyCorrectionEvidence).where(eq(ontologyCorrectionEvidence.id, id));
}
