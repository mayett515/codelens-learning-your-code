import { describe, expect, it } from 'vitest';
import {
  validateProfileDefinition,
  rowToProfileDefinition,
  profileDefinitionToRow,
} from '../codecs/profileDefinition';
import { codingProfile } from '../profiles/codingProfile';
import type { DomainProfile, OntologyNode, ProfileDefinition } from '../types';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeTestNode(id: string, label?: string): OntologyNode {
  return {
    id,
    label: label ?? id,
    kind: 'category',
    parentId: null,
    meaning: `meaning of ${id}`,
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

function makeTestProfile(id: string, label: string): DomainProfile<string> {
  return {
    id,
    version: 1,
    label,
    description: `Description for ${id}`,
    labels: codingProfile.labels,
    ontology: {
      nodes: [makeTestNode(`${id}_node`)],
      itemTypeNodeIds: [`${id}_node`],
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
      defaultTypeNodeId: `${id}_node`,
      contextOnlyKeywords: [],
    },
    review: codingProfile.review,
    graph: codingProfile.graph,
  };
}

function makeTestDefinition(id: string, label: string): ProfileDefinition<string> {
  return {
    id,
    label,
    description: `Description for ${id}`,
    version: 1,
    sourceKind: 'user',
    profile: makeTestProfile(id, label),
    createdAt: 1000,
    updatedAt: 2000,
  };
}

// ---------------------------------------------------------------------------
// validateProfileDefinition
// ---------------------------------------------------------------------------

describe('validateProfileDefinition', () => {
  it('accepts a valid definition', () => {
    const def = makeTestDefinition('test', 'Test');
    const result = validateProfileDefinition(def);
    expect(result.id).toBe('test');
    expect(result.label).toBe('Test');
    expect(result.profile.id).toBe('test');
  });

  it('parses profile_json from string', () => {
    const def = makeTestDefinition('test', 'Test');
    const raw = {
      ...def,
      profile: JSON.stringify(def.profile),
    };
    const result = validateProfileDefinition(raw);
    expect(result.profile.id).toBe('test');
    expect(result.profile.label).toBe('Test');
  });

  it('parses profile_json from object', () => {
    const def = makeTestDefinition('test', 'Test');
    const result = validateProfileDefinition(def);
    expect(result.profile.id).toBe('test');
  });

  it('rejects mismatched id', () => {
    const def = makeTestDefinition('test', 'Test');
    const bad = { ...def, profile: { ...def.profile, id: 'other' } };
    expect(() => validateProfileDefinition(bad)).toThrow(/id mismatch/);
  });

  it('rejects mismatched label', () => {
    const def = makeTestDefinition('test', 'Test');
    const bad = { ...def, profile: { ...def.profile, label: 'Other' } };
    expect(() => validateProfileDefinition(bad)).toThrow(/label mismatch/);
  });

  it('rejects mismatched description', () => {
    const def = makeTestDefinition('test', 'Test');
    const bad = { ...def, profile: { ...def.profile, description: 'Other desc' } };
    expect(() => validateProfileDefinition(bad)).toThrow(/description mismatch/);
  });

  it('rejects mismatched version', () => {
    const def = makeTestDefinition('test', 'Test');
    const bad = { ...def, profile: { ...def.profile, version: 2 } };
    expect(() => validateProfileDefinition(bad)).toThrow(/version mismatch/);
  });

  it('rejects empty definition id', () => {
    const def = makeTestDefinition('test', 'Test');
    const bad = { ...def, id: '' };
    expect(() => validateProfileDefinition(bad)).toThrow();
  });

  it('rejects empty profile id', () => {
    const def = makeTestDefinition('test', 'Test');
    const bad = { ...def, profile: { ...def.profile, id: '' } };
    expect(() => validateProfileDefinition(bad)).toThrow();
  });

  it('rejects invalid sourceKind', () => {
    const def = makeTestDefinition('test', 'Test');
    const bad = { ...def, sourceKind: 'invalid' };
    expect(() => validateProfileDefinition(bad)).toThrow();
  });

  it('rejects negative version', () => {
    const def = makeTestDefinition('test', 'Test');
    const bad = { ...def, version: -1 };
    expect(() => validateProfileDefinition(bad)).toThrow();
  });

  it('rejects unknown fields in profile', () => {
    const def = makeTestDefinition('test', 'Test');
    const bad = { ...def, profile: { ...def.profile, unknownField: true } };
    expect(() => validateProfileDefinition(bad)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// rowToProfileDefinition
// ---------------------------------------------------------------------------

describe('rowToProfileDefinition', () => {
  it('maps a row with object profileJson to definition', () => {
    const def = makeTestDefinition('test', 'Test');
    const row = {
      id: def.id,
      label: def.label,
      description: def.description,
      version: def.version,
      sourceKind: def.sourceKind,
      profileJson: def.profile as unknown,
      createdAt: def.createdAt,
      updatedAt: def.updatedAt,
    };
    const result = rowToProfileDefinition(row as Parameters<typeof rowToProfileDefinition>[0]);
    expect(result.id).toBe('test');
    expect(result.profile.id).toBe('test');
    expect(result.profile.label).toBe('Test');
  });

  it('maps a row with string profileJson to definition', () => {
    const def = makeTestDefinition('test', 'Test');
    const row = {
      id: def.id,
      label: def.label,
      description: def.description,
      version: def.version,
      sourceKind: def.sourceKind,
      profileJson: JSON.stringify(def.profile),
      createdAt: def.createdAt,
      updatedAt: def.updatedAt,
    };
    const result = rowToProfileDefinition(row as Parameters<typeof rowToProfileDefinition>[0]);
    expect(result.id).toBe('test');
    expect(result.profile.id).toBe('test');
  });

  it('rejects mismatched row fields', () => {
    const def = makeTestDefinition('test', 'Test');
    const row = {
      id: def.id,
      label: def.label,
      description: def.description,
      version: def.version,
      sourceKind: def.sourceKind,
      profileJson: JSON.stringify({ ...def.profile, id: 'other' }),
      createdAt: def.createdAt,
      updatedAt: def.updatedAt,
    };
    expect(() => rowToProfileDefinition(row as Parameters<typeof rowToProfileDefinition>[0])).toThrow(/id mismatch/);
  });
});

// ---------------------------------------------------------------------------
// profileDefinitionToRow
// ---------------------------------------------------------------------------

describe('profileDefinitionToRow', () => {
  it('maps definition to insert row', () => {
    const def = makeTestDefinition('test', 'Test');
    const row = profileDefinitionToRow(def);
    expect(row.id).toBe('test');
    expect(row.label).toBe('Test');
    expect(row.description).toBe('Description for test');
    expect(row.version).toBe(1);
    expect(row.sourceKind).toBe('user');
    expect(row.profileJson).toEqual(def.profile);
    expect(row.createdAt).toBe(1000);
    expect(row.updatedAt).toBe(2000);
  });

  it('rejects mismatched definition fields', () => {
    const def = makeTestDefinition('test', 'Test');
    const bad = { ...def, profile: { ...def.profile, label: 'Other' } };
    expect(() => profileDefinitionToRow(bad)).toThrow(/label mismatch/);
  });
});
