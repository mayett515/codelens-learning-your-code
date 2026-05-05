import { describe, expect, it } from 'vitest';
import { getActiveDomainProfile, resolveActiveDomainProfile } from '../index';
import { codingProfile } from '../profiles/codingProfile';
import type {
  ActiveDomainProfileSource,
  DomainProfile,
  OntologyNode,
  ProfileOverlay,
} from '../types';

function makeTestNode(id: string): OntologyNode {
  return {
    id,
    label: 'Test Node',
    kind: 'category',
    parentId: null,
    meaning: 'A test node.',
    useWhen: ['Testing'],
    doNotUseWhen: [],
    examples: ['Test'],
    relatedNodeIds: [],
    contrastNodeIds: [],
    status: 'active',
    createdBy: 'user',
    createdAt: 0,
    updatedAt: 0,
  };
}

function makeNonDefaultBaseProfile(): DomainProfile<string> {
  return {
    id: 'test-base',
    version: 1,
    label: 'Test Base',
    description: 'A non-default base profile for testing.',
    labels: {
      ...codingProfile.labels,
      hubTitle: 'Original Base Hub',
    },
    ontology: {
      nodes: [makeTestNode('base_node')],
      itemTypeNodeIds: ['base_node'],
      relationshipTypeNodeIds: [],
    },
    metadataFields: [],
    extraction: {
      assistantRole: 'Test assistant',
      captureInstructions: 'Test capture',
      classificationInstructions: 'Test classification',
    },
    embedding: {
      captureTextFields: ['body'],
      itemTextFields: ['body'],
    },
    retrieval: {
      defaultHeader: 'Test Header',
      captureLabel: 'Capture',
      itemLabel: 'Item',
      summaryLabel: 'Summary',
      languageOrRuntimeLabel: 'Language',
      sourceLabel: 'Source',
    },
    promotion: {
      defaultTypeNodeId: 'base_node',
      contextOnlyKeywords: [],
    },
    review: codingProfile.review,
    graph: {
      ...codingProfile.graph,
      screenTitle: 'Test Graph',
    },
  };
}

describe('resolveActiveDomainProfile', () => {
  it('returns the exact base profile reference when overlays are omitted', () => {
    const base = makeNonDefaultBaseProfile();
    const source: ActiveDomainProfileSource<string> = { baseProfile: base };
    const result = resolveActiveDomainProfile(source);
    expect(result).toBe(base);
  });

  it('returns the exact base profile reference when overlays are null', () => {
    const base = makeNonDefaultBaseProfile();
    const source: ActiveDomainProfileSource<string> = { baseProfile: base, overlays: null };
    const result = resolveActiveDomainProfile(source);
    expect(result).toBe(base);
  });

  it('returns the exact base profile reference when overlays are an empty array', () => {
    const base = makeNonDefaultBaseProfile();
    const source: ActiveDomainProfileSource<string> = { baseProfile: base, overlays: [] };
    const result = resolveActiveDomainProfile(source);
    expect(result).toBe(base);
  });

  it('composes explicit overlays and returns a different object with the overlay changes', () => {
    const base = makeNonDefaultBaseProfile();
    const overlay: ProfileOverlay<string> = {
      id: 'overlay-1',
      kind: 'project',
      overrideLabels: { hubTitle: 'Overridden Hub' },
    };
    const source: ActiveDomainProfileSource<string> = {
      baseProfile: base,
      overlays: [overlay],
    };
    const result = resolveActiveDomainProfile(source);
    expect(result).not.toBe(base);
    expect(result.labels.hubTitle).toBe('Overridden Hub');
  });

  it('does not mutate the source object, base profile, or overlay input', () => {
    const base = makeNonDefaultBaseProfile();
    const overlay: ProfileOverlay<string> = {
      id: 'overlay-1',
      kind: 'project',
      overrideLabels: { hubTitle: 'Overridden Hub' },
      addOntologyNodes: [makeTestNode('added_node')],
    };
    const source: ActiveDomainProfileSource<string> = {
      baseProfile: base,
      overlays: [overlay],
    };
    const baseSnap = JSON.parse(JSON.stringify(base));
    const overlaySnap = JSON.parse(JSON.stringify(overlay));
    const sourceSnap = JSON.parse(JSON.stringify(source));
    resolveActiveDomainProfile(source);
    resolveActiveDomainProfile(source);
    expect(base).toEqual(baseSnap);
    expect(overlay).toEqual(overlaySnap);
    expect(source).toEqual(sourceSnap);
  });

  it('returns equal but distinct composed objects on repeated calls (no cache)', () => {
    const base = makeNonDefaultBaseProfile();
    const overlay: ProfileOverlay<string> = {
      id: 'overlay-1',
      kind: 'project',
      overrideGraph: { nodeColors: { base_node: '#ABCDEF' } },
    };
    const source: ActiveDomainProfileSource<string> = {
      baseProfile: base,
      overlays: [overlay],
    };
    const first = resolveActiveDomainProfile(source);
    const second = resolveActiveDomainProfile(source);
    expect(first).not.toBe(second);
    expect(first).toEqual(second);
    (first.graph.nodeColors as Record<string, string>).base_node = '#CHANGED';
    expect((second.graph.nodeColors as Record<string, string>).base_node).toBe('#ABCDEF');
  });

  it('works with a non-default base profile object, not only the codingProfile singleton', () => {
    const customBase = makeNonDefaultBaseProfile();
    const overlay: ProfileOverlay<string> = {
      id: 'custom-overlay',
      kind: 'learning',
      addOntologyNodes: [makeTestNode('custom_added')],
      addItemTypeNodeIds: ['custom_added'],
    };
    const source: ActiveDomainProfileSource<string> = {
      baseProfile: customBase,
      overlays: [overlay],
    };
    const result = resolveActiveDomainProfile(source);
    expect(result).not.toBe(codingProfile);
    expect(result.id).toBe('test-base');
    expect(result.labels.hubTitle).toBe('Original Base Hub');
    expect(result.ontology.nodes.some((n) => n.id === 'custom_added')).toBe(true);
    expect(result.ontology.itemTypeNodeIds).toContain('custom_added');
  });
});

describe('getActiveDomainProfile compatibility via resolver', () => {
  it('returns codingProfile by reference for no-arg call', () => {
    expect(getActiveDomainProfile()).toBe(codingProfile);
  });

  it('returns codingProfile by reference for empty-array call', () => {
    expect(getActiveDomainProfile([])).toBe(codingProfile);
  });

  it('composes explicit overlays through the resolver', () => {
    const overlay: ProfileOverlay<string> = {
      id: 'compat-overlay',
      kind: 'project',
      overrideLabels: { hubTitle: 'Compat Hub' },
    };
    const composed = getActiveDomainProfile([overlay]);
    expect(composed).not.toBe(codingProfile);
    expect(composed.labels.hubTitle).toBe('Compat Hub');
  });
});
