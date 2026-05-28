import { desc, eq } from 'drizzle-orm';
import { db, type DbOrTx } from '../../../db/client';
import {
  rowToOntologyCorrectionEvidence,
} from '../codecs/ontologyCorrectionEvidence';
import {
  rowToProfileProposalEvent,
} from '../codecs/profileProposalEvent';
import type { OntologyCorrectionEvidence, ProfileProposalEvent } from '../types';
import { ontologyCorrectionEvidence, profileProposalEvents } from './schema';

export const DEFAULT_USER_FIT_CORRECTION_EVIDENCE_LIMIT = 500;
export const DEFAULT_USER_FIT_PROPOSAL_EVENT_LIMIT = 200;

export interface LoadUserFitProjectionFactsInput {
  baseProfileId: string;
  correctionEvidenceLimit?: number | undefined;
  proposalEventLimit?: number | undefined;
}

export interface UserFitProjectionFacts {
  correctionEvidence: readonly OntologyCorrectionEvidence[];
  proposalEvents: readonly ProfileProposalEvent[];
}

export async function loadUserFitProjectionFacts(
  input: LoadUserFitProjectionFactsInput,
  executor: DbOrTx = db,
): Promise<UserFitProjectionFacts> {
  const correctionEvidenceLimit = normalizeLimit(
    input.correctionEvidenceLimit,
    DEFAULT_USER_FIT_CORRECTION_EVIDENCE_LIMIT,
  );
  const proposalEventLimit = normalizeLimit(
    input.proposalEventLimit,
    DEFAULT_USER_FIT_PROPOSAL_EVENT_LIMIT,
  );

  const correctionEvidenceRows = await executor
    .select()
    .from(ontologyCorrectionEvidence)
    .where(eq(ontologyCorrectionEvidence.profileId, input.baseProfileId))
    .orderBy(
      desc(ontologyCorrectionEvidence.createdAt),
      desc(ontologyCorrectionEvidence.id),
    )
    .limit(correctionEvidenceLimit);

  const proposalEventRows = await executor
    .select()
    .from(profileProposalEvents)
    .where(eq(profileProposalEvents.baseProfileId, input.baseProfileId))
    .orderBy(
      desc(profileProposalEvents.createdAt),
      desc(profileProposalEvents.id),
    )
    .limit(proposalEventLimit);

  return {
    correctionEvidence: correctionEvidenceRows.map(rowToOntologyCorrectionEvidence),
    proposalEvents: proposalEventRows.map(rowToProfileProposalEvent),
  };
}

function normalizeLimit(value: number | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value));
}
