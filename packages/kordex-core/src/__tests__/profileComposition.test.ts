import { describe, expect, it } from 'vitest';
import { composeDomainProfile } from '../profileComposition';
import type { BoundaryRule, DomainProfile, OntologyNode, ProfileOverlay } from '../types';
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

  describe('deep-clone: empty overlays share no mutable nested references with base', () => {
    it('graph nested maps are cloned, not shared with base', () => {
      const base = codingProfile as DomainProfile<string>;
      const result = composeDomainProfile(base, []);

      // Each top-level graph sub-map must be a distinct object.
      expect(result.graph.nodeColors).not.toBe(base.graph.nodeColors);
      expect(result.graph.relationshipLabels).not.toBe(base.graph.relationshipLabels);
      expect(result.graph.relationshipSectionLabels).not.toBe(
        base.graph.relationshipSectionLabels,
      );
      expect(result.graph.statusLabels).not.toBe(base.graph.statusLabels);
      expect(result.graph.tooltipLabels).not.toBe(base.graph.tooltipLabels);
      expect(result.graph.legendHelperLabels).not.toBe(base.graph.legendHelperLabels);
      expect(result.graph.modeLabels).not.toBe(base.graph.modeLabels);

      // But values are equal.
      expect(result.graph.nodeColors).toEqual(base.graph.nodeColors);
      expect(result.graph.relationshipLabels).toEqual(base.graph.relationshipLabels);
    });

    it('ontology nodes array and individual nodes are cloned, not shared with base', () => {
      const base = codingProfile as DomainProfile<string>;
      const result = composeDomainProfile(base, []);

      // The nodes array itself must be a new array.
      expect(result.ontology.nodes).not.toBe(base.ontology.nodes);

      // Each individual node must be a new object.
      for (let i = 0; i < result.ontology.nodes.length; i++) {
        expect(result.ontology.nodes[i]).not.toBe(base.ontology.nodes[i]);
      }

      // Nested mutable arrays on each node must also be distinct.
      for (let i = 0; i < result.ontology.nodes.length; i++) {
        const baseNode = base.ontology.nodes[i];
        const resultNode = result.ontology.nodes[i];
        expect(resultNode.useWhen).not.toBe(baseNode.useWhen);
        expect(resultNode.examples).not.toBe(baseNode.examples);
        expect(resultNode.relatedNodeIds).not.toBe(baseNode.relatedNodeIds);
        expect(resultNode.contrastNodeIds).not.toBe(baseNode.contrastNodeIds);
        expect(resultNode.doNotUseWhen).not.toBe(baseNode.doNotUseWhen);
      }

      // Values remain equal.
      expect(result.ontology.nodes).toEqual(base.ontology.nodes);
    });

    it('itemTypeNodeIds and relationshipTypeNodeIds arrays are cloned', () => {
      const base = codingProfile as DomainProfile<string>;
      const result = composeDomainProfile(base, []);

      expect(result.ontology.itemTypeNodeIds).not.toBe(base.ontology.itemTypeNodeIds);
      expect(result.ontology.relationshipTypeNodeIds).not.toBe(
        base.ontology.relationshipTypeNodeIds,
      );

      expect(result.ontology.itemTypeNodeIds).toEqual(base.ontology.itemTypeNodeIds);
      expect(result.ontology.relationshipTypeNodeIds).toEqual(
        base.ontology.relationshipTypeNodeIds,
      );
    });

    it('metadataFields are cloned: field objects and nested arrays not shared', () => {
      const base = codingProfile as DomainProfile<string>;
      const result = composeDomainProfile(base, []);

      expect(result.metadataFields).not.toBe(base.metadataFields);

      for (let i = 0; i < result.metadataFields.length; i++) {
        expect(result.metadataFields[i]).not.toBe(base.metadataFields[i]);
        expect(result.metadataFields[i].appliesTo).not.toBe(
          base.metadataFields[i].appliesTo,
        );
        expect(result.metadataFields[i].examples).not.toBe(
          base.metadataFields[i].examples,
        );
      }

      expect(result.metadataFields).toEqual(base.metadataFields);
    });
  });

  describe('deep-clone: overlay-added node is fully cloned from overlay input', () => {
    it('addOntologyNodes node, useWhen, examples, relatedNodeIds, contrastNodeIds are not shared with overlay', () => {
      const overlayBoundaryRule: BoundaryRule = {
        id: 'rule-1',
        text: 'do not use in perf-critical paths',
        source: 'profile_seed',
        evidenceIds: ['evidence-1', 'evidence-2'],
      };

      const overlayNode: OntologyNode = makeTestNode('overlay_added_node', {
        useWhen: ['condition-a', 'condition-b'],
        examples: ['example-x', 'example-y'],
        relatedNodeIds: ['rel-1', 'rel-2'],
        contrastNodeIds: ['contrast-1'],
        doNotUseWhen: [overlayBoundaryRule],
      });

      const overlay: ProfileOverlay<string> = makeOverlay('proj-1', 'project', {
        addOntologyNodes: [overlayNode],
        addItemTypeNodeIds: ['overlay_added_node'],
      });

      const base = codingProfile as DomainProfile<string>;
      const result = composeDomainProfile(base, [overlay]);

      const resultNode = result.ontology.nodes.find(
        (n) => n.id === 'overlay_added_node',
      );
      expect(resultNode).toBeDefined();

      // The node object itself is not the overlay node.
      expect(resultNode).not.toBe(overlayNode);

      // All mutable nested arrays are distinct from the overlay's arrays.
      expect(resultNode!.useWhen).not.toBe(overlayNode.useWhen);
      expect(resultNode!.examples).not.toBe(overlayNode.examples);
      expect(resultNode!.relatedNodeIds).not.toBe(overlayNode.relatedNodeIds);
      expect(resultNode!.contrastNodeIds).not.toBe(overlayNode.contrastNodeIds);
      expect(resultNode!.doNotUseWhen).not.toBe(overlayNode.doNotUseWhen);

      // doNotUseWhen boundary rule objects are cloned too.
      expect(resultNode!.doNotUseWhen[0]).not.toBe(overlayBoundaryRule);
      expect(resultNode!.doNotUseWhen[0].evidenceIds).not.toBe(
        overlayBoundaryRule.evidenceIds,
      );

      // Values remain equal.
      expect(resultNode!.useWhen).toEqual(overlayNode.useWhen);
      expect(resultNode!.examples).toEqual(overlayNode.examples);
      expect(resultNode!.relatedNodeIds).toEqual(overlayNode.relatedNodeIds);
      expect(resultNode!.contrastNodeIds).toEqual(overlayNode.contrastNodeIds);
      expect(resultNode!.doNotUseWhen).toEqual(overlayNode.doNotUseWhen);
    });
  });

  describe('deep-clone: metadata field override with enumOptions is fully cloned', () => {
    it('output field, appliesTo, examples, enumOptions, and enum option objects are not shared with overlay', () => {
      const overlayEnumOptions = [
        { id: 'opt-1', label: 'Option One', description: 'First option' },
        { id: 'opt-2', label: 'Option Two', description: 'Second option' },
      ];

      const overlayField = {
        id: 'severity',
        label: 'Severity Level',
        appliesTo: ['capture', 'item'] as const,
        kind: 'enum' as const,
        required: true,
        description: 'Severity classification',
        examples: ['critical', 'minor'],
        enumOptions: overlayEnumOptions,
      };

      const overlay: ProfileOverlay<string> = makeOverlay('pers-1', 'personal', {
        overrideMetadataFields: [overlayField],
      });

      const base = codingProfile as DomainProfile<string>;
      const result = composeDomainProfile(base, [overlay]);

      const resultField = result.metadataFields.find((f) => f.id === 'severity');
      expect(resultField).toBeDefined();

      // The field object is not the overlay field.
      expect(resultField).not.toBe(overlayField);

      // Nested arrays are distinct.
      expect(resultField!.appliesTo).not.toBe(overlayField.appliesTo);
      expect(resultField!.examples).not.toBe(overlayField.examples);
      expect(resultField!.enumOptions).not.toBe(overlayField.enumOptions);
      expect(resultField!.enumOptions).toHaveLength(overlayEnumOptions.length);

      // Each enum option object is cloned.
      for (let i = 0; i < overlayEnumOptions.length; i++) {
        expect(resultField!.enumOptions![i]).not.toBe(overlayEnumOptions[i]);
      }

      // Values remain equal.
      expect(resultField!.appliesTo).toEqual(overlayField.appliesTo);
      expect(resultField!.examples).toEqual(overlayField.examples);
      expect(resultField!.enumOptions).toEqual(overlayField.enumOptions);
    });
  });

  describe('mixed three-kind overlays apply project then learning then personal precedence per field', () => {
    it('produces identical results regardless of input order and respects kind precedence', () => {
      const base = codingProfile as DomainProfile<string>;

      const projectOverlay = makeOverlay<string>('proj-1', 'project', {
        overrideLabels: { hubTitle: 'P-Hub' },
        overrideGraph: { nodeColors: { mechanism: '#111111' } },
        addItemTypeNodeIds: ['proj_only'],
      });

      const learningOverlay = makeOverlay('learn-1', 'learning', {
        overrideLabels: { hubTitle: 'L-Hub', itemSingular: 'Idea' },
      });

      const personalOverlay = makeOverlay('pers-1', 'personal', {
        overrideLabels: { hubTitle: 'Me-Hub' },
        overrideGraph: { nodeColors: { mechanism: '#222222' } },
      });

      const resultA = composeDomainProfile(base, [projectOverlay, learningOverlay, personalOverlay]);
      const resultB = composeDomainProfile(base, [personalOverlay, learningOverlay, projectOverlay]);

      expect(resultA.labels.hubTitle).toBe('Me-Hub');
      expect(resultB.labels.hubTitle).toBe('Me-Hub');
      expect(resultA.labels.itemSingular).toBe('Idea');
      expect(resultB.labels.itemSingular).toBe('Idea');
      expect(resultA.graph.nodeColors.mechanism).toBe('#222222');
      expect(resultB.graph.nodeColors.mechanism).toBe('#222222');
      expect(resultA.ontology.itemTypeNodeIds).toContain('proj_only');
      expect(resultB.ontology.itemTypeNodeIds).toContain('proj_only');

      const personalNoHub = makeOverlay('pers-2', 'personal', {
        overrideGraph: { nodeColors: { mechanism: '#333333' } },
      });
      const resultC = composeDomainProfile(base, [projectOverlay, learningOverlay, personalNoHub]);
      expect(resultC.labels.hubTitle).toBe('L-Hub');
    });
  });

  describe('three same-kind project overlays apply later-wins precedence deterministically', () => {
    it('later input order wins regardless of entry order', () => {
      const base = codingProfile as DomainProfile<string>;

      const a = makeOverlay('a', 'project', { overrideLabels: { hubTitle: 'A' } });
      const b = makeOverlay('b', 'project', { overrideLabels: { hubTitle: 'B' } });
      const c = makeOverlay('c', 'project', { overrideLabels: { hubTitle: 'C' } });

      expect(composeDomainProfile(base, [a, b, c]).labels.hubTitle).toBe('C');
      expect(composeDomainProfile(base, [c, b, a]).labels.hubTitle).toBe('A');
      expect(composeDomainProfile(base, [b, c, a]).labels.hubTitle).toBe('A');
    });
  });

  describe('no-op overlay (no override fields) is equivalent to empty overlay list for label and ontology', () => {
    it('does not change labels, ontology, metadata length, or graph colors', () => {
      const base = codingProfile as DomainProfile<string>;

      const overlay = makeOverlay('noop-1', 'project');
      const overlaySnapshot = JSON.parse(JSON.stringify(overlay));

      const composedA = composeDomainProfile(base, [overlay]);
      const composedB = composeDomainProfile(base, []);

      expect(composedA.labels).toEqual(composedB.labels);
      expect(composedA.ontology.itemTypeNodeIds).toEqual(composedB.ontology.itemTypeNodeIds);
      expect(composedA.ontology.relationshipTypeNodeIds).toEqual(composedB.ontology.relationshipTypeNodeIds);
      expect(composedA.metadataFields.length).toBe(composedB.metadataFields.length);
      expect(composedA.ontology.nodes.length).toBe(composedB.ontology.nodes.length);

      expect(composedA.graph.nodeColors).toEqual(base.graph.nodeColors);
      expect(composedB.graph.nodeColors).toEqual(base.graph.nodeColors);

      expect(overlay).toEqual(overlaySnapshot);
    });
  });

  describe('overrideOntology', () => {
    it('itemTypeNodeIds and relationshipTypeNodeIds merge with the base, dedupe duplicates, and do not mutate the base', () => {
      const base = codingProfile as DomainProfile<string>;
      const baseItemTypes = [...base.ontology.itemTypeNodeIds];
      const baseRels = [...base.ontology.relationshipTypeNodeIds];
      const existingItemType = base.ontology.itemTypeNodeIds[0];
      const existingRelType = base.ontology.relationshipTypeNodeIds[0];

      const overlay: ProfileOverlay<string> = makeOverlay('proj-1', 'project', {
        overrideOntology: {
          itemTypeNodeIds: [existingItemType, 'new_item_type'],
          relationshipTypeNodeIds: [existingRelType, 'new_rel_type', 'new_rel_type'],
        },
      });

      const result = composeDomainProfile(base, [overlay]);

      expect(result.ontology.itemTypeNodeIds).toContain(existingItemType);
      expect(result.ontology.itemTypeNodeIds).toContain('new_item_type');
      expect(new Set(result.ontology.itemTypeNodeIds).size).toBe(result.ontology.itemTypeNodeIds.length);

      expect(result.ontology.relationshipTypeNodeIds).toContain(existingRelType);
      expect(result.ontology.relationshipTypeNodeIds).toContain('new_rel_type');
      expect(new Set(result.ontology.relationshipTypeNodeIds).size).toBe(result.ontology.relationshipTypeNodeIds.length);

      expect(base.ontology.itemTypeNodeIds).toEqual(baseItemTypes);
      expect(base.ontology.relationshipTypeNodeIds).toEqual(baseRels);
    });

    it('nodes adds a new ontology node and deep-clones mutable nested node fields', () => {
      const base = codingProfile as DomainProfile<string>;
      const overlayBoundaryRule: BoundaryRule = {
        id: 'rule-1',
        text: 'do not use in unrelated profile branches',
        source: 'profile_seed',
        evidenceIds: ['ev-1', 'ev-2'],
      };

      const newNode: OntologyNode = makeTestNode('override_new_node', {
        useWhen: ['condition-a', 'condition-b'],
        examples: ['ex-1', 'ex-2'],
        relatedNodeIds: ['rel-a', 'rel-b'],
        contrastNodeIds: ['contrast-a'],
        doNotUseWhen: [overlayBoundaryRule],
      });

      const overlay: ProfileOverlay<string> = makeOverlay('proj-1', 'project', {
        overrideOntology: {
          nodes: [newNode],
        },
      });

      const result = composeDomainProfile(base, [overlay]);

      const resultNode = result.ontology.nodes.find((n) => n.id === 'override_new_node');
      expect(resultNode).toBeDefined();

      expect(resultNode).not.toBe(newNode);
      expect(resultNode!.useWhen).not.toBe(newNode.useWhen);
      expect(resultNode!.examples).not.toBe(newNode.examples);
      expect(resultNode!.relatedNodeIds).not.toBe(newNode.relatedNodeIds);
      expect(resultNode!.contrastNodeIds).not.toBe(newNode.contrastNodeIds);
      expect(resultNode!.doNotUseWhen).not.toBe(newNode.doNotUseWhen);
      expect(resultNode!.doNotUseWhen[0]).not.toBe(overlayBoundaryRule);
      expect(resultNode!.doNotUseWhen[0].evidenceIds).not.toBe(overlayBoundaryRule.evidenceIds);

      expect(resultNode!.useWhen).toEqual(newNode.useWhen);
      expect(resultNode!.examples).toEqual(newNode.examples);
      expect(resultNode!.relatedNodeIds).toEqual(newNode.relatedNodeIds);
      expect(resultNode!.contrastNodeIds).toEqual(newNode.contrastNodeIds);
      expect(resultNode!.doNotUseWhen).toEqual(newNode.doNotUseWhen);

      expect(base.ontology.nodes.find((n) => n.id === 'override_new_node')).toBeUndefined();
    });

    it('additions compose cleanly with typed overlay additions without duplicate item/relationship ids', () => {
      const base = codingProfile as DomainProfile<string>;
      const nodeFromAdd = makeTestNode('shared_node');
      const nodeFromOverride = makeTestNode('override_only_node');

      const overlay: ProfileOverlay<string> = makeOverlay('proj-1', 'project', {
        addOntologyNodes: [nodeFromAdd],
        addItemTypeNodeIds: ['shared_node', 'add_only_item'],
        addRelationshipTypeNodeIds: ['rel_from_add', 'shared_rel'],
        overrideOntology: {
          nodes: [nodeFromAdd, nodeFromOverride],
          itemTypeNodeIds: ['shared_node', 'override_only_item', 'shared_node'],
          relationshipTypeNodeIds: ['rel_from_override', 'shared_rel', 'shared_rel'],
        },
      });

      const result = composeDomainProfile(base, [overlay]);

      expect(result.ontology.nodes.find((n) => n.id === 'shared_node')).toBeDefined();
      expect(result.ontology.nodes.find((n) => n.id === 'override_only_node')).toBeDefined();
      expect(result.ontology.nodes.filter((n) => n.id === 'shared_node').length).toBe(1);

      expect(result.ontology.itemTypeNodeIds).toContain('shared_node');
      expect(result.ontology.itemTypeNodeIds).toContain('add_only_item');
      expect(result.ontology.itemTypeNodeIds).toContain('override_only_item');
      expect(new Set(result.ontology.itemTypeNodeIds).size).toBe(result.ontology.itemTypeNodeIds.length);

      expect(result.ontology.relationshipTypeNodeIds).toContain('rel_from_add');
      expect(result.ontology.relationshipTypeNodeIds).toContain('rel_from_override');
      expect(result.ontology.relationshipTypeNodeIds).toContain('shared_rel');
      expect(new Set(result.ontology.relationshipTypeNodeIds).size).toBe(result.ontology.relationshipTypeNodeIds.length);

      expect(base.ontology.nodes.find((n) => n.id === 'shared_node')).toBeUndefined();
      expect(base.ontology.nodes.find((n) => n.id === 'override_only_node')).toBeUndefined();
    });
  });
});
