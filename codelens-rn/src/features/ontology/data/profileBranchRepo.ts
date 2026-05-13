import { and, asc, eq, inArray } from 'drizzle-orm';
import { db, type DbOrTx } from '../../../db/client';
import { profileBranches } from './schema';
import { rowToProfileBranch, profileBranchToRow } from '../codecs/profileBranch';
import type { ProfileBranch } from '../types';

export async function insertProfileBranch(
  branch: ProfileBranch,
  executor: DbOrTx = db,
): Promise<void> {
  await executor.insert(profileBranches).values(profileBranchToRow(branch));
}

export async function upsertProfileBranch(
  branch: ProfileBranch,
  executor: DbOrTx = db,
): Promise<void> {
  const row = profileBranchToRow(branch);
  await executor
    .insert(profileBranches)
    .values(row)
    .onConflictDoUpdate({
      target: profileBranches.id,
      set: {
        parentProfileId: row.parentProfileId,
        branchKind: row.branchKind,
        name: row.name,
        overlayJson: row.overlayJson,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
    });
}

export async function updateProfileBranchIfUnchanged(
  branch: ProfileBranch,
  expectedUpdatedAt: number,
  executor: DbOrTx = db,
): Promise<boolean> {
  const row = profileBranchToRow(branch);
  const result = await executor
    .update(profileBranches)
    .set({
      parentProfileId: row.parentProfileId,
      branchKind: row.branchKind,
      name: row.name,
      overlayJson: row.overlayJson,
      updatedAt: row.updatedAt,
    })
    .where(and(
      eq(profileBranches.id, row.id),
      eq(profileBranches.updatedAt, expectedUpdatedAt),
    ));

  const affectedRows = getAffectedRows(result);
  // Conditional writes must fail closed if a future driver stops exposing
  // affected-row counts; guessing success would mask write conflicts.
  return affectedRows !== undefined ? affectedRows > 0 : false;
}

export async function getProfileBranchById(
  id: string,
  executor: DbOrTx = db,
): Promise<ProfileBranch | undefined> {
  const rows = await executor.select().from(profileBranches).where(eq(profileBranches.id, id));
  return rows[0] ? rowToProfileBranch(rows[0]) : undefined;
}

export async function getProfileBranchesByIds(
  ids: readonly string[],
  executor: DbOrTx = db,
): Promise<ProfileBranch[]> {
  if (ids.length === 0) return [];
  const rows = await executor
    .select()
    .from(profileBranches)
    .where(inArray(profileBranches.id, [...new Set(ids)]));

  const byId = new Map<string, typeof profileBranches.$inferSelect>();
  for (const row of rows) {
    byId.set(row.id, row);
  }

  const result: ProfileBranch[] = [];
  for (const id of ids) {
    const row = byId.get(id);
    if (row) {
      result.push(rowToProfileBranch(row));
    }
  }
  return result;
}

export async function listProfileBranchesForParent(
  parentProfileId: string,
  executor: DbOrTx = db,
): Promise<ProfileBranch[]> {
  const rows = await executor
    .select()
    .from(profileBranches)
    .where(eq(profileBranches.parentProfileId, parentProfileId))
    .orderBy(
      asc(profileBranches.branchKind),
      asc(profileBranches.createdAt),
      asc(profileBranches.id),
    );
  return rows.map(rowToProfileBranch);
}

export async function deleteProfileBranch(
  id: string,
  executor: DbOrTx = db,
): Promise<void> {
  await executor.delete(profileBranches).where(eq(profileBranches.id, id));
}

function getAffectedRows(result: unknown): number | undefined {
  if (!result || typeof result !== 'object') return undefined;
  const record = result as Record<string, unknown>;
  if (typeof record['rowsAffected'] === 'number') return record['rowsAffected'];
  if (typeof record['changes'] === 'number') return record['changes'];
  return undefined;
}
