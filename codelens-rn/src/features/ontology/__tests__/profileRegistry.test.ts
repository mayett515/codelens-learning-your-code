import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DuplicateProfileIdError,
  ProfileNotFoundError,
  createProfileRegistry,
  createStaticProfileSource,
  toDomainProfileSummary,
} from '../profileRegistry';
import { codingProfile } from '../profiles/codingProfile';
import type { DomainProfile, OntologyNode } from '../types';

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

describe('toDomainProfileSummary', () => {
  it('returns only summary fields', () => {
    const profile = makeTestProfile('summary-test', 'Summary Test');
    const summary = toDomainProfileSummary(profile);
    expect(summary).toEqual({
      id: 'summary-test',
      version: 1,
      label: 'Summary Test',
      description: 'Description for summary-test',
    });
    expect(summary).not.toHaveProperty('labels');
    expect(summary).not.toHaveProperty('ontology');
    expect(summary).not.toHaveProperty('metadataFields');
    expect(summary).not.toHaveProperty('extraction');
    expect(summary).not.toHaveProperty('embedding');
    expect(summary).not.toHaveProperty('retrieval');
    expect(summary).not.toHaveProperty('promotion');
    expect(summary).not.toHaveProperty('review');
    expect(summary).not.toHaveProperty('graph');
  });

  it('returns summary for codingProfile', () => {
    const summary = toDomainProfileSummary(codingProfile);
    expect(summary.id).toBe('coding');
    expect(summary.version).toBe(1);
    expect(summary.label).toBe('Coding');
  });
});

describe('createStaticProfileSource', () => {
  describe('getProfile', () => {
    it('resolves codingProfile by id and returns it by reference', () => {
      const source = createStaticProfileSource({
        id: 'built-in',
        profiles: [codingProfile],
      });
      const result = source.getProfile('coding');
      expect(result).toBe(codingProfile);
    });

    it('returns null for unknown id', () => {
      const source = createStaticProfileSource({
        id: 'built-in',
        profiles: [codingProfile],
      });
      const result = source.getProfile('nonexistent');
      expect(result).toBeNull();
    });

    it('resolves the correct profile when multiple profiles are present', () => {
      const p1 = makeTestProfile('alpha', 'Alpha');
      const p2 = makeTestProfile('beta', 'Beta');
      const source = createStaticProfileSource({
        id: 'multi',
        profiles: [p1, p2],
      });
      expect(source.getProfile('alpha')).toBe(p1);
      expect(source.getProfile('beta')).toBe(p2);
      expect(source.getProfile('gamma')).toBeNull();
    });
  });

  describe('listProfiles', () => {
    it('returns summaries, not full profiles', () => {
      const p1 = makeTestProfile('alpha', 'Alpha');
      const p2 = makeTestProfile('beta', 'Beta');
      const source = createStaticProfileSource({
        id: 'multi',
        profiles: [p1, p2],
      });
      const summaries = source.listProfiles();
      expect(summaries).toHaveLength(2);
      expect(summaries[0]).toEqual({
        id: 'alpha',
        version: 1,
        label: 'Alpha',
        description: 'Description for alpha',
      });
      expect(summaries[1]).toEqual({
        id: 'beta',
        version: 1,
        label: 'Beta',
        description: 'Description for beta',
      });
      expect(summaries[0]).not.toBe(p1);
      expect(summaries[1]).not.toBe(p2);
      for (const s of summaries) {
        expect(s).not.toHaveProperty('labels');
        expect(s).not.toHaveProperty('ontology');
      }
    });

    it('returns summaries for codingProfile only source', () => {
      const source = createStaticProfileSource({
        id: 'built-in',
        profiles: [codingProfile],
      });
      const summaries = source.listProfiles();
      expect(summaries).toHaveLength(1);
      expect(summaries[0].id).toBe('coding');
      expect(summaries[0].label).toBe('Coding');
    });

    it('returns new array each call', () => {
      const source = createStaticProfileSource({
        id: 'built-in',
        profiles: [codingProfile],
      });
      const first = source.listProfiles();
      const second = source.listProfiles();
      expect(first).not.toBe(second);
      expect(first).toEqual(second);
    });
  });

  describe('duplicate id inside one static source', () => {
    it('throws DuplicateProfileIdError with code, profileId, and sourceIds', () => {
      const p1 = makeTestProfile('dup', 'Duplicate 1');
      const p2 = makeTestProfile('dup', 'Duplicate 2');
      let caught: DuplicateProfileIdError | undefined;
      try {
        createStaticProfileSource({
          id: 'bad-source',
          profiles: [p1, p2],
        });
      } catch (e) {
        caught = e as DuplicateProfileIdError;
      }
      expect(caught).toBeDefined();
      expect(caught!.code).toBe('DUPLICATE_PROFILE_ID');
      expect(caught!.profileId).toBe('dup');
      expect(caught!.sourceIds).toEqual(['bad-source']);
    });
  });

  describe('immutability', () => {
    it('frozen profile array is accepted and not mutated', () => {
      const profiles = Object.freeze([codingProfile]);
      const source = createStaticProfileSource({
        id: 'frozen',
        profiles,
      });
      expect(source.getProfile('coding')).toBe(codingProfile);
      expect(profiles).toContain(codingProfile);
    });

    it('frozen profile object is not mutated', () => {
      const frozenProfile = Object.freeze(makeTestProfile('frozen', 'Frozen'));
      const source = createStaticProfileSource({
        id: 'frozen-src',
        profiles: [frozenProfile],
      });
      expect(source.getProfile('frozen')).toBe(frozenProfile);
    });

    it('later changes to the caller profile array do not change the source', () => {
      const profileA = makeTestProfile('alpha', 'Alpha');
      const profileB = makeTestProfile('beta', 'Beta');
      const profiles = [profileA];
      const source = createStaticProfileSource({
        id: 'stable-source',
        profiles,
      });

      profiles.push(profileB);

      expect(source.getProfile('alpha')).toBe(profileA);
      expect(source.getProfile('beta')).toBeNull();
      expect(source.listProfiles().map((summary) => summary.id)).toEqual(['alpha']);
    });
  });

  describe('source identity', () => {
    it('exposes the source id', () => {
      const source = createStaticProfileSource({
        id: 'my-source',
        profiles: [codingProfile],
      });
      expect(source.id).toBe('my-source');
    });
  });
});

