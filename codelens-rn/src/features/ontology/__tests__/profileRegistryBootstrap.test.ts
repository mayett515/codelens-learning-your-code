import { describe, expect, it, vi } from 'vitest';
import {
  DuplicateProfileIdError,
  ProfileNotFoundError,
} from '../profileRegistry';
import { codingProfile } from '../profiles/codingProfile';
import type { DomainProfile, OntologyNode, ProfileDefinition, ProfileSource } from '../types';
import {
  BUILT_IN_PROFILE_SOURCE_ID,
  PERSISTED_PROFILE_DEFINITION_SOURCE_ID,
  loadDefaultProfileRegistry,
  loadPersistedProfileDefinitionSource,
} from '../data/profileRegistryBootstrap';

vi.mock('../../../db/client', () => ({
  db: {},
}));

function makeTestNode(id: string, label?: string): OntologyNode {
  return {
    id,
    label: label ?? id,
    kind: 'category',
    parentId: null,
    meaning: 'meaning of ' + id,
    useWhen: ['testing'],
    doNotUseWhen: [],
    examples: ['example'],
    relatedNodeIds: [],
    contrastNodeIds: [],
    status: 'active',
    createdBy: 'user',
    createdAt: 0,
    updatedAt: 0,
  };
}

function makeTestProfile(
  id: string,
  label: string,
  overrides: Partial<DomainProfile<string>> = {},
): DomainProfile<string> {
  return {
    id,
    version: 1,
    label,
    description: 'Description for ' + id,
    labels: codingProfile.labels,
    ontology: {
      nodes: [makeTestNode(id + '_node')],
      itemTypeNodeIds: [id + '_node'],
      relationshipTypeNodeIds: [],
    },
    metadataFields: [],
    extraction: {
      assistantRole: 'Test',
      captureInstructions: 'Test',
      classificationInstructions: 'Test',
    },
    embedding: {
      captureTextFields: ['body'],
      itemTextFields: ['body'],
    },
    retrieval: {
      defaultHeader: 'Test',
      captureLabel: 'Capture',
      itemLabel: 'Item',
      summaryLabel: 'Summary',
      languageOrRuntimeLabel: 'Language',
      sourceLabel: 'Source',
    },
    promotion: {
      defaultTypeNodeId: id + '_node',
      contextOnlyKeywords: [],
    },
    review: codingProfile.review,
    graph: codingProfile.graph,
    ...overrides,
  };
}

function makeProfileDefinition(id: string, label: string): ProfileDefinition<string> {
  const profile = makeTestProfile(id, label);
  return {
    id,
    label,
    description: profile.description,
    version: profile.version,
    sourceKind: 'user',
    profile,
    createdAt: 0,
    updatedAt: 0,
  };
}

describe('loadPersistedProfileDefinitionSource', () => {
  it('uses injected listDefinitions and returns a sync source', async () => {
    const def = makeProfileDefinition('photography', 'Photography');
    const source = await loadPersistedProfileDefinitionSource({
      listDefinitions: async () => [def],
    });
    expect(source.getProfile('photography')).toBe(def.profile);
  });

  it('exposes persisted source id by default', async () => {
    const source = await loadPersistedProfileDefinitionSource({
      listDefinitions: async () => [],
    });
    expect(source.id).toBe(PERSISTED_PROFILE_DEFINITION_SOURCE_ID);
  });

  it('exposes custom source id when provided', async () => {
    const source = await loadPersistedProfileDefinitionSource({
      listDefinitions: async () => [],
      sourceId: 'custom-id',
    });
    expect(source.id).toBe('custom-id');
  });

  it('returns summaries without full profile fields', async () => {
    const def = makeProfileDefinition('photography', 'Photography');
    const source = await loadPersistedProfileDefinitionSource({
      listDefinitions: async () => [def],
    });
    const summaries = source.listProfiles();
    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toEqual({
      id: 'photography',
      version: 1,
      label: 'Photography',
      description: 'Description for photography',
    });
    expect(summaries[0]).not.toHaveProperty('labels');
    expect(summaries[0]).not.toHaveProperty('ontology');
  });

  it('preserves loaded definition order', async () => {
    const d1 = makeProfileDefinition('alpha', 'Alpha');
    const d2 = makeProfileDefinition('beta', 'Beta');
    const source = await loadPersistedProfileDefinitionSource({
      listDefinitions: async () => [d1, d2],
    });
    const summaries = source.listProfiles();
    expect(summaries.map((s) => s.id)).toEqual(['alpha', 'beta']);
  });
});

