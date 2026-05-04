import { describe, expect, it } from 'vitest';
import { CONCEPT_TYPES } from '../../learning/types/learning';
import { CODING_CONCEPT_TYPE_COLORS, CODING_CONCEPT_TYPE_NODE_IDS, codingProfile } from '../profiles/codingProfile';
import type { MetadataFieldDefinition } from '../types';
import { getMetadataField, getMetadataFieldLabel, getMetadataFieldPlaceholder } from '../metadata';

describe('coding profile', () => {
  it('owns the existing coding concept taxonomy used by learning compatibility exports', () => {
    expect(codingProfile.ontology.itemTypeNodeIds).toEqual(CONCEPT_TYPES);
    expect(CODING_CONCEPT_TYPE_NODE_IDS).toEqual([
      'mechanism',
      'mental_model',
      'pattern',
      'architecture_principle',
      'language_feature',
      'api_idiom',
      'data_structure',
      'algorithmic_idea',
      'performance_principle',
      'debugging_heuristic',
      'failure_mode',
      'testing_principle',
    ]);
  });

  it('describes every active coding item type for LLM classification and user review', () => {
    const nodesById = new Map(codingProfile.ontology.nodes.map((node) => [node.id, node]));

    for (const id of codingProfile.ontology.itemTypeNodeIds) {
      const node = nodesById.get(id);
      expect(node, `${id} node`).toBeDefined();
      expect(node?.status).toBe('active');
      expect(node?.meaning.trim().length).toBeGreaterThan(20);
      expect(node?.useWhen.length).toBeGreaterThan(0);
      expect(node?.examples.length).toBeGreaterThan(0);
    }
  });

  it('keeps graph color coverage profile-owned for every current item type', () => {
    expect(Object.keys(CODING_CONCEPT_TYPE_COLORS).sort()).toEqual([...CODING_CONCEPT_TYPE_NODE_IDS].sort());
    expect(codingProfile.graph.nodeColors).toBe(CODING_CONCEPT_TYPE_COLORS);
  });

  it('preserves the current coding labels as profile labels', () => {
    expect(codingProfile.labels).toMatchObject({
      hubTitle: 'Learning Hub',
      itemSingular: 'Concept',
      saveAction: 'Save Capture',
      bodyFieldLabel: 'What clicked',
      contextFieldLabel: 'Why it mattered',
      sourceFieldLabel: 'Snippet',
      originSectionTitle: 'Where You Learned This',
      relationshipSectionTitle: 'Learning Structure',
    });
  });

  it('defines graph relationship labels for all relationship type node ids', () => {
    for (const id of codingProfile.ontology.relationshipTypeNodeIds) {
      expect(
        codingProfile.graph.relationshipLabels[id],
        `relationship label for ${id}`,
      ).toBeTruthy();
    }
    expect(codingProfile.graph.relationshipLabels).toMatchObject({
      prerequisite: 'Prerequisite',
      related: 'Related',
      contrast: 'Contrast',
    });
  });

  it('defines graph relationship section labels covering all relationship type node ids', () => {
    for (const id of codingProfile.ontology.relationshipTypeNodeIds) {
      expect(
        codingProfile.graph.relationshipSectionLabels[id],
        `relationship section label for ${id}`,
      ).toBeTruthy();
    }
    expect(codingProfile.graph.relationshipSectionLabels).toMatchObject({
      prerequisite: 'Prerequisites',
      related: 'Related',
      contrast: 'Contrast',
    });
  });

  it('defines metadata field labels and placeholders for the three item-level fields used in the card and promotion UI', () => {
    const byId = new Map(
      codingProfile.metadataFields.map((f) => [f.id, f as MetadataFieldDefinition]),
    );
    expect(byId.get('coreConcept')?.label).toBe('Core');
    expect(byId.get('architecturalPattern')?.label).toBe('Pattern');
    expect(byId.get('programmingParadigm')?.label).toBe('Paradigm');
    expect(byId.get('coreConcept')?.placeholder).toBe('Core concept');
    expect(byId.get('architecturalPattern')?.placeholder).toBe('Architectural pattern');
    expect(byId.get('programmingParadigm')?.placeholder).toBe('Programming paradigm');
  });
});

describe('metadata field utilities', () => {
  it('getMetadataField returns the correct field definition or undefined', () => {
    expect(getMetadataField(codingProfile, 'coreConcept')?.id).toBe('coreConcept');
    expect(getMetadataField(codingProfile, 'nonexistent')).toBeUndefined();
  });

  it('getMetadataFieldLabel returns the field label or the fallback', () => {
    expect(getMetadataFieldLabel(codingProfile, 'coreConcept', 'FALLBACK')).toBe('Core');
    expect(getMetadataFieldLabel(codingProfile, 'nonexistent', 'FALLBACK')).toBe('FALLBACK');
  });

  it('getMetadataFieldPlaceholder returns placeholder, then label, then fallback', () => {
    expect(getMetadataFieldPlaceholder(codingProfile, 'coreConcept', 'FALLBACK')).toBe('Core concept');
    expect(getMetadataFieldPlaceholder(codingProfile, 'languageOrRuntime', 'FALLBACK')).toBe('Language / Runtime');
    expect(getMetadataFieldPlaceholder(codingProfile, 'nonexistent', 'FALLBACK')).toBe('FALLBACK');
  });
});
