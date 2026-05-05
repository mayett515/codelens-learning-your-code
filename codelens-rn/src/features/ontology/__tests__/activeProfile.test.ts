import { describe, expect, it } from 'vitest';
import { getActiveDomainProfile, getOntologyNodeLabel } from '../index';
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
});
