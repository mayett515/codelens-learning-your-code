import { describe, expect, it } from 'vitest';
import { codingProfile } from '../profiles/codingProfile';
import { getActiveDomainProfile } from '../index';
import type { DomainProfile, OntologyCorrectionEvidence, OntologyNode, ProfileOverlay } from '../types';
import { validateOntologyCorrection } from '../corrections';

function validCorrection(overrides: Partial<OntologyCorrectionEvidence> = {}): OntologyCorrectionEvidence {
  return {
    id: 'ev_1',
    profileId: 'coding',
    activeSelectionSnapshot: {
      baseProfileId: 'coding',
      projectBranchIds: ['project-branch-1'],
      learningBranchIds: ['learning-branch-1'],
      personalBranchIds: ['personal-branch-1'],
    },
    subjectKind: 'item',
    subjectId: 'concept_abc',
    field: 'typeNodeId',
    previousTypeNodeId: 'mechanism',
    correctedTypeNodeId: 'pattern',
    reason: 'Reclassified after review',
    source: 'user',
    createdAt: 1_700_000_000_000,
    ...overrides,
  };
}

function makeTestNode(id: string): OntologyNode {
  return {
    id,
    label: 'Overlay Only Type',
    kind: 'category',
    parentId: null,
    meaning: 'A type that exists only in an explicit overlay.',
    useWhen: ['An overlay defines this type.'],
    doNotUseWhen: [],
    examples: ['Overlay-only concept'],
    relatedNodeIds: [],
    contrastNodeIds: [],
    status: 'active',
    createdBy: 'user',
    createdAt: 0,
    updatedAt: 0,
  };
}

describe('validateOntologyCorrection', () => {

  it('passes for a correctedTypeNodeId that exists only in an explicit overlay, and fails against base profile', () => {
    const overlayOnlyType = 'overlay_only_corrected_type';
    expect(codingProfile.ontology.itemTypeNodeIds).not.toContain(overlayOnlyType);

    const overlay: ProfileOverlay<string> = {
      id: 'project-overlay',
      kind: 'project',
      addOntologyNodes: [makeTestNode(overlayOnlyType)],
      addItemTypeNodeIds: [overlayOnlyType],
    };

    const composed = getActiveDomainProfile([overlay]);
    const ev = validCorrection({ correctedTypeNodeId: overlayOnlyType });

    expect(validateOntologyCorrection(ev, composed)).toEqual([]);

    const baseErrors = validateOntologyCorrection(ev, codingProfile);
    expect(baseErrors).toHaveLength(1);
    expect(baseErrors[0]).toContain(`corrected type node id '${overlayOnlyType}'`);
  });

  it('passes for a previousTypeNodeId that exists only in an explicit overlay, and fails against base profile', () => {
    const overlayOnlyType = 'overlay_only_previous_type';
    expect(codingProfile.ontology.itemTypeNodeIds).not.toContain(overlayOnlyType);

    const overlay: ProfileOverlay<string> = {
      id: 'project-overlay',
      kind: 'project',
      addOntologyNodes: [makeTestNode(overlayOnlyType)],
      addItemTypeNodeIds: [overlayOnlyType],
    };

    const composed = getActiveDomainProfile([overlay]);
    const ev = validCorrection({ previousTypeNodeId: overlayOnlyType });

    expect(validateOntologyCorrection(ev, composed)).toEqual([]);

    const baseErrors = validateOntologyCorrection(ev, codingProfile);
    expect(baseErrors).toHaveLength(1);
    expect(baseErrors[0]).toContain(`previous type node id '${overlayOnlyType}'`);
  });

  it('does not mutate the composed profile or the overlay input used to create it', () => {
    const overlayOnlyType = 'overlay_only_immutable_type';
    expect(codingProfile.ontology.itemTypeNodeIds).not.toContain(overlayOnlyType);

    const overlay: ProfileOverlay<string> = {
      id: 'project-overlay',
      kind: 'project',
      addOntologyNodes: [makeTestNode(overlayOnlyType)],
      addItemTypeNodeIds: [overlayOnlyType],
    };

    const composed = getActiveDomainProfile([overlay]);
    const composedSnapshot = JSON.parse(JSON.stringify(composed)) as DomainProfile<string>;
    const overlaySnapshot = JSON.parse(JSON.stringify(overlay)) as ProfileOverlay<string>;

    const ev = validCorrection({ correctedTypeNodeId: overlayOnlyType });
    validateOntologyCorrection(ev, composed);

    expect(composed).toEqual(composedSnapshot);
    expect(overlay).toEqual(overlaySnapshot);
  });
});
