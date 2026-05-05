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
});
