import { describe, expect, it } from 'vitest';
import {
  PHOTOGRAPHY_TYPE_COLORS,
  PHOTOGRAPHY_TYPE_NODE_IDS,
  photographyProfile,
} from '../profiles/photographyProfile';
import { profileDefinitionToRow, rowToProfileDefinition } from '../codecs/profileDefinition';
import type { MetadataFieldDefinition, ProfileDefinition } from '../types';

describe('photography profile', () => {
  it('is a real second base profile with a photography-shaped taxonomy', () => {
    expect(photographyProfile.id).toBe('photography');
    expect(photographyProfile.label).toBe('Photography');
    expect(photographyProfile.labels.hubTitle).toBe('Photography Hub');
    expect(photographyProfile.labels.itemSingular).toBe('Photo Idea');
    expect(photographyProfile.extraction.classificationInstructions).toContain('photography ontology');

    expect(photographyProfile.ontology.itemTypeNodeIds).toEqual(PHOTOGRAPHY_TYPE_NODE_IDS);
    expect(PHOTOGRAPHY_TYPE_NODE_IDS).toEqual([
      'composition',
      'light',
      'exposure',
      'focus',
      'color',
      'subject_moment',
      'post_processing',
      'workflow',
    ]);
  });

  it('describes every active photography item type for LLM classification and user review', () => {
    const nodesById = new Map(photographyProfile.ontology.nodes.map((node) => [node.id, node]));

    for (const id of photographyProfile.ontology.itemTypeNodeIds) {
      const node = nodesById.get(id);
      expect(node, `${id} node`).toBeDefined();
      expect(node?.status).toBe('active');
      expect(node?.createdBy).toBe('system');
      expect(node?.meaning.trim().length).toBeGreaterThan(20);
      expect(node?.useWhen.length).toBeGreaterThan(0);
      expect(node?.examples.length).toBeGreaterThan(0);
    }
  });

  it('keeps composition as an intentional cross-base id collision', () => {
    expect(photographyProfile.ontology.itemTypeNodeIds).toContain('composition');
    expect(photographyProfile.ontology.nodes.find((node) => node.id === 'composition')?.label)
      .toBe('Composition');
  });

  it('keeps graph color and relationship label coverage profile-owned', () => {
    expect(Object.keys(PHOTOGRAPHY_TYPE_COLORS).sort()).toEqual([...PHOTOGRAPHY_TYPE_NODE_IDS].sort());
    expect(photographyProfile.graph.nodeColors).toBe(PHOTOGRAPHY_TYPE_COLORS);

    for (const id of photographyProfile.ontology.relationshipTypeNodeIds) {
      expect(photographyProfile.graph.relationshipLabels[id], `relationship label for ${id}`).toBeTruthy();
      expect(photographyProfile.graph.relationshipSectionLabels[id], `relationship section for ${id}`).toBeTruthy();
    }
  });

  it('defines photography-specific metadata fields without copying coding labels', () => {
    const byId: Map<string, MetadataFieldDefinition> = new Map(
      photographyProfile.metadataFields.map((f) => [f.id, f as MetadataFieldDefinition]),
    );

    expect(byId.get('cameraBody')?.label).toBe('Camera Body');
    expect(byId.get('lens')?.placeholder).toBe('35mm f/1.4');
    expect(byId.get('exposureSettings')?.examples).toContain('1/250, f/2.8, ISO 400');
    expect(byId.get('lightingCondition')?.kind).toBe('stringList');
    expect(byId.get('editingTool')?.examples).toContain('Lightroom');
    expect(byId.has('languageOrRuntime')).toBe(false);
    expect(byId.has('coreConcept')).toBe(false);
  });

  it('round-trips through the profile definition codec without losing identity', () => {
    const definition: ProfileDefinition = {
      id: photographyProfile.id,
      label: photographyProfile.label,
      description: photographyProfile.description,
      version: photographyProfile.version,
      sourceKind: 'built_in',
      profile: photographyProfile,
      createdAt: 0,
      updatedAt: 0,
    };

    const row = profileDefinitionToRow(definition);
    const parsed = rowToProfileDefinition(row as Parameters<typeof rowToProfileDefinition>[0]);

    expect(parsed.id).toBe('photography');
    expect(parsed.profile.id).toBe('photography');
    expect(parsed.profile.ontology.itemTypeNodeIds).toContain('composition');
    expect(parsed.profile.labels.itemPlural).toBe('Photo Ideas');
  });
});
