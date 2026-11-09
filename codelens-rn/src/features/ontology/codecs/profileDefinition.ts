import type { ProfileDefinition, ProfileDefinitionSourceKind } from '../types';
import type { profileDefinitions } from '../data/schema';
import { ProfileDefinitionSchema, parseProfileJson, validateDefinitionProfileMatch } from '@kordex/core/codecs/profileDefinition';

export * from '@kordex/core/codecs/profileDefinition';


/**
 * Convert a DB row (from Drizzle or backup mapper) into a domain ProfileDefinition.
 *
 * The row may have profile_json as a string or already-parsed object.
 */
export function rowToProfileDefinition(
  row: typeof profileDefinitions.$inferSelect,
): ProfileDefinition {
  const profile = parseProfileJson(row.profileJson);
  const def = ProfileDefinitionSchema.parse({
    id: row.id,
    label: row.label,
    description: row.description,
    version: row.version,
    sourceKind: row.sourceKind,
    profile,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }) as unknown as ProfileDefinition;
  validateDefinitionProfileMatch(def);
  return def;
}


/**
 * Convert a domain ProfileDefinition into a Drizzle insert/update row.
 */
export function profileDefinitionToRow(
  def: ProfileDefinition,
): typeof profileDefinitions.$inferInsert {
  const parsed = ProfileDefinitionSchema.parse(def) as unknown as ProfileDefinition;
  validateDefinitionProfileMatch(parsed);
  return {
    id: parsed.id,
    label: parsed.label,
    description: parsed.description,
    version: parsed.version,
    sourceKind: parsed.sourceKind as ProfileDefinitionSourceKind,
    profileJson: parsed.profile,
    createdAt: parsed.createdAt,
    updatedAt: parsed.updatedAt,
  };
}