describe('createProfileRegistry', () => {
  describe('getProfile', () => {
    it('resolves codingProfile by id and returns it by reference', () => {
      const builtInSource = createStaticProfileSource({
        id: 'built-in',
        profiles: [codingProfile],
      });
      const registry = createProfileRegistry({
        sources: [builtInSource],
      });
      const result = registry.getProfile('coding');
      expect(result).toBe(codingProfile);
    });

    it('resolves profile from the correct source among multiple sources', () => {
      const sourceA = createStaticProfileSource({
        id: 'source-a',
        profiles: [makeTestProfile('alpha', 'Alpha')],
      });
      const sourceB = createStaticProfileSource({
        id: 'source-b',
        profiles: [makeTestProfile('beta', 'Beta')],
      });
      const registry = createProfileRegistry({
        sources: [sourceA, sourceB],
      });
      expect(registry.getProfile('alpha')).toBe(sourceA.getProfile('alpha'));
      expect(registry.getProfile('beta')).toBe(sourceB.getProfile('beta'));
    });

    it('throws ProfileNotFoundError for unknown id', () => {
      const source = createStaticProfileSource({
        id: 'built-in',
        profiles: [codingProfile],
      });
      const registry = createProfileRegistry({
        sources: [source],
      });
      let caught: ProfileNotFoundError | undefined;
      try {
        registry.getProfile('nonexistent');
      } catch (e) {
        caught = e as ProfileNotFoundError;
      }
      expect(caught).toBeDefined();
      expect(caught!.code).toBe('PROFILE_NOT_FOUND');
      expect(caught!.profileId).toBe('nonexistent');
    });
  });

  describe('listProfiles', () => {
    it('returns summaries in source order', () => {
      const pA = makeTestProfile('alpha', 'Alpha');
      const pB = makeTestProfile('beta', 'Beta');
      const pC = makeTestProfile('gamma', 'Gamma');
      const source1 = createStaticProfileSource({
        id: 'source-1',
        profiles: [pA, pB],
      });
      const source2 = createStaticProfileSource({
        id: 'source-2',
        profiles: [pC],
      });
      const registry = createProfileRegistry({
        sources: [source1, source2],
      });
      const summaries = registry.listProfiles();
      expect(summaries).toHaveLength(3);
      expect(summaries[0].id).toBe('alpha');
      expect(summaries[1].id).toBe('beta');
      expect(summaries[2].id).toBe('gamma');
    });

    it('returns summaries, not full profiles', () => {
      const source = createStaticProfileSource({
        id: 'built-in',
        profiles: [codingProfile],
      });
      const registry = createProfileRegistry({
        sources: [source],
      });
      const summaries = registry.listProfiles();
      expect(summaries).toHaveLength(1);
      expect(summaries[0].id).toBe('coding');
      expect(summaries[0]).not.toHaveProperty('labels');
      expect(summaries[0]).not.toHaveProperty('ontology');
    });
  });

  describe('duplicate id across sources', () => {
    it('throws DuplicateProfileIdError with code, profileId, and sourceIds', () => {
      const p1 = makeTestProfile('dup', 'Duplicate 1');
      const sourceA = createStaticProfileSource({
        id: 'source-a',
        profiles: [p1],
      });
      const p2 = makeTestProfile('dup', 'Duplicate 2');
      const sourceB = createStaticProfileSource({
        id: 'source-b',
        profiles: [p2],
      });
      let caught: DuplicateProfileIdError | undefined;
      try {
        createProfileRegistry({
          sources: [sourceA, sourceB],
        });
      } catch (e) {
        caught = e as DuplicateProfileIdError;
      }
      expect(caught).toBeDefined();
      expect(caught!.code).toBe('DUPLICATE_PROFILE_ID');
      expect(caught!.profileId).toBe('dup');
      expect(caught!.sourceIds).toEqual(['source-a', 'source-b']);
    });
  });

  describe('immutability', () => {
    it('frozen sources array is accepted and not mutated', () => {
      const source = createStaticProfileSource({
        id: 'built-in',
        profiles: [codingProfile],
      });
      const frozenSources = Object.freeze([source]);
      const registry = createProfileRegistry({
        sources: frozenSources,
      });
      expect(registry.getProfile('coding')).toBe(codingProfile);
    });

    it('frozen source input profiles are not mutated', () => {
      const frozenProfile = Object.freeze(makeTestProfile('frozen', 'Frozen'));
      const frozenProfiles = Object.freeze([frozenProfile]);
      const source = createStaticProfileSource({
        id: 'frozen-src',
        profiles: frozenProfiles,
      });
      const frozenSource = Object.freeze(source);
      const frozenSources = Object.freeze([frozenSource]);
      const registry = createProfileRegistry({
        sources: frozenSources,
      });
      expect(registry.getProfile('frozen')).toBe(frozenProfile);
    });

    it('later changes to the caller sources array do not change the registry', () => {
      const sourceA = createStaticProfileSource({
        id: 'source-a',
        profiles: [makeTestProfile('alpha', 'Alpha')],
      });
      const sourceB = createStaticProfileSource({
        id: 'source-b',
        profiles: [makeTestProfile('beta', 'Beta')],
      });
      const sources = [sourceA];
      const registry = createProfileRegistry({
        sources,
      });

      sources.push(sourceB);

      expect(registry.getProfile('alpha')).toBe(sourceA.getProfile('alpha'));
      expect(() => registry.getProfile('beta')).toThrow(ProfileNotFoundError);
      expect(registry.listProfiles().map((summary) => summary.id)).toEqual(['alpha']);
    });
  });

  describe('empty sources', () => {
    it('registry with no sources throws ProfileNotFoundError for any id', () => {
      const registry = createProfileRegistry({
        sources: [],
      });
      expect(() => registry.getProfile('anything')).toThrow(ProfileNotFoundError);
    });

    it('registry with no sources returns empty list', () => {
      const registry = createProfileRegistry({
        sources: [],
      });
      expect(registry.listProfiles()).toEqual([]);
    });
  });
});

