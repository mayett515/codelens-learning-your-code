import { describe, expect, it } from 'vitest';
import { composeDomainProfile } from '../profileComposition';
import type { DomainProfile, OntologyNode, ProfileOverlay } from '../types';
import { codingProfile } from '../profiles/codingProfile';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeTestNode(
  id: string,
  overrides?: Partial<OntologyNode>,
): OntologyNode {
  return {
    id,
    label: id,
    kind: 'category',
    parentId: null,
    meaning: `meaning of ${id}`,
    useWhen: ['always'],
    doNotUseWhen: [],
    examples: ['example'],
    relatedNodeIds: [],
    contrastNodeIds: [],
    status: 'active',
    createdBy: 'system',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function makeOverlay<TItemTypeNodeId extends string = string>(
  id: string,
  kind: ProfileOverlay['kind'],
  overrides?: Partial<ProfileOverlay<TItemTypeNodeId>>,
): ProfileOverlay<TItemTypeNodeId> {
  return { id, kind, ...overrides };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('composeDomainProfile', () => {
  describe('empty overlays', () => {
    it('returns an equivalent runtime profile without mutating base', () => {
      const base = codingProfile as DomainProfile<string>;
      const baseCopy = JSON.parse(JSON.stringify(base));

      const result = composeDomainProfile(base, []);

      // Structural equivalence
      expect(result.id).toBe(base.id);
      expect(result.version).toBe(base.version);
      expect(result.label).toBe(base.label);
      expect(result.ontology.nodes.length).toBe(base.ontology.nodes.length);
      expect(result.ontology.itemTypeNodeIds).toEqual(base.ontology.itemTypeNodeIds);
      expect(result.ontology.relationshipTypeNodeIds).toEqual(base.ontology.relationshipTypeNodeIds);
      expect(result.labels).toEqual(base.labels);
      expect(result.metadataFields.length).toBe(base.metadataFields.length);

      // Base not mutated
      expect(base).toEqual(baseCopy);
    });
  });

  describe('adding ontology nodes and itemTypeNodeIds', () => {
    it('overlay can add an ontology node and itemTypeNodeId', () => {
      const base = codingProfile as DomainProfile<string>;
      const newNode = makeTestNode('project_specific_thing');

      const overlay: ProfileOverlay<string> = makeOverlay(
        'proj-1',
        'project',
        {
          addOntologyNodes: [newNode],
          addItemTypeNodeIds: ['project_specific_thing'],
        },
      );

      const result = composeDomainProfile(base, [overlay]);

      // New node present
      const addedNode = result.ontology.nodes.find((n) => n.id === 'project_specific_thing');
      expect(addedNode).toBeDefined();
      expect(addedNode?.meaning).toBe('meaning of project_specific_thing');

      // New item type id present
      expect(result.ontology.itemTypeNodeIds).toContain('project_specific_thing');

      // Base count unchanged
      expect(base.ontology.nodes.length).toBe(codingProfile.ontology.nodes.length);
      expect(base.ontology.itemTypeNodeIds).not.toContain('project_specific_thing');
    });
  });

  describe('overriding existing ontology nodes', () => {
    it('overlay can override an existing ontology node meaning/useWhen deterministically', () => {
      const base = codingProfile as DomainProfile<string>;
      const originalNode = base.ontology.nodes.find((n) => n.id === 'mechanism')!;

      const overrideNode: OntologyNode = {
        ...originalNode,
        meaning: 'OVERRIDDEN meaning of mechanism',
        useWhen: ['overlay-specific condition'],
      };

      const overlay: ProfileOverlay<string> = makeOverlay(
        'proj-1',
        'project',
        { overrideOntologyNodes: [overrideNode] },
      );

      const result = composeDomainProfile(base, [overlay]);

      const overridden = result.ontology.nodes.find((n) => n.id === 'mechanism')!;
      expect(overridden.meaning).toBe('OVERRIDDEN meaning of mechanism');
      expect(overridden.useWhen).toEqual(['overlay-specific condition']);
      expect(overridden.label).toBe(originalNode.label); // unchanged field preserved

      // Base untouched
      expect(originalNode.meaning).not.toBe('OVERRIDDEN meaning of mechanism');
    });
  });

  describe('label overrides', () => {
    it('overlay can override labels without losing unspecified base labels', () => {
      const base = codingProfile as DomainProfile<string>;

      const overlay: ProfileOverlay<string> = makeOverlay(
        'proj-1',
        'project',
        {
          overrideLabels: {
            hubTitle: 'Project Learning Hub',
            flashback: {
              emptyLabel: 'No project captures yet.',
            },
          },
        },
      );

      const result = composeDomainProfile(base, [overlay]);

      expect(result.labels.hubTitle).toBe('Project Learning Hub');
      // Unspecified labels preserved
      expect(result.labels.itemSingular).toBe('Concept');
      expect(result.labels.capturePlural).toBe('Captures');
      expect(result.labels.flashback.bannerPrefix).toBe('Viewing past session - ');
      expect(result.labels.flashback.emptyLabel).toBe('No project captures yet.');
    });
  });

  describe('precedence: personal overlay wins over project/learning', () => {
    it('personal overlay label override wins over project overlay', () => {
      const base = codingProfile as DomainProfile<string>;

      const projectOverlay: ProfileOverlay<string> = makeOverlay(
        'proj-1',
        'project',
        {
          overrideLabels: { hubTitle: 'Project Hub' },
        },
      );

      const personalOverlay: ProfileOverlay<string> = makeOverlay(
        'pers-1',
        'personal',
        {
          overrideLabels: { hubTitle: 'My Hub' },
        },
      );

      // personal after project
      const resultA = composeDomainProfile(base, [projectOverlay, personalOverlay]);
      expect(resultA.labels.hubTitle).toBe('My Hub');

      // Personal overlays apply last regardless of input order.
      const resultB = composeDomainProfile(base, [personalOverlay, projectOverlay]);
      expect(resultB.labels.hubTitle).toBe('My Hub');
    });

    it('later overlays of the same kind win deterministically', () => {
      const base = codingProfile as DomainProfile<string>;

      const first: ProfileOverlay<string> = makeOverlay('a', 'project', {
        overrideLabels: { hubTitle: 'First' },
      });
      const second: ProfileOverlay<string> = makeOverlay('b', 'project', {
        overrideLabels: { hubTitle: 'Second' },
      });

      const result = composeDomainProfile(base, [first, second]);
      expect(result.labels.hubTitle).toBe('Second');
    });
  });

  describe('relationshipTypeNodeIds', () => {
    it('relationshipTypeNodeIds are merged/deduped without changing base', () => {
      const base = codingProfile as DomainProfile<string>;
      const baseRels = [...base.ontology.relationshipTypeNodeIds];

      const overlay: ProfileOverlay<string> = makeOverlay(
        'proj-1',
        'project',
        {
          addRelationshipTypeNodeIds: ['extends', 'related', 'implements'],
        },
      );

      const result = composeDomainProfile(base, [overlay]);

      // 'related' is deduped, new ones appended
      expect(result.ontology.relationshipTypeNodeIds).toContain('extends');
      expect(result.ontology.relationshipTypeNodeIds).toContain('implements');
      expect(result.ontology.relationshipTypeNodeIds).toContain('related');
      // No duplicates
      const relSet = new Set(result.ontology.relationshipTypeNodeIds);
      expect(result.ontology.relationshipTypeNodeIds.length).toBe(relSet.size);

      // Base untouched
      expect(base.ontology.relationshipTypeNodeIds).toEqual(baseRels);
    });
  });

  describe('metadataFields merge', () => {
    it('metadataFields merge by id with overlay taking precedence', () => {
      const base = codingProfile as DomainProfile<string>;

      const overlay: ProfileOverlay<string> = makeOverlay(
        'proj-1',
        'project',
        {
          overrideMetadataFields: [
            {
              id: 'coreConcept',
              label: 'Core Concept (Project)',
              appliesTo: ['item'],
              kind: 'string',
              required: false,
              description: 'Project-specific core concept.',
              examples: ['project-core'],
            },
            {
              id: 'projectModule',
              label: 'Module',
              appliesTo: ['capture', 'item'],
              kind: 'string',
              required: false,
              description: 'Project module name.',
              examples: ['features/ontology'],
            },
          ],
        },
      );

      const result = composeDomainProfile(base, [overlay]);

      // Overridden field updated
      const coreConcept = result.metadataFields.find((f) => f.id === 'coreConcept');
      expect(coreConcept?.label).toBe('Core Concept (Project)');

      // New field appended
      const projectModule = result.metadataFields.find((f) => f.id === 'projectModule');
      expect(projectModule).toBeDefined();
      expect(projectModule?.label).toBe('Module');

      // Unchanged field preserved
      const languageOrRuntime = result.metadataFields.find((f) => f.id === 'languageOrRuntime');
      expect(languageOrRuntime?.label).toBe('Language / Runtime');

      // Base untouched
      const baseCoreConcept = base.metadataFields.find((f) => f.id === 'coreConcept');
      expect(baseCoreConcept?.label).toBe('Core');
    });
  });

  describe('immutability', () => {
    it('inputs are not mutated', () => {
      const base = codingProfile as DomainProfile<string>;
      const baseSnapshot = JSON.parse(JSON.stringify(base));

      const newNode = makeTestNode('test_node');

      const overlay: ProfileOverlay<string> = {
        id: 'test',
        kind: 'personal',
        addOntologyNodes: [newNode],
        addItemTypeNodeIds: ['test_node'],
        addRelationshipTypeNodeIds: ['depends_on'],
        overrideLabels: { hubTitle: 'Mutated?' },
        overrideMetadataFields: [
          {
            id: 'coreConcept',
            label: 'Changed?',
            appliesTo: ['item'],
            kind: 'string',
            required: false,
            description: 'test',
            examples: [],
          },
        ],
        overrideGraph: { screenTitle: 'Mutated Graph?' },
      };
      const overlaySnapshot = JSON.parse(JSON.stringify(overlay));

      composeDomainProfile(base, [overlay]);

      expect(base).toEqual(baseSnapshot);
      expect(overlay).toEqual(overlaySnapshot);
    });
  });

  describe('overrideOntologyNodes for non-existent id adds the node', () => {
    it('overrideOntologyNodes can add a node that does not exist in base', () => {
      const base = codingProfile as DomainProfile<string>;

      const newNode = makeTestNode('brand_new_type');
      const overlay: ProfileOverlay<string> = makeOverlay(
        'proj-1',
        'project',
        { overrideOntologyNodes: [newNode] },
      );

      const result = composeDomainProfile(base, [overlay]);

      const found = result.ontology.nodes.find((n) => n.id === 'brand_new_type');
      expect(found).toBeDefined();
      expect(found?.meaning).toBe('meaning of brand_new_type');
      // Base untouched
      expect(base.ontology.nodes.find((n) => n.id === 'brand_new_type')).toBeUndefined();
    });
  });

  describe('graph overrides', () => {
    it('partial graph override merges without losing base keys', () => {
      const base = codingProfile as DomainProfile<string>;

      const overlay: ProfileOverlay<string> = makeOverlay(
        'pers-1',
        'personal',
        {
          overrideGraph: {
            screenTitle: 'My Knowledge Graph',
            nodeColors: { mechanism: '#FF0000' },
            statusLabels: {
              loading: 'Loading custom graph...',
            },
          },
        },
      );

      const result = composeDomainProfile(base, [overlay]);

      expect(result.graph.screenTitle).toBe('My Knowledge Graph');
      // Unchanged graph fields preserved
      expect(result.graph.focusedScreenTitle).toBe(base.graph.focusedScreenTitle);
      // nodeColors merged: new key added, other keys preserved
      expect(result.graph.nodeColors.mechanism).toBe('#FF0000');
      expect(result.graph.nodeColors.pattern).toBe(base.graph.nodeColors.pattern);
      expect(result.graph.statusLabels.loading).toBe('Loading custom graph...');
      expect(result.graph.statusLabels.retryAction).toBe(base.graph.statusLabels.retryAction);
    });
  });
});
