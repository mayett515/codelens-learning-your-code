import { describe, expect, it } from 'vitest';
import { composeDomainProfile, createProfileRegistry, createStaticProfileSource,
  composeRuntimeDomainProfileFromSelection, applyBaseProfileChangeProposal,
  validateProfileDefinition } from '../index';
import type { DomainProfile, ProfileDefinition, ProfileChangeProposal, OntologyNode } from '../types';
import { validateLearningProfileDefinition } from '../codecs/profileDefinition';
import { photographyProfile } from '../profiles/photographyProfile';

const node: OntologyNode = { id: 'revision', label: 'Revision', kind: 'category',
  parentId: null, meaning: 'Check the recorded revision.', useWhen: [], doNotUseWhen: [],
  examples: [], relatedNodeIds: [], contrastNodeIds: [], status: 'active',
  createdBy: 'user', createdAt: 1, updatedAt: 1 };
const profile: DomainProfile = { id: 'headless', version: 1, label: 'Headless',
  description: 'No presentation or learning fields',
  ontology: { nodes: [], itemTypeNodeIds: [], relationshipTypeNodeIds: [] } };
const definition: ProfileDefinition = { id: profile.id, version: 1, label: profile.label,
  description: profile.description, sourceKind: 'user', profile, createdAt: 1, updatedAt: 1 };
const proposal: ProfileChangeProposal = { id: 'add-revision', proposalKind: 'ontology_node_patch',
  sourceKind: 'user', baseProfileId: profile.id, target: { kind: 'base_profile', profileId: profile.id },
  targetProfileVersion: 1, evidenceIds: ['source-1'], patch: { addOntologyNodes: [node] },
  title: 'Revision', summary: '', reason: '', riskScore: 0, status: 'pending', createdAt: 1, updatedAt: 1 };

describe('headless profile contract', () => {
  it('rejects incomplete extensions and unknown fields without stripping them', () => {
    for (const extra of [{ labels: {} }, { surprise: true }]) {
      expect(() => validateProfileDefinition({ ...definition, profile: { ...profile, ...extra } })).toThrow();
    }
    expect(() => validateLearningProfileDefinition(definition)).toThrow();
  });
  it('rejects learning overrides on a bare semantic profile', () => {
    for (const override of [
      { overrideLabels: { hubTitle: 'Not a headless field' } },
      { overrideMetadataFields: [] },
      { overrideGraph: {} },
    ]) {
      expect(() => composeDomainProfile(profile, [{ id: 'bad', kind: 'project', ...override }]))
        .toThrow('Learning overrides require a learning profile extension');
    }
  });
  it('preserves a full optional learning profile through validation and composition', () => {
    const full = { ...definition, id: photographyProfile.id, label: photographyProfile.label,
      description: photographyProfile.description, version: photographyProfile.version,
      profile: photographyProfile };
    expect(validateProfileDefinition(full)).toEqual(full);
    expect(validateLearningProfileDefinition(full)).toEqual(full);
    const before = structuredClone(full);
    const composed = composeDomainProfile(full.profile, [{ id: 'ui', kind: 'personal',
      overrideLabels: { hubTitle: 'Local photography' },
      overrideGraph: { screenTitle: 'Local graph' },
    }]);
    expect(composed.labels.hubTitle).toBe('Local photography');
    expect(composed.graph.screenTitle).toBe('Local graph');
    expect(composed.extraction).toEqual(photographyProfile.extraction);
    expect(full).toEqual(before);
  });
  it('validates and preserves a definition with no learning or presentation fields', () => {
    expect(validateProfileDefinition(definition)).toEqual(definition);
  });
  it('composes semantic overlays without inventing app fields or mutating the base', () => {
    const composed = composeDomainProfile(profile, [{ id: 'local', kind: 'project', addOntologyNodes: [node] }]);
    expect(composed).toEqual({ ...profile, ontology: { ...profile.ontology, nodes: [node] } });
    expect(profile.ontology.nodes).toEqual([]);
  });
  it('resolves a headless registry and selection through the normal pipeline', () => {
    const registry = createProfileRegistry({ sources: [createStaticProfileSource({ id: 'local', profiles: [profile] })] });
    const result = composeRuntimeDomainProfileFromSelection({ baseProfile: registry.getProfile('headless'),
      selection: { baseProfileId: 'headless', projectBranchIds: ['branch'] }, branches: [{
        id: 'branch', parentProfileId: 'headless', branchKind: 'project', name: 'Local',
        overlay: { id: 'overlay', kind: 'project', addOntologyNodes: [node] }, createdAt: 1, updatedAt: 1,
      }] });
    expect(result.ontology.nodes).toEqual([node]);
    expect('labels' in result).toBe(false);
  });
  it('calculates a guarded base candidate without requiring app fields', () => {
    const result = applyBaseProfileChangeProposal({ proposal, profileDefinition: definition, now: 2 });
    expect(result.profileDefinition.profile.ontology.nodes).toEqual([node]);
    expect(result.profileDefinition.version).toBe(2);
    expect(result.proposal.status).toBe('accepted');
    expect(Object.keys(result.profileDefinition.profile).sort()).toEqual(Object.keys(profile).sort());
    expect(() => applyBaseProfileChangeProposal({ proposal, profileDefinition: result.profileDefinition, now: 3 })).toThrow();
  });
});
