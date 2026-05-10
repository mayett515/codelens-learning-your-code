import { eq } from 'drizzle-orm';
import { db, type DbOrTx } from '../../../db/client';
import { profileSelections } from './schema';
import { rowToProjectProfileSelection, projectProfileSelectionToRow } from '../codecs/profileSelection';
import type { ProjectProfileSelection } from '../types';

export async function insertProjectProfileSelection(
  record: ProjectProfileSelection,
  executor: DbOrTx = db,
): Promise<void> {
  await executor.insert(profileSelections).values(projectProfileSelectionToRow(record));
}

export async function upsertProjectProfileSelection(
  record: ProjectProfileSelection,
  executor: DbOrTx = db,
): Promise<void> {
  const row = projectProfileSelectionToRow(record);
  await executor
    .insert(profileSelections)
    .values(row)
    .onConflictDoUpdate({
      target: profileSelections.projectId,
      set: {
        id: row.id,
        baseProfileId: row.baseProfileId,
        projectBranchIdsJson: row.projectBranchIdsJson,
        learningBranchIdsJson: row.learningBranchIdsJson,
        personalBranchIdsJson: row.personalBranchIdsJson,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
    });
}

export async function getProjectProfileSelectionById(
  id: string,
  executor: DbOrTx = db,
): Promise<ProjectProfileSelection | undefined> {
  const rows = await executor.select().from(profileSelections).where(eq(profileSelections.id, id));
  return rows[0] ? rowToProjectProfileSelection(rows[0]) : undefined;
}

export async function getProjectProfileSelectionByProjectId(
  projectId: string,
  executor: DbOrTx = db,
): Promise<ProjectProfileSelection | undefined> {
  const rows = await executor
    .select()
    .from(profileSelections)
    .where(eq(profileSelections.projectId, projectId));
  return rows[0] ? rowToProjectProfileSelection(rows[0]) : undefined;
}

export async function deleteProjectProfileSelectionForProject(
  projectId: string,
  executor: DbOrTx = db,
): Promise<void> {
  await executor.delete(profileSelections).where(eq(profileSelections.projectId, projectId));
}
