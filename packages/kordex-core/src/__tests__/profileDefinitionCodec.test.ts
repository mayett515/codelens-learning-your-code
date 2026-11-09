import type { LearningDomainProfile as DomainProfile, LearningProfileDefinition as ProfileDefinition } from '../extensions/learningProfile';
import { describe, expect, it } from 'vitest';
import { validateProfileDefinition } from '../codecs/profileDefinition';
import { codingProfile } from '../profiles/codingProfile';
import type { OntologyNode, } from '../types';

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
