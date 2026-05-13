import { asc, eq } from 'drizzle-orm';
import { db, type DbOrTx } from '../../../db/client';
import {
  profileProposalEventToRow,
  rowToProfileProposalEvent,
} from '../codecs/profileProposalEvent';
import type { ProfileProposalEvent } from '../types';
import { profileProposalEvents } from './schema';

export async function insertProfileProposalEvent(
  event: ProfileProposalEvent,
  executor: DbOrTx = db,
): Promise<void> {
  await executor.insert(profileProposalEvents).values(profileProposalEventToRow(event));
}

export async function getProfileProposalEventById(
  id: string,
  executor: DbOrTx = db,
): Promise<ProfileProposalEvent | undefined> {
  const rows = await executor
    .select()
    .from(profileProposalEvents)
    .where(eq(profileProposalEvents.id, id));
  return rows[0] ? rowToProfileProposalEvent(rows[0]) : undefined;
}

export async function listProfileProposalEventsForProposal(
  proposalId: string,
  executor: DbOrTx = db,
): Promise<ProfileProposalEvent[]> {
  const rows = await executor
    .select()
    .from(profileProposalEvents)
    .where(eq(profileProposalEvents.proposalId, proposalId))
    .orderBy(asc(profileProposalEvents.createdAt), asc(profileProposalEvents.id));
  return rows.map(rowToProfileProposalEvent);
}

export async function listProfileProposalEventsForBaseProfile(
  baseProfileId: string,
  executor: DbOrTx = db,
): Promise<ProfileProposalEvent[]> {
  const rows = await executor
    .select()
    .from(profileProposalEvents)
    .where(eq(profileProposalEvents.baseProfileId, baseProfileId))
    .orderBy(asc(profileProposalEvents.createdAt), asc(profileProposalEvents.id));
  return rows.map(rowToProfileProposalEvent);
}

export async function listProfileProposalEventsForTargetBranch(
  branchId: string,
  executor: DbOrTx = db,
): Promise<ProfileProposalEvent[]> {
  const rows = await executor
    .select()
    .from(profileProposalEvents)
    .where(eq(profileProposalEvents.targetBranchId, branchId))
    .orderBy(asc(profileProposalEvents.createdAt), asc(profileProposalEvents.id));
  return rows.map(rowToProfileProposalEvent);
}