describe('profileRegistry source/test boundary', () => {
  it('keeps registry helpers domain-only', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '..', 'profileRegistry.ts'),
      'utf8',
    );
    const terms = [
      'Async' + 'Storage',
      'sqli' + 'te',
      'driz' + 'zle',
      'sche' + 'ma',
      'd' + 'b',
      'migra' + 'tion',
      'zust' + 'and',
      'create' + 'Store',
      'setActive' + 'Profile',
      'getActive' + 'Profile',
      'useActive' + 'Profile',
      'active' + 'ProfileStore',
      'M' + 'CP',
      'ag' + 'ent',
      'app-' + 'builder',
      'Rac' + 'ket',
      'D' + 'SL',
      'file' + 'watch',
      'import' + 'Profile',
      'export' + 'Profile',
    ];
    for (const term of terms) {
      expect(source).not.toContain(term);
    }
  });

  it('keeps registry test domain-only', () => {
    const testSource = fs.readFileSync(
      path.resolve(__dirname, 'profileRegistry.test.ts'),
      'utf8',
    );
    const terms = [
      'Async' + 'Storage',
      'sqli' + 'te',
      'driz' + 'zle',
      'sche' + 'ma',
      'zust' + 'and',
      'create' + 'Store',
      'getActive' + 'ProfileRegistry',
      'setActive' + 'ProfileRegistry',
      'useProfile' + 'Registry',
      'profile_' + 'registry',
      'M' + 'CP',
      'ag' + 'ent',
      'app-' + 'builder',
      'Rac' + 'ket',
      'D' + 'SL',
    ];
    for (const term of terms) {
      expect(testSource).not.toContain(term);
    }
  });
});
