import type { ProjectProfileSelection, ProfileSelection } from '../types';
import type { profileSelections } from '../data/schema';
import { validateBranchIds, validateProjectProfileSelection } from '@kordex/core/codecs/profileSelection';

export * from '@kordex/core/codecs/profileSelection';


export function rowToProjectProfileSelection(
  row: typeof profileSelections.$inferSelect,
): ProjectProfileSelection {
  const projectBranchIds = validateBranchIds(row.projectBranchIdsJson);
  const learningBranchIds = validateBranchIds(row.learningBranchIdsJson);
  const personalBranchIds = validateBranchIds(row.personalBranchIdsJson);
  const selection: ProfileSelection = {
    baseProfileId: row.baseProfileId,
  };

  if (projectBranchIds.length > 0) {
    selection.projectBranchIds = projectBranchIds;
  }
  if (learningBranchIds.length > 0) {
    selection.learningBranchIds = learningBranchIds;
  }
  if (personalBranchIds.length > 0) {
    selection.personalBranchIds = personalBranchIds;
  }

  return validateProjectProfileSelection({
    id: row.id,
    projectId: row.projectId,
    selection,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}


export function projectProfileSelectionToRow(
  record: ProjectProfileSelection,
): typeof profileSelections.$inferInsert {
  const validated = validateProjectProfileSelection(record);
  const sel = validated.selection;

  return {
    id: validated.id,
    projectId: validated.projectId,
    baseProfileId: sel.baseProfileId,
    projectBranchIdsJson: [...(sel.projectBranchIds ?? [])],
    learningBranchIdsJson: [...(sel.learningBranchIds ?? [])],
    personalBranchIdsJson: [...(sel.personalBranchIds ?? [])],
    createdAt: validated.createdAt,
    updatedAt: validated.updatedAt,
  };
}
