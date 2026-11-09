import { describe, expect, it } from 'vitest';
import { photographyProfile } from '../profiles/photographyProfile';
import { profileDefinitionToRow, rowToProfileDefinition } from '../codecs/profileDefinition';
import type { ProfileDefinition } from '../types';

describe('photography profile', () => {

  it('round-trips through the profile definition codec without losing identity', () => {
    const definition: ProfileDefinition = {
      id: photographyProfile.id,
      label: photographyProfile.label,
      description: photographyProfile.description,
      version: photographyProfile.version,
      sourceKind: 'built_in',
      profile: photographyProfile,
      createdAt: 0,
      updatedAt: 0,
    };

    const row = profileDefinitionToRow(definition);
    const parsed = rowToProfileDefinition(row as Parameters<typeof rowToProfileDefinition>[0]);

    expect(parsed.id).toBe('photography');
    expect(parsed.profile.id).toBe('photography');
    expect(parsed.profile.ontology.itemTypeNodeIds).toContain('composition');
    expect(parsed.profile.labels.itemPlural).toBe('Photo Ideas');
  });
});