describe('loadDefaultProfileRegistry', () => {
  it('includes built-in coding profile and persisted definitions', async () => {
    const def = makeProfileDefinition('photography', 'Photography');
    const registry = await loadDefaultProfileRegistry({
      listDefinitions: async () => [def],
    });
    const summaries = registry.listProfiles();
    expect(summaries).toHaveLength(2);
    expect(summaries[0].id).toBe('coding');
    expect(summaries[1].id).toBe('photography');
  });

  it('built-in profile appears before persisted definitions in listProfiles', async () => {
    const d1 = makeProfileDefinition('alpha', 'Alpha');
    const registry = await loadDefaultProfileRegistry({
      listDefinitions: async () => [d1],
    });
    const summaries = registry.listProfiles();
    expect(summaries[0].id).toBe('coding');
    expect(summaries[1].id).toBe('alpha');
  });

  it('resolves custom persisted profile by id', async () => {
    const def = makeProfileDefinition('photography', 'Photography');
    const registry = await loadDefaultProfileRegistry({
      listDefinitions: async () => [def],
    });
    expect(registry.getProfile('photography')).toBe(def.profile);
  });

  it('resolves built-in coding profile by id', async () => {
    const registry = await loadDefaultProfileRegistry({
      listDefinitions: async () => [],
    });
    expect(registry.getProfile('coding')).toBe(codingProfile);
  });

  it('duplicate persisted id coding throws DuplicateProfileIdError', async () => {
    const def = makeProfileDefinition('coding', 'Duplicate Coding');
    let caught: DuplicateProfileIdError | undefined;
    try {
      await loadDefaultProfileRegistry({
        listDefinitions: async () => [def],
      });
    } catch (e) {
      caught = e as DuplicateProfileIdError;
    }
    expect(caught).toBeDefined();
    expect(caught!.code).toBe('DUPLICATE_PROFILE_ID');
    expect(caught!.profileId).toBe('coding');
    expect(caught!.sourceIds).toContain(BUILT_IN_PROFILE_SOURCE_ID);
    expect(caught!.sourceIds).toContain(PERSISTED_PROFILE_DEFINITION_SOURCE_ID);
  });

  it('does not mutate caller additionalSources array', async () => {
    const extraSource: ProfileSource = {
      id: 'extra',
      getProfile: () => null,
      listProfiles: () => [
        { id: 'extra-profile', version: 1, label: 'Extra', description: 'Extra profile' },
      ],
    };
    const additionalSources = [extraSource];
    const registry = await loadDefaultProfileRegistry({
      listDefinitions: async () => [],
      additionalSources,
    });
    expect(registry.listProfiles().map((s) => s.id)).toContain('extra-profile');
    expect(additionalSources).toHaveLength(1);
    expect(additionalSources[0]).toBe(extraSource);
  });

  it('snapshots additional source arrays so later mutation does not affect registry', async () => {
    const extraSource: ProfileSource = {
      id: 'extra',
      getProfile: () => null,
      listProfiles: () => [
        { id: 'extra-profile', version: 1, label: 'Extra', description: 'Extra profile' },
      ],
    };
    const additionalSources: ProfileSource[] = [extraSource];
    const registry = await loadDefaultProfileRegistry({
      listDefinitions: async () => [],
      additionalSources,
    });
    additionalSources.pop();
    expect(registry.listProfiles().map((s) => s.id)).toContain('extra-profile');
  });

  it('throws ProfileNotFoundError for unknown id when no sources have it', async () => {
    const registry = await loadDefaultProfileRegistry({
      listDefinitions: async () => [],
    });
    expect(() => registry.getProfile('nonexistent')).toThrow(ProfileNotFoundError);
  });
});
