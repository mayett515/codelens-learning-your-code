import type { ProfileBranch } from '../types';
import type { profileBranches } from '../data/schema';
import { ProfileBranchSchema, parseOverlayJson, validateKindMatch } from '@kordex/core/codecs/profileBranch';

export * from '@kordex/core/codecs/profileBranch';


/**
 * Convert a DB row (from Drizzle or backup mapper) into a domain ProfileBranch.
 *
 * The row may have overlay_json as a string or already-parsed object.
 */
export function rowToProfileBranch(
  row: typeof profileBranches.$inferSelect,
): ProfileBranch {
  const overlay = parseOverlayJson(row.overlayJson);
  const branch = ProfileBranchSchema.parse({
    id: row.id,
    parentProfileId: row.parentProfileId,
    branchKind: row.branchKind,
    name: row.name,
    overlay,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }) as unknown as ProfileBranch;
  validateKindMatch(branch);
  return branch;
}


/**
 * Convert a domain ProfileBranch into a Drizzle insert/update row.
 */
export function profileBranchToRow(
  branch: ProfileBranch,
): typeof profileBranches.$inferInsert {
  const parsed = ProfileBranchSchema.parse(branch) as unknown as ProfileBranch;
  validateKindMatch(parsed);
  return {
    id: parsed.id,
    parentProfileId: parsed.parentProfileId,
    branchKind: parsed.branchKind,
    name: parsed.name,
    overlayJson: parsed.overlay,
    createdAt: parsed.createdAt,
    updatedAt: parsed.updatedAt,
  };
}
