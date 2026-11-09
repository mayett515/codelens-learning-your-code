import { describe, expect, it } from 'vitest';
import { composeRuntimeDomainProfile } from '../runtimeProfileCoordinator';
import { resolveActiveDomainProfileFromActivationInput } from '../profileActivation';
import { codingProfile } from '../profiles/codingProfile';
import type { DomainProfile, OntologyNode, ProfileOverlay } from '../types';

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

describe('composeRuntimeDomainProfile', () => {
  it('returns the exact base profile reference when no overlays are provided', () => {
    const base = makeNonDefaultBaseProfile();
    const result = composeRuntimeDomainProfile({ baseProfile: base });
    expect(result).toBe(base);
  });

  it('composes grouped overlays through the existing precedence: project -> learning -> personal', () => {
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
    const input = {
      baseProfile: base,
      projectOverlays: [projectOverlay],
      learningOverlays: [learningOverlay],
      personalOverlays: [personalOverlay],
    };
    const result = composeRuntimeDomainProfile(input);
    expect(result).not.toBe(base);
    // personal wins the shared label override
    expect(result.labels.hubTitle).toBe('Personal Hub');
  });

  it('is equivalent to resolveActiveDomainProfileFromActivationInput for the same input', () => {
    const base = makeNonDefaultBaseProfile();
    const projectOverlay: ProfileOverlay<string> = {
      id: 'proj',
      kind: 'project',
      overrideLabels: { hubTitle: 'Proj Hub' },
      addOntologyNodes: [makeTestNode('proj_node')],
      addItemTypeNodeIds: ['proj_node'],
    };
    const personalOverlay: ProfileOverlay<string> = {
      id: 'personal',
      kind: 'personal',
      overrideLabels: { hubTitle: 'Personal Hub' },
    };
    const input = {
      baseProfile: base,
      projectOverlays: [projectOverlay],
      personalOverlays: [personalOverlay],
    };
    const coordinatorResult = composeRuntimeDomainProfile(input);
    const directResult = resolveActiveDomainProfileFromActivationInput(input);
    expect(coordinatorResult.labels.hubTitle).toBe(directResult.labels.hubTitle);
    expect(coordinatorResult.id).toBe(directResult.id);
    expect(coordinatorResult.ontology.nodes.length).toBe(directResult.ontology.nodes.length);
    expect(coordinatorResult.ontology.itemTypeNodeIds).toEqual(directResult.ontology.itemTypeNodeIds);
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
    const input = {
      baseProfile: base,
      projectOverlays: Object.freeze([proj]),
      learningOverlays: Object.freeze([learn]),
      personalOverlays: Object.freeze([personal]),
    };
    Object.freeze(input);
    const result = composeRuntimeDomainProfile(input);
    expect(result.labels.hubTitle).toBe('Frozen Personal');
    expect(result).not.toBe(base);
  });

  it('does not mutate the input: original group arrays keep their length/order and base node count is unchanged', () => {
    const base = makeNonDefaultBaseProfile();
    const originalNodeCount = base.ontology.nodes.length;

    const projOverlays: ProfileOverlay<string>[] = [
      {
        id: 'proj-1',
        kind: 'project',
        overrideLabels: { hubTitle: 'Proj 1' },
        addOntologyNodes: [makeTestNode('added_via_proj')],
      },
    ];
    const learnOverlays: ProfileOverlay<string>[] = [
      {
        id: 'learn-1',
        kind: 'learning',
        overrideLabels: { hubTitle: 'Learn 1' },
      },
    ];
    const personalOverlays: ProfileOverlay<string>[] = [
      {
        id: 'personal-1',
        kind: 'personal',
        overrideLabels: { hubTitle: 'Personal 1' },
      },
    ];

    const projSnap = [...projOverlays];
    const learnSnap = [...learnOverlays];
    const personalSnap = [...personalOverlays];

    composeRuntimeDomainProfile({
      baseProfile: base,
      projectOverlays: projOverlays,
      learningOverlays: learnOverlays,
      personalOverlays: personalOverlays,
    });

    // Group arrays unchanged
    expect(projOverlays).toEqual(projSnap);
    expect(learnOverlays).toEqual(learnSnap);
    expect(personalOverlays).toEqual(personalSnap);

    // Base profile ontology unchanged
    expect(base.ontology.nodes.length).toBe(originalNodeCount);
    expect(base.ontology.itemTypeNodeIds).toEqual(['base_node']);
  });
});
