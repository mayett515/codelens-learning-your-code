import { asc, eq, inArray } from 'drizzle-orm';
import { db, type DbOrTx } from '../../../db/client';
import { profileDefinitions } from './schema';
import { rowToProfileDefinition, profileDefinitionToRow } from '../codecs/profileDefinition';
import type { ProfileDefinition } from '../types';

export async function insertProfileDefinition(
  def: ProfileDefinition,
  executor: DbOrTx = db,
): Promise<void> {
  await executor.insert(profileDefinitions).values(profileDefinitionToRow(def));
}

export async function upsertProfileDefinition(
  def: ProfileDefinition,
  executor: DbOrTx = db,
): Promise<void> {
  const row = profileDefinitionToRow(def);
  await executor
    .insert(profileDefinitions)
    .values(row)
    .onConflictDoUpdate({
      target: profileDefinitions.id,
      set: {
        label: row.label,
        description: row.description,
        version: row.version,
        sourceKind: row.sourceKind,
        profileJson: row.profileJson,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
    });
}

export async function getProfileDefinitionById(
  id: string,
  executor: DbOrTx = db,
): Promise<ProfileDefinition | undefined> {
  const rows = await executor.select().from(profileDefinitions).where(eq(profileDefinitions.id, id));
  return rows[0] ? rowToProfileDefinition(rows[0]) : undefined;
}

export async function getProfileDefinitionsByIds(
  ids: readonly string[],
  executor: DbOrTx = db,
): Promise<ProfileDefinition[]> {
  if (ids.length === 0) return [];
  const rows = await executor
    .select()
    .from(profileDefinitions)
    .where(inArray(profileDefinitions.id, [...new Set(ids)]));

  const byId = new Map<string, typeof profileDefinitions.$inferSelect>();
  for (const row of rows) {
    byId.set(row.id, row);
  }

  const result: ProfileDefinition[] = [];
  for (const id of ids) {
    const row = byId.get(id);
    if (row) {
      result.push(rowToProfileDefinition(row));
    }
  }
  return result;
}

export async function listProfileDefinitions(
  executor: DbOrTx = db,
): Promise<ProfileDefinition[]> {
  const rows = await executor
    .select()
    .from(profileDefinitions)
    .orderBy(asc(profileDefinitions.id));
  return rows.map(rowToProfileDefinition);
}

export async function deleteProfileDefinition(
  id: string,
  executor: DbOrTx = db,
): Promise<void> {
  await executor.delete(profileDefinitions).where(eq(profileDefinitions.id, id));
}
