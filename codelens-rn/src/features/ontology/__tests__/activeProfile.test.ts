import { describe, expect, it } from 'vitest';
import { getActiveDomainProfile, getOntologyNode, getOntologyNodeLabel } from '../index';
import { codingProfile } from '../profiles/codingProfile';
import type { OntologyNode, ProfileOverlay } from '../types';

function makeTestNode(id: string): OntologyNode {
  return {
    id,
    label: 'Project Specific Type',
    kind: 'category',
    parentId: null,
    meaning: 'A type that exists only in an explicit project overlay.',
    useWhen: ['A project overlay defines this type.'],
    doNotUseWhen: [],
    examples: ['Project-only concept'],
    relatedNodeIds: [],
    contrastNodeIds: [],
    status: 'active',
    createdBy: 'user',
    createdAt: 0,
    updatedAt: 0,
  };
}

describe('getActiveDomainProfile overlay seam', () => {
  it('returns the coding profile by reference when no overlays are supplied', () => {
    expect(getActiveDomainProfile()).toBe(codingProfile);
  });

  it('returns the coding profile by reference when an empty overlay list is supplied', () => {
    expect(getActiveDomainProfile([])).toBe(codingProfile);
  });

  it('composes explicitly supplied overlays without changing the default active profile', () => {
    const overlay: ProfileOverlay<string> = {
      id: 'project-overlay',
      kind: 'project',
      overrideLabels: {
        hubTitle: 'Project Hub',
      },
    };

    const composed = getActiveDomainProfile([overlay]);

    expect(composed).not.toBe(codingProfile);
    expect(composed.labels.hubTitle).toBe('Project Hub');
    expect(getActiveDomainProfile().labels.hubTitle).toBe(codingProfile.labels.hubTitle);
  });

  it('lets callers pass a composed active profile to ontology helpers', () => {
    const overlay: ProfileOverlay<string> = {
      id: 'project-overlay',
      kind: 'project',
      addOntologyNodes: [makeTestNode('project_specific_type')],
      addItemTypeNodeIds: ['project_specific_type'],
    };

    const composed = getActiveDomainProfile([overlay]);

    expect(getOntologyNodeLabel('project_specific_type', composed)).toBe('Project Specific Type');
    expect(getOntologyNodeLabel('project_specific_type')).toBe('project specific type');
  });

  it('personal overlays win even when listed before project overlays through the seam', () => {
    const projectOverlay: ProfileOverlay<string> = {
      id: 'proj-1',
      kind: 'project',
      overrideLabels: { hubTitle: 'Project Hub' },
    };
    const personalOverlay: ProfileOverlay<string> = {
      id: 'pers-1',
      kind: 'personal',
      overrideLabels: { hubTitle: 'Personal Hub' },
    };

    const composed = getActiveDomainProfile([personalOverlay, projectOverlay]);
    expect(composed.labels.hubTitle).toBe('Personal Hub');
  });

  it('returns separate composed runtime objects on repeated calls and does not cache', () => {
    const overlay: ProfileOverlay<string> = {
      id: 'proj-1',
      kind: 'project',
      overrideGraph: {
        nodeColors: { mechanism: '#FF0000' },
      },
    };

    const first = getActiveDomainProfile([overlay]);
    const second = getActiveDomainProfile([overlay]);

    expect(first).not.toBe(second);
    expect(first).toEqual(second);

    // Mutating the first result must not affect the second.
    (first.graph.nodeColors as Record<string, string>).mechanism = '#CHANGED';
    expect(second.graph.nodeColors.mechanism).toBe('#FF0000');
  });

  it('composed profile does not share mutable graph nested maps with codingProfile', () => {
    const overlay: ProfileOverlay<string> = {
      id: 'proj-1',
      kind: 'project',
      overrideGraph: {
        nodeColors: { mechanism: '#FF0000' },
      },
    };

    const composed = getActiveDomainProfile([overlay]);

    expect(composed.graph.nodeColors).not.toBe(codingProfile.graph.nodeColors);
    expect(composed.graph.relationshipLabels).not.toBe(codingProfile.graph.relationshipLabels);
    expect(composed.graph.relationshipSectionLabels).not.toBe(
      codingProfile.graph.relationshipSectionLabels,
    );
    expect(composed.graph.statusLabels).not.toBe(codingProfile.graph.statusLabels);
    expect(composed.graph.tooltipLabels).not.toBe(codingProfile.graph.tooltipLabels);
    expect(composed.graph.legendHelperLabels).not.toBe(codingProfile.graph.legendHelperLabels);
    expect(composed.graph.modeLabels).not.toBe(codingProfile.graph.modeLabels);
  });

  it('does not mutate the overlay input object', () => {
    const labels = { hubTitle: 'Project Hub' };
    const graphOverride = { screenTitle: 'Custom Graph' };
    const overlay: ProfileOverlay<string> = {
      id: 'proj-1',
      kind: 'project',
      overrideLabels: labels,
      overrideGraph: graphOverride,
    };

    const snapshot = JSON.parse(JSON.stringify(overlay));

    getActiveDomainProfile([overlay]);

    expect(overlay).toEqual(snapshot);
    // Original nested references must be preserved and unmutated.
    expect(overlay.overrideLabels).toBe(labels);
    expect(overlay.overrideGraph).toBe(graphOverride);
  });

  it('no-arg and empty-array calls return the same singleton reference', () => {
    const noArg = getActiveDomainProfile();
    const emptyArray = getActiveDomainProfile([]);
    expect(noArg).toBe(emptyArray);
    expect(noArg).toBe(codingProfile);
    expect(emptyArray).toBe(codingProfile);
  });

  it('frozen overlay input does not throw and produces correct composition', () => {
    const frozenNode: OntologyNode = {
      ...makeTestNode('frozen_added_type'),
    };
    Object.freeze(frozenNode);

    const frozenNodeColors: Record<string, string> = { mechanism: '#FROZEN_COLOR' };
    Object.freeze(frozenNodeColors);

    const frozenOverrideGraph = {
      nodeColors: frozenNodeColors,
    };
    Object.freeze(frozenOverrideGraph);

    const frozenOverrideLabels = { hubTitle: 'Frozen Hub' };
    Object.freeze(frozenOverrideLabels);

    const frozenAddOntologyNodes: readonly OntologyNode[] = [frozenNode];
    Object.freeze(frozenAddOntologyNodes);

    const overlay: ProfileOverlay<string> = {
      id: 'frozen-overlay',
      kind: 'project',
      overrideLabels: frozenOverrideLabels,
      overrideGraph: frozenOverrideGraph,
      addOntologyNodes: frozenAddOntologyNodes,
    };
    Object.freeze(overlay);

    const codingProfileSnapshot = JSON.parse(JSON.stringify(codingProfile));

    const composed = getActiveDomainProfile([overlay]);

    expect(composed.labels.hubTitle).toBe('Frozen Hub');
    expect(composed.graph.nodeColors.mechanism).toBe('#FROZEN_COLOR');

    const addedNode = composed.ontology.nodes.find((n) => n.id === 'frozen_added_type');
    expect(addedNode).toBeDefined();
    expect(addedNode!.label).toBe('Project Specific Type');

    expect(codingProfile).toEqual(codingProfileSnapshot);
  });

  it('mixed three-kind overlay composition applies project then learning then personal precedence at the seam', () => {
    const personalNode = makeTestNode('personal_only_type');

    const projectOverlay: ProfileOverlay<string> = {
      id: 'proj',
      kind: 'project',
      overrideLabels: { hubTitle: 'Project Hub' },
    };
    const learningOverlay: ProfileOverlay<string> = {
      id: 'learn',
      kind: 'learning',
      overrideLabels: { hubTitle: 'Learning Session Hub' },
    };
    const personalOverlay: ProfileOverlay<string> = {
      id: 'pers',
      kind: 'personal',
      overrideLabels: { hubTitle: 'Personal Hub' },
      addOntologyNodes: [personalNode],
      addItemTypeNodeIds: ['personal_only_type'],
    };

    // Ordering 1: project, learning, personal
    const composed1 = getActiveDomainProfile([
      projectOverlay,
      learningOverlay,
      personalOverlay,
    ]);
    expect(composed1.labels.hubTitle).toBe('Personal Hub');
    expect(composed1.ontology.itemTypeNodeIds).toContain('personal_only_type');
    expect(composed1.ontology.nodes.some((n) => n.id === 'personal_only_type')).toBe(true);

    // Ordering 2: personal, learning, project
    const composed2 = getActiveDomainProfile([
      personalOverlay,
      learningOverlay,
      projectOverlay,
    ]);
    expect(composed2.labels.hubTitle).toBe('Personal Hub');
    expect(composed2.ontology.itemTypeNodeIds).toContain('personal_only_type');

    // Remove personal's hubTitle; learning should surface in project-then-learning order
    const personalOverlayNoHub: ProfileOverlay<string> = {
      ...personalOverlay,
      overrideLabels: undefined,
    };
    const composed3 = getActiveDomainProfile([
      projectOverlay,
      learningOverlay,
      personalOverlayNoHub,
    ]);
    expect(composed3.labels.hubTitle).toBe('Learning Session Hub');
  });

  it('same-kind project overlays apply input order deterministically at the seam', () => {
    const overlayA: ProfileOverlay<string> = {
      id: 'proj-a',
      kind: 'project',
      overrideLabels: { hubTitle: 'A' },
    };
    const overlayB: ProfileOverlay<string> = {
      id: 'proj-b',
      kind: 'project',
      overrideLabels: { hubTitle: 'B' },
    };

    const composedAB = getActiveDomainProfile([overlayA, overlayB]);
    expect(composedAB.labels.hubTitle).toBe('B');

    const composedBA = getActiveDomainProfile([overlayB, overlayA]);
    expect(composedBA.labels.hubTitle).toBe('A');
  });

  it('getOntologyNode returns an overlay-added node only when composed profile is passed', () => {
    const overlay: ProfileOverlay<string> = {
      id: 'project-overlay',
      kind: 'project',
      addOntologyNodes: [makeTestNode('project_specific_type')],
    };

    const composed = getActiveDomainProfile([overlay]);

    // With the composed profile the added node is found.
    const found = getOntologyNode('project_specific_type', composed);
    expect(found).toBeDefined();
    expect(found!.id).toBe('project_specific_type');
    expect(found!.label).toBe('Project Specific Type');

    // Without the composed profile the default (coding) profile does not see it.
    const notFound = getOntologyNode('project_specific_type');
    expect(notFound).toBeUndefined();
  });

  it('getOntologyNodeLabel uses an overlay override for an existing base node label', () => {
    const overlay: ProfileOverlay<string> = {
      id: 'project-overlay',
      kind: 'project',
      overrideOntologyNodes: [
        {
          ...makeTestNode('mechanism'),
          id: 'mechanism',
          label: 'Implementation Mechanism',
        },
      ],
    };

    const composed = getActiveDomainProfile([overlay]);

    // The composed profile uses the override label.
    expect(getOntologyNodeLabel('mechanism', composed)).toBe('Implementation Mechanism');

    // The default profile still uses the base coding label.
    expect(getOntologyNodeLabel('mechanism')).toBe('Mechanism');
  });

  it('helper calls remain parameter-driven across two different composed profiles', () => {
    const overlayA: ProfileOverlay<string> = {
      id: 'project-a',
      kind: 'project',
      addOntologyNodes: [
        {
          ...makeTestNode('custom_type'),
          label: 'Type A',
        },
      ],
    };

    const overlayB: ProfileOverlay<string> = {
      id: 'project-b',
      kind: 'project',
      addOntologyNodes: [
        {
          ...makeTestNode('custom_type'),
          label: 'Type B',
        },
      ],
    };

    const composedA = getActiveDomainProfile([overlayA]);
    const composedB = getActiveDomainProfile([overlayB]);

    // Each composed profile returns its own label for the same node id.
    expect(getOntologyNodeLabel('custom_type', composedA)).toBe('Type A');
    expect(getOntologyNodeLabel('custom_type', composedB)).toBe('Type B');

    // The default profile does not know about this node.
    expect(getOntologyNodeLabel('custom_type')).toBe('custom type');

    // Cross-check: composedA does not leak into composedB and vice versa.
    expect(getOntologyNode('custom_type', composedA)!.label).toBe('Type A');
    expect(getOntologyNode('custom_type', composedB)!.label).toBe('Type B');
  });
});
