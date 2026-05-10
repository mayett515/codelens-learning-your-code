import { describe, expect, it } from 'vitest';
import {
  createActiveDomainProfileSource,
  getActiveDomainProfile,
  resolveActiveDomainProfile,
  resolveActiveDomainProfileFromActivationInput,
} from '../index';
import { codingProfile } from '../profiles/codingProfile';
import type {
  ActiveDomainProfileSource,
  ActiveDomainProfileActivationInput,
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

describe('createActiveDomainProfileSource', () => {
  it('returns a source with the exact base profile reference and no overlays property when all overlay groups are omitted', () => {
    const base = makeNonDefaultBaseProfile();
    const input: ActiveDomainProfileActivationInput<string> = { baseProfile: base };
    const source = createActiveDomainProfileSource(input);
    expect(source.baseProfile).toBe(base);
    expect('overlays' in source).toBe(false);
  });

  it('treats null overlay groups as no overlays', () => {
    const base = makeNonDefaultBaseProfile();
    const input: ActiveDomainProfileActivationInput<string> = {
      baseProfile: base,
      projectOverlays: null,
      learningOverlays: null,
      personalOverlays: null,
    };
    const source = createActiveDomainProfileSource(input);
    expect(source.baseProfile).toBe(base);
    expect('overlays' in source).toBe(false);
  });

  it('treats empty overlay groups as no overlays', () => {
    const base = makeNonDefaultBaseProfile();
    const input: ActiveDomainProfileActivationInput<string> = {
      baseProfile: base,
      projectOverlays: [],
      learningOverlays: [],
      personalOverlays: [],
    };
    const source = createActiveDomainProfileSource(input);
    expect(source.baseProfile).toBe(base);
    expect('overlays' in source).toBe(false);
  });

  it('treats mixed null/empty/omitted groups as no overlays', () => {
    const base = makeNonDefaultBaseProfile();
    const input: ActiveDomainProfileActivationInput<string> = {
      baseProfile: base,
      projectOverlays: [],
      learningOverlays: null,
    };
    const source = createActiveDomainProfileSource(input);
    expect(source.baseProfile).toBe(base);
    expect('overlays' in source).toBe(false);
  });

  it('normalizes project, learning, and personal groups into one overlay list in that order', () => {
    const base = makeNonDefaultBaseProfile();
    const projOverlay: ProfileOverlay<string> = {
      id: 'proj-1',
      kind: 'project',
      overrideLabels: { hubTitle: 'Project Hub' },
    };
    const learnOverlay: ProfileOverlay<string> = {
      id: 'learn-1',
      kind: 'learning',
      overrideLabels: { hubTitle: 'Learning Hub' },
    };
    const personalOverlay: ProfileOverlay<string> = {
      id: 'personal-1',
      kind: 'personal',
      overrideLabels: { hubTitle: 'Personal Hub' },
    };
    const input: ActiveDomainProfileActivationInput<string> = {
      baseProfile: base,
      projectOverlays: [projOverlay],
      learningOverlays: [learnOverlay],
      personalOverlays: [personalOverlay],
    };
    const source = createActiveDomainProfileSource(input);
    expect(source.baseProfile).toBe(base);
    expect(source.overlays).toBeDefined();
    expect(source.overlays).toHaveLength(3);
    expect(source.overlays![0].id).toBe('proj-1');
    expect(source.overlays![1].id).toBe('learn-1');
    expect(source.overlays![2].id).toBe('personal-1');
  });

  it('preserves relative order within each group', () => {
    const base = makeNonDefaultBaseProfile();
    const proj1: ProfileOverlay<string> = { id: 'proj-1', kind: 'project' };
    const proj2: ProfileOverlay<string> = { id: 'proj-2', kind: 'project' };
    const learn1: ProfileOverlay<string> = { id: 'learn-1', kind: 'learning' };
    const learn2: ProfileOverlay<string> = { id: 'learn-2', kind: 'learning' };
    const input: ActiveDomainProfileActivationInput<string> = {
      baseProfile: base,
      projectOverlays: [proj1, proj2],
      learningOverlays: [learn1, learn2],
    };
    const source = createActiveDomainProfileSource(input);
    expect(source.overlays).toBeDefined();
    expect(source.overlays).toHaveLength(4);
    expect(source.overlays!.map((o) => o.id)).toEqual(['proj-1', 'proj-2', 'learn-1', 'learn-2']);
  });

  it('works with only project overlays', () => {
    const base = makeNonDefaultBaseProfile();
    const overlay: ProfileOverlay<string> = { id: 'proj-only', kind: 'project' };
    const input: ActiveDomainProfileActivationInput<string> = {
      baseProfile: base,
      projectOverlays: [overlay],
    };
    const source = createActiveDomainProfileSource(input);
    expect(source.overlays).toBeDefined();
    expect(source.overlays).toHaveLength(1);
    expect(source.overlays![0].id).toBe('proj-only');
  });

  it('works with only personal overlays', () => {
    const base = makeNonDefaultBaseProfile();
    const overlay: ProfileOverlay<string> = { id: 'personal-only', kind: 'personal' };
    const input: ActiveDomainProfileActivationInput<string> = {
      baseProfile: base,
      personalOverlays: [overlay],
    };
    const source = createActiveDomainProfileSource(input);
    expect(source.overlays).toBeDefined();
    expect(source.overlays).toHaveLength(1);
    expect(source.overlays![0].id).toBe('personal-only');
  });

  it('does not mutate the input object', () => {
    const base = makeNonDefaultBaseProfile();
    const overlay: ProfileOverlay<string> = { id: 'mut-1', kind: 'project' };
    const input: ActiveDomainProfileActivationInput<string> = {
      baseProfile: base,
      projectOverlays: [overlay],
    };
    const inputSnap = JSON.parse(JSON.stringify(input));
    createActiveDomainProfileSource(input);
    createActiveDomainProfileSource(input);
    expect(input).toEqual(inputSnap);
  });

  it('does not mutate any overlay arrays', () => {
    const base = makeNonDefaultBaseProfile();
    const projOverlays: ProfileOverlay<string>[] = [{ id: 'p1', kind: 'project' }];
    const learnOverlays: ProfileOverlay<string>[] = [{ id: 'l1', kind: 'learning' }];
    const personalOverlays: ProfileOverlay<string>[] = [{ id: 'per1', kind: 'personal' }];
    const input: ActiveDomainProfileActivationInput<string> = {
      baseProfile: base,
      projectOverlays: projOverlays,
      learningOverlays: learnOverlays,
      personalOverlays: personalOverlays,
    };
    const projSnap = [...projOverlays];
    const learnSnap = [...learnOverlays];
    const personalSnap = [...personalOverlays];
    createActiveDomainProfileSource(input);
    expect(projOverlays).toEqual(projSnap);
    expect(learnOverlays).toEqual(learnSnap);
    expect(personalOverlays).toEqual(personalSnap);
  });

  it('returns a distinct overlays array on each call (no shared mutable state)', () => {
    const base = makeNonDefaultBaseProfile();
    const overlay: ProfileOverlay<string> = { id: 'shared', kind: 'project' };
    const input: ActiveDomainProfileActivationInput<string> = {
      baseProfile: base,
      projectOverlays: [overlay],
    };
    const source1 = createActiveDomainProfileSource(input);
    const source2 = createActiveDomainProfileSource(input);
    expect(source1.overlays).not.toBe(source2.overlays);
  });

  it('returns an overlays array that is a new container, so mutating it does not affect original group arrays', () => {
    const base = makeNonDefaultBaseProfile();
    const proj1: ProfileOverlay<string> = { id: 'proj-1', kind: 'project' };
    const learn1: ProfileOverlay<string> = { id: 'learn-1', kind: 'learning' };
    const input: ActiveDomainProfileActivationInput<string> = {
      baseProfile: base,
      projectOverlays: [proj1],
      learningOverlays: [learn1],
    };
    const source = createActiveDomainProfileSource(input);
    const overlays = source.overlays! as ProfileOverlay<string>[];
    expect(overlays).toHaveLength(2);
    overlays.pop();
    expect(overlays).toHaveLength(1);
    expect(input.projectOverlays).toEqual([proj1]);
    expect(input.learningOverlays).toEqual([learn1]);
  });
});

describe('resolveActiveDomainProfileFromActivationInput', () => {
  it('returns the exact base profile reference when all overlay groups are omitted', () => {
    const base = makeNonDefaultBaseProfile();
    const input: ActiveDomainProfileActivationInput<string> = { baseProfile: base };
    const result = resolveActiveDomainProfileFromActivationInput(input);
    expect(result).toBe(base);
  });

  it('returns the exact base profile reference when all overlay groups are null or empty', () => {
    const base = makeNonDefaultBaseProfile();
    const input: ActiveDomainProfileActivationInput<string> = {
      baseProfile: base,
      projectOverlays: null,
      learningOverlays: [],
      personalOverlays: undefined,
    };
    const result = resolveActiveDomainProfileFromActivationInput(input);
    expect(result).toBe(base);
  });

  it('composes grouped overlays through the existing resolver', () => {
    const base = makeNonDefaultBaseProfile();
    const projOverlay: ProfileOverlay<string> = {
      id: 'proj',
      kind: 'project',
      overrideLabels: { hubTitle: 'Proj Hub' },
    };
    const learnOverlay: ProfileOverlay<string> = {
      id: 'learn',
      kind: 'learning',
      addOntologyNodes: [makeTestNode('learn_node')],
      addItemTypeNodeIds: ['learn_node'],
    };
    const input: ActiveDomainProfileActivationInput<string> = {
      baseProfile: base,
      projectOverlays: [projOverlay],
      learningOverlays: [learnOverlay],
    };
    const result = resolveActiveDomainProfileFromActivationInput(input);
    expect(result).not.toBe(base);
    expect(result.labels.hubTitle).toBe('Proj Hub');
    expect(result.ontology.nodes.some((n) => n.id === 'learn_node')).toBe(true);
    expect(result.ontology.itemTypeNodeIds).toContain('learn_node');
  });

  it('is equivalent to resolveActiveDomainProfile(createActiveDomainProfileSource(input))', () => {
    const base = makeNonDefaultBaseProfile();
    const overlay: ProfileOverlay<string> = { id: 'eq', kind: 'personal', overrideLabels: { hubTitle: 'Eq Hub' } };
    const input: ActiveDomainProfileActivationInput<string> = {
      baseProfile: base,
      personalOverlays: [overlay],
    };
    const direct = resolveActiveDomainProfileFromActivationInput(input);
    const composed = resolveActiveDomainProfile(createActiveDomainProfileSource(input));
    expect(direct.labels.hubTitle).toBe(composed.labels.hubTitle);
    expect(direct.id).toBe(composed.id);
  });

  it('preserves no-overlay base-reference behavior', () => {
    const base = makeNonDefaultBaseProfile();
    const inputEmpty: ActiveDomainProfileActivationInput<string> = {
      baseProfile: base,
    };
    const inputNull: ActiveDomainProfileActivationInput<string> = {
      baseProfile: base,
      projectOverlays: null,
      learningOverlays: null,
      personalOverlays: null,
    };
    const resultEmpty = resolveActiveDomainProfileFromActivationInput(inputEmpty);
    const resultNull = resolveActiveDomainProfileFromActivationInput(inputNull);
    expect(resultEmpty).toBe(base);
    expect(resultNull).toBe(base);
  });

  it('gives personal overlays the highest precedence when all groups override the same field', () => {
    const base = makeNonDefaultBaseProfile();
    const projectOverlay: ProfileOverlay<string> = {
      id: 'proj',
      kind: 'project',
      overrideLabels: { hubTitle: 'Project Hub' },
    };
    const learningOverlay: ProfileOverlay<string> = {
      id: 'learn',
      kind: 'learning',
      overrideLabels: { hubTitle: 'Learning Hub' },
    };
    const personalOverlay: ProfileOverlay<string> = {
      id: 'personal',
      kind: 'personal',
      overrideLabels: { hubTitle: 'Personal Hub' },
    };
    const input: ActiveDomainProfileActivationInput<string> = {
      baseProfile: base,
      projectOverlays: [projectOverlay],
      learningOverlays: [learningOverlay],
      personalOverlays: [personalOverlay],
    };
    const result = resolveActiveDomainProfileFromActivationInput(input);
    expect(result.labels.hubTitle).toBe('Personal Hub');
  });

  it('gives learning overlays precedence over project overlays for the same field', () => {
    const base = makeNonDefaultBaseProfile();
    const projectOverlay: ProfileOverlay<string> = {
      id: 'proj',
      kind: 'project',
      overrideLabels: { hubTitle: 'Project Hub' },
    };
    const learningOverlay: ProfileOverlay<string> = {
      id: 'learn',
      kind: 'learning',
      overrideLabels: { hubTitle: 'Learning Hub' },
    };
    const input: ActiveDomainProfileActivationInput<string> = {
      baseProfile: base,
      projectOverlays: [projectOverlay],
      learningOverlays: [learningOverlay],
    };
    const result = resolveActiveDomainProfileFromActivationInput(input);
    expect(result.labels.hubTitle).toBe('Learning Hub');
  });

  it('lets later project overlays override earlier project overlays within the same group', () => {
    const base = makeNonDefaultBaseProfile();
    const firstProjectOverlay: ProfileOverlay<string> = {
      id: 'proj-first',
      kind: 'project',
      overrideLabels: { hubTitle: 'First Project Hub' },
    };
    const secondProjectOverlay: ProfileOverlay<string> = {
      id: 'proj-second',
      kind: 'project',
      overrideLabels: { hubTitle: 'Second Project Hub' },
    };
    const input: ActiveDomainProfileActivationInput<string> = {
      baseProfile: base,
      projectOverlays: [firstProjectOverlay, secondProjectOverlay],
    };
    const result = resolveActiveDomainProfileFromActivationInput(input);
    expect(result.labels.hubTitle).toBe('Second Project Hub');
  });

  it('does not throw and composes correctly when input, groups, and overlays are frozen', () => {
    const base = makeNonDefaultBaseProfile();
    const proj = Object.freeze<ProfileOverlay<string>>({
      id: 'frozen-proj',
      kind: 'project',
      overrideLabels: { hubTitle: 'Frozen Proj' },
    });
    const learn = Object.freeze<ProfileOverlay<string>>({
      id: 'frozen-learn',
      kind: 'learning',
      overrideLabels: { hubTitle: 'Frozen Learn' },
    });
    const personal = Object.freeze<ProfileOverlay<string>>({
      id: 'frozen-personal',
      kind: 'personal',
      overrideLabels: { hubTitle: 'Frozen Personal' },
    });
    const input: ActiveDomainProfileActivationInput<string> = {
      baseProfile: base,
      projectOverlays: Object.freeze([proj]),
      learningOverlays: Object.freeze([learn]),
      personalOverlays: Object.freeze([personal]),
    };
    Object.freeze(input);
    const result = resolveActiveDomainProfileFromActivationInput(input);
    expect(result.labels.hubTitle).toBe('Frozen Personal');
  });
});
