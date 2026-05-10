import { z } from 'zod';
import type { ProjectProfileSelection, ProfileSelection } from '../types';
import type { profileSelections } from '../data/schema';

const StringIdArraySchema = z.array(z.string().min(1));

const ProfileSelectionSchema = z
  .object({
    id: z.string().min(1).optional(),
    baseProfileId: z.string().min(1),
    projectBranchIds: StringIdArraySchema.optional(),
    learningBranchIds: StringIdArraySchema.optional(),
    personalBranchIds: StringIdArraySchema.optional(),
  })
  .strict();

const ProjectProfileSelectionSchema = z
  .object({
    id: z.string().min(1),
    projectId: z.string().min(1),
    selection: ProfileSelectionSchema,
    createdAt: z.number().int().nonnegative(),
    updatedAt: z.number().int().nonnegative(),
  })
  .strict();

function parseBranchIdsJson(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw;
  }

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        throw new Error('Branch id JSON must decode to an array');
      }
      return parsed;
    } catch (cause) {
      if (cause instanceof Error && cause.message.includes('must decode')) {
        throw cause;
      }
      throw new Error('Invalid JSON in branch id column', { cause });
    }
  }

  throw new Error('Branch id field must be an array or a JSON string');
}

function validateBranchIds(value: unknown): string[] {
  return StringIdArraySchema.parse(parseBranchIdsJson(value));
}

function normalizeSelection(raw: unknown): ProfileSelection {
  if (raw === null || typeof raw !== 'object') {
    throw new Error('Profile selection must be an object');
  }

  const rec = raw as Record<string, unknown>;
  const selection: ProfileSelection = {
    baseProfileId: z.string().min(1).parse(rec['baseProfileId']),
  };

  if ('id' in rec && rec['id'] !== undefined) {
    selection.id = z.string().min(1).parse(rec['id']);
  }
  if ('projectBranchIds' in rec && rec['projectBranchIds'] !== undefined) {
    selection.projectBranchIds = validateBranchIds(rec['projectBranchIds']);
  }
  if ('learningBranchIds' in rec && rec['learningBranchIds'] !== undefined) {
    selection.learningBranchIds = validateBranchIds(rec['learningBranchIds']);
  }
  if ('personalBranchIds' in rec && rec['personalBranchIds'] !== undefined) {
    selection.personalBranchIds = validateBranchIds(rec['personalBranchIds']);
  }

  return ProfileSelectionSchema.parse(selection) as unknown as ProfileSelection;
}

export function validateProjectProfileSelection(raw: unknown): ProjectProfileSelection {
  if (raw === null || typeof raw !== 'object') {
    throw new Error('Project profile selection must be an object');
  }

  const rec = raw as Record<string, unknown>;
  const parsed: ProjectProfileSelection = {
    id: z.string().min(1).parse(rec['id']),
    projectId: z.string().min(1).parse(rec['projectId']),
    selection: normalizeSelection(rec['selection']),
    createdAt: z.number().int().nonnegative().parse(rec['createdAt']),
    updatedAt: z.number().int().nonnegative().parse(rec['updatedAt']),
  };

  return ProjectProfileSelectionSchema.parse(parsed) as unknown as ProjectProfileSelection;
}

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
