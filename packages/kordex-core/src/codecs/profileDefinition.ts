import { z } from 'zod';
import { LearningProfileExtensionSchema } from '../extensions/learningProfileSchema';
import type { LearningProfileDefinition } from '../extensions/learningProfile';
import type {
  ProfileDefinition,
} from '../types';
import { OntologyNodeSchema } from './profileBranch';

// ---------------------------------------------------------------------------
// Zod schemas for DomainProfile sub-shapes
// ---------------------------------------------------------------------------

const OntologyProfileSchema = z
  .object({
    nodes: z.array(OntologyNodeSchema),
    itemTypeNodeIds: z.array(z.string().min(1)),
    relationshipTypeNodeIds: z.array(z.string().min(1)),
  })
  .strict();

const DomainProfileSchema = z
  .object({
    id: z.string().min(1),
    version: z.number().int().nonnegative(),
    label: z.string(),
    description: z.string(),
    ontology: OntologyProfileSchema,
  })
  .strict();

const ProfileDefinitionSourceKindEnum = z.enum(['built_in', 'user', 'imported', 'adapter']);

const DefinitionFieldsSchema = z
  .object({
    id: z.string().min(1),
    label: z.string(),
    description: z.string(),
    version: z.number().int().nonnegative(),
    sourceKind: ProfileDefinitionSourceKindEnum,
    createdAt: z.number().int().nonnegative(),
    updatedAt: z.number().int().nonnegative(),
  })
  .strict();

// The package can read either established full learning profiles or bare semantic
// profiles. Strict branches reject incomplete extensions and unknown keys.
export const LearningProfileDefinitionSchema = DefinitionFieldsSchema.extend({
  profile: DomainProfileSchema.extend(LearningProfileExtensionSchema.shape),
});
export const ProfileDefinitionSchema = z.union([
  DefinitionFieldsSchema.extend({ profile: DomainProfileSchema }),
  LearningProfileDefinitionSchema,
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function parseProfileJson(raw: unknown): unknown {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch (cause) {
      throw new Error('Invalid JSON in profile_json', { cause });
    }
  }
  return raw;
}

export function validateDefinitionProfileMatch(def: ProfileDefinition): void {
  const p = def.profile;
  if (def.id !== p.id) {
    throw new Error(
      `Profile definition id mismatch: definition.id=${def.id}, profile.id=${p.id}`,
    );
  }
  if (def.label !== p.label) {
    throw new Error(
      `Profile definition label mismatch: definition.label=${def.label}, profile.label=${p.label}`,
    );
  }
  if (def.description !== p.description) {
    throw new Error(
      `Profile definition description mismatch: definition.description=${def.description}, profile.description=${p.description}`,
    );
  }
  if (def.version !== p.version) {
    throw new Error(
      `Profile definition version mismatch: definition.version=${def.version}, profile.version=${p.version}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validate and coerce a raw object into a domain ProfileDefinition.
 *
 * - Parses profile_json if it is a string.
 * - Validates the complete DomainProfile shape (strict: rejects unknown keys).
 * - Ensures top-level definition fields match the nested profile fields.
 */
function normalizeDefinitionJson(raw: unknown): unknown {
  if (raw !== null && typeof raw === 'object' && 'profile' in raw) {
    const profile = (raw as Record<string, unknown>)['profile'];
    if (typeof profile === 'string') {
      const cloned = { ...(raw as Record<string, unknown>), profile: parseProfileJson(profile) };
      return cloned;
    }
  }
  return raw;
}

export function validateProfileDefinition(raw: unknown): ProfileDefinition {
  const parsed = ProfileDefinitionSchema.parse(normalizeDefinitionJson(raw));
  validateDefinitionProfileMatch(parsed);
  return parsed;
}

export function validateLearningProfileDefinition(raw: unknown): LearningProfileDefinition {
  const parsed = LearningProfileDefinitionSchema.parse(normalizeDefinitionJson(raw));
  validateDefinitionProfileMatch(parsed);
  return parsed;
}
