import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { composeRuntimeDomainProfileFromBranches } from '../profileBranches';
import {
  composeRuntimeDomainProfileFromSelection,
  resolveProfileSelection,
} from '../profileSelection';
import { codingProfile } from '../profiles/codingProfile';
import type {
  DomainProfile,
  OntologyNode,
  ProfileBranch,
  ProfileOverlay,
  ProfileSelection,
} from '../types';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeTestNode(id: string, label?: string): OntologyNode {
  return {
    id,
    label: label ?? id,
    kind: 'category',
    parentId: null,
    meaning: 'meaning of ' + id,
    useWhen: ['testing'],
    doNotUseWhen: [],
    examples: ['example'],
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

function makeProfileBranch<TItemTypeNodeId extends string = string>(
  id: string,
  branchKind: ProfileBranch<TItemTypeNodeId>['branchKind'],
  overlay: Partial<ProfileOverlay<TItemTypeNodeId>> = {},
  overrides?: Partial<ProfileBranch<TItemTypeNodeId>>,
): ProfileBranch<TItemTypeNodeId> {
  const now = 1_700_000_000_000;
  return {
    id,
    parentProfileId: 'parent-profile',
    branchKind,
    name: id,
    overlay: {
      id: 'overlay-' + id,
      kind: branchKind,
      ...overlay,
    },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('resolveProfileSelection', () => {
  describe('empty selection returns base profile', () => {
    it('returns base profile by reference when no branches selected', () => {
      const base = makeNonDefaultBaseProfile();
      const selection: ProfileSelection = { baseProfileId: base.id };
      const result = resolveProfileSelection({
        selection,
        baseProfile: base,
        branches: [],
      });
      expect(result.baseProfile).toBe(base);
      expect(result.branches).toEqual([]);
    });

    it('returns base profile by reference when branch arrays are empty', () => {
      const base = makeNonDefaultBaseProfile();
      const selection: ProfileSelection = {
        baseProfileId: base.id,
        projectBranchIds: [],
        learningBranchIds: [],
        personalBranchIds: [],
      };
      const result = resolveProfileSelection({
        selection,
        baseProfile: base,
        branches: [],
      });
      expect(result.baseProfile).toBe(base);
      expect(result.branches).toEqual([]);
    });
  });

  describe('baseProfileId mismatch throws', () => {
    it('throws when baseProfileId does not match base profile id', () => {
      const base = makeNonDefaultBaseProfile();
      const selection: ProfileSelection = { baseProfileId: 'wrong-base-id' };
      expect(() =>
        resolveProfileSelection({
          selection,
          baseProfile: base,
          branches: [],
        }),
      ).toThrow(/baseProfileId.*does not match/);
    });
  });

  describe('missing branch id throws', () => {
    it('throws when selected project branch id not found', () => {
      const base = makeNonDefaultBaseProfile();
      const selection: ProfileSelection = {
        baseProfileId: base.id,
        projectBranchIds: ['nonexistent-branch'],
      };
      expect(() =>
        resolveProfileSelection({
          selection,
          baseProfile: base,
          branches: [],
        }),
      ).toThrow(/not found/);
    });

    it('throws when selected learning branch id not found', () => {
      const base = makeNonDefaultBaseProfile();
      const selection: ProfileSelection = {
        baseProfileId: base.id,
        learningBranchIds: ['missing-learning'],
      };
      expect(() =>
        resolveProfileSelection({
          selection,
          baseProfile: base,
          branches: [],
        }),
      ).toThrow(/not found/);
    });

    it('throws when selected personal branch id not found', () => {
      const base = makeNonDefaultBaseProfile();
      const selection: ProfileSelection = {
        baseProfileId: base.id,
        personalBranchIds: ['missing-personal'],
      };
      expect(() =>
        resolveProfileSelection({
          selection,
          baseProfile: base,
          branches: [],
        }),
      ).toThrow(/not found/);
    });
  });

  describe('wrong-kind branch id throws', () => {
    it('throws when a project branch id is listed under learningBranchIds', () => {
      const base = makeNonDefaultBaseProfile();
      const projBranch = makeProfileBranch('proj-1', 'project');
      const selection: ProfileSelection = {
        baseProfileId: base.id,
        learningBranchIds: ['proj-1'],
      };
      expect(() =>
        resolveProfileSelection({
          selection,
          baseProfile: base,
          branches: [projBranch],
        }),
      ).toThrow(/has kind.*but was listed under/);
    });

    it('throws when a personal branch id is listed under projectBranchIds', () => {
      const base = makeNonDefaultBaseProfile();
      const personalBranch = makeProfileBranch('per-1', 'personal');
      const selection: ProfileSelection = {
        baseProfileId: base.id,
        projectBranchIds: ['per-1'],
      };
      expect(() =>
        resolveProfileSelection({
          selection,
          baseProfile: base,
          branches: [personalBranch],
        }),
      ).toThrow(/has kind.*but was listed under/);
    });

    it('throws when a learning branch id is listed under personalBranchIds', () => {
      const base = makeNonDefaultBaseProfile();
      const learnBranch = makeProfileBranch('learn-1', 'learning');
      const selection: ProfileSelection = {
        baseProfileId: base.id,
        personalBranchIds: ['learn-1'],
      };
      expect(() =>
        resolveProfileSelection({
          selection,
          baseProfile: base,
          branches: [learnBranch],
        }),
      ).toThrow(/has kind.*but was listed under/);
    });
  });

  describe('branch resolution and ordering', () => {
    it('resolves selected project branch', () => {
      const base = makeNonDefaultBaseProfile();
      const newNode = makeTestNode('project_specific');
      const branch = makeProfileBranch('proj-1', 'project', {
        addOntologyNodes: [newNode],
        addItemTypeNodeIds: ['project_specific'],
      });
      const selection: ProfileSelection = {
        baseProfileId: base.id,
        projectBranchIds: ['proj-1'],
      };

      const result = resolveProfileSelection({
        selection,
        baseProfile: base,
        branches: [branch],
      });

      expect(result.baseProfile).toBe(base);
      expect(result.branches).toHaveLength(1);
      expect(result.branches[0]).toBe(branch);
    });

    it('selection order within same kind wins even if branch input array order is different', () => {
      const base = makeNonDefaultBaseProfile();
      const branchA = makeProfileBranch('proj-a', 'project', {
        overrideLabels: { hubTitle: 'Hub A' },
      });
      const branchB = makeProfileBranch('proj-b', 'project', {
        overrideLabels: { hubTitle: 'Hub B' },
      });
      const selection: ProfileSelection = {
        baseProfileId: base.id,
        projectBranchIds: ['proj-a', 'proj-b'],
      };

      const result = resolveProfileSelection({
        selection,
        baseProfile: base,
        branches: [branchB, branchA],
      });

      expect(result.branches[0]).toBe(branchA);
      expect(result.branches[1]).toBe(branchB);
    });

    it('returns branches in normalized kind order: project, learning, personal', () => {
      const base = makeNonDefaultBaseProfile();
      const projBranch = makeProfileBranch('proj-1', 'project');
      const learnBranch = makeProfileBranch('learn-1', 'learning');
      const personalBranch = makeProfileBranch('per-1', 'personal');
      const selection: ProfileSelection = {
        baseProfileId: base.id,
        personalBranchIds: ['per-1'],
        projectBranchIds: ['proj-1'],
        learningBranchIds: ['learn-1'],
      };

      const result = resolveProfileSelection({
        selection,
        baseProfile: base,
        branches: [personalBranch, learnBranch, projBranch],
      });

      expect(result.branches[0]).toBe(projBranch);
      expect(result.branches[1]).toBe(learnBranch);
      expect(result.branches[2]).toBe(personalBranch);
    });

    it('resolves multiple branches within each kind in selection order', () => {
      const base = makeNonDefaultBaseProfile();
      const proj1 = makeProfileBranch('p1', 'project', {
        overrideLabels: { hubTitle: 'P1' },
      });
      const proj2 = makeProfileBranch('p2', 'project', {
        overrideLabels: { hubTitle: 'P2' },
      });
      const learn1 = makeProfileBranch('l1', 'learning');
      const personal1 = makeProfileBranch('per1', 'personal');

      const selection: ProfileSelection = {
        baseProfileId: base.id,
        projectBranchIds: ['p1', 'p2'],
        learningBranchIds: ['l1'],
        personalBranchIds: ['per1'],
      };

      const result = resolveProfileSelection({
        selection,
        baseProfile: base,
        branches: [proj2, personal1, learn1, proj1],
      });

      expect(result.branches.map((b) => b.id)).toEqual([
        'p1',
        'p2',
        'l1',
        'per1',
      ]);
    });
  });

  describe('immutability', () => {
    it('frozen selection is not mutated', () => {
      const base = makeNonDefaultBaseProfile();
      const branch = makeProfileBranch('proj-1', 'project');
      const frozenSelection: ProfileSelection = Object.freeze({
        baseProfileId: base.id,
        projectBranchIds: Object.freeze(['proj-1']),
      });
      const frozenBranches = Object.freeze([branch]);

      const result = resolveProfileSelection({
        selection: frozenSelection,
        baseProfile: base,
        branches: frozenBranches,
      });

      expect(result.baseProfile).toBe(base);
      expect(result.branches).toHaveLength(1);
    });

    it('frozen base profile and frozen branches are not mutated', () => {
      const base = Object.freeze<DomainProfile<string>>(makeNonDefaultBaseProfile());
      const frozenBranch = Object.freeze<ProfileBranch<string>>(
        makeProfileBranch('frozen-proj', 'project'),
      );
      const selection: ProfileSelection = {
        baseProfileId: base.id,
        projectBranchIds: ['frozen-proj'],
      };

      const result = resolveProfileSelection({
        selection,
        baseProfile: base,
        branches: [frozenBranch],
      });

      expect(result.baseProfile).toBe(base);
      expect(result.branches[0]).toBe(frozenBranch);
    });
  });
});

describe('composeRuntimeDomainProfileFromSelection', () => {
  it('empty selection returns base profile by reference through compose helper', () => {
    const base = makeNonDefaultBaseProfile();
    const selection: ProfileSelection = { baseProfileId: base.id };
    const result = composeRuntimeDomainProfileFromSelection({
      selection,
      baseProfile: base,
      branches: [],
    });
    expect(result).toBe(base);
  });

  it('selected project branch adds ontology node', () => {
    const base = makeNonDefaultBaseProfile();
    const newNode = makeTestNode('project_specific');
    const branch = makeProfileBranch('proj-1', 'project', {
      addOntologyNodes: [newNode],
      addItemTypeNodeIds: ['project_specific'],
    });
    const selection: ProfileSelection = {
      baseProfileId: base.id,
      projectBranchIds: ['proj-1'],
    };

    const result = composeRuntimeDomainProfileFromSelection({
      selection,
      baseProfile: base,
      branches: [branch],
    });

    expect(result).not.toBe(base);
    const addedNode = result.ontology.nodes.find((n) => n.id === 'project_specific');
    expect(addedNode).toBeDefined();
    expect(result.ontology.itemTypeNodeIds).toContain('project_specific');
    expect(base.ontology.nodes.length).toBe(1);
  });

  it('selection order within same kind wins even if branch input array order is different', () => {
    const base = makeNonDefaultBaseProfile();
    const branchA = makeProfileBranch('proj-a', 'project', {
      overrideLabels: { hubTitle: 'Hub A' },
    });
    const branchB = makeProfileBranch('proj-b', 'project', {
      overrideLabels: { hubTitle: 'Hub B' },
    });
    const selection: ProfileSelection = {
      baseProfileId: base.id,
      projectBranchIds: ['proj-a', 'proj-b'],
    };

    const result = composeRuntimeDomainProfileFromSelection({
      selection,
      baseProfile: base,
      branches: [branchB, branchA],
    });

    expect(result.labels.hubTitle).toBe('Hub B');
  });

  it('personal branch wins over learning/project through existing runtime precedence', () => {
    const base = makeNonDefaultBaseProfile();
    const projBranch = makeProfileBranch('proj-1', 'project', {
      overrideLabels: { hubTitle: 'Project Hub' },
    });
    const learnBranch = makeProfileBranch('learn-1', 'learning', {
      overrideLabels: { hubTitle: 'Learning Hub' },
    });
    const personalBranch = makeProfileBranch('per-1', 'personal', {
      overrideLabels: { hubTitle: 'Personal Hub' },
    });
    const selection: ProfileSelection = {
      baseProfileId: base.id,
      projectBranchIds: ['proj-1'],
      learningBranchIds: ['learn-1'],
      personalBranchIds: ['per-1'],
    };

    const result = composeRuntimeDomainProfileFromSelection({
      selection,
      baseProfile: base,
      branches: [projBranch, learnBranch, personalBranch],
    });

    expect(result.labels.hubTitle).toBe('Personal Hub');
  });

  it('learning branch wins over project when personal absent', () => {
    const base = makeNonDefaultBaseProfile();
    const projBranch = makeProfileBranch('proj-1', 'project', {
      overrideLabels: { hubTitle: 'Project Hub' },
    });
    const learnBranch = makeProfileBranch('learn-1', 'learning', {
      overrideLabels: { hubTitle: 'Learning Hub' },
    });
    const selection: ProfileSelection = {
      baseProfileId: base.id,
      projectBranchIds: ['proj-1'],
      learningBranchIds: ['learn-1'],
    };

    const result = composeRuntimeDomainProfileFromSelection({
      selection,
      baseProfile: base,
      branches: [projBranch, learnBranch],
    });

    expect(result.labels.hubTitle).toBe('Learning Hub');
  });

  it('throws when baseProfileId does not match', () => {
    const base = makeNonDefaultBaseProfile();
    const selection: ProfileSelection = { baseProfileId: 'wrong-id' };
    expect(() =>
      composeRuntimeDomainProfileFromSelection({
        selection,
        baseProfile: base,
        branches: [],
      }),
    ).toThrow(/baseProfileId.*does not match/);
  });

  it('throws when missing branch id', () => {
    const base = makeNonDefaultBaseProfile();
    const selection: ProfileSelection = {
      baseProfileId: base.id,
      projectBranchIds: ['missing-branch'],
    };
    expect(() =>
      composeRuntimeDomainProfileFromSelection({
        selection,
        baseProfile: base,
        branches: [],
      }),
    ).toThrow(/not found/);
  });

  it('throws when wrong-kind branch id', () => {
    const base = makeNonDefaultBaseProfile();
    const projBranch = makeProfileBranch('proj-1', 'project');
    const selection: ProfileSelection = {
      baseProfileId: base.id,
      learningBranchIds: ['proj-1'],
    };
    expect(() =>
      composeRuntimeDomainProfileFromSelection({
        selection,
        baseProfile: base,
        branches: [projBranch],
      }),
    ).toThrow(/has kind.*but was listed under/);
  });

  it('frozen inputs are not mutated', () => {
    const base = Object.freeze<DomainProfile<string>>(makeNonDefaultBaseProfile());
    const projOverlay: ProfileOverlay<string> = {
      id: 'frozen-overlay',
      kind: 'project',
      overrideLabels: { hubTitle: 'Frozen Hub' },
    };
    const frozenBranch = Object.freeze<ProfileBranch<string>>(
      makeProfileBranch('frozen-proj', 'project', projOverlay),
    );
    const selection: ProfileSelection = Object.freeze({
      baseProfileId: base.id,
      projectBranchIds: Object.freeze(['frozen-proj']),
    });
    const frozenBranches = Object.freeze([frozenBranch]);

    const result = composeRuntimeDomainProfileFromSelection({
      selection,
      baseProfile: base,
      branches: frozenBranches,
    });

    expect(result.labels.hubTitle).toBe('Frozen Hub');
    expect(result).not.toBe(base);
  });

  it('output is equivalent to composeRuntimeDomainProfileFromBranches with same resolved branches', () => {
    const base = makeNonDefaultBaseProfile();
    const projBranch = makeProfileBranch('proj-b', 'project', {
      overrideLabels: { hubTitle: 'Proj Hub' },
      addOntologyNodes: [makeTestNode('added_node')],
      addItemTypeNodeIds: ['added_node'],
    });
    const learnBranch = makeProfileBranch('learn-b', 'learning', {
      overrideLabels: { itemSingular: 'Idea' },
    });
    const personalBranch = makeProfileBranch('personal-b', 'personal', {
      overrideLabels: { hubTitle: 'Personal Hub' },
    });

    const selection: ProfileSelection = {
      baseProfileId: base.id,
      projectBranchIds: ['proj-b'],
      learningBranchIds: ['learn-b'],
      personalBranchIds: ['personal-b'],
    };

    const fromSelection = composeRuntimeDomainProfileFromSelection({
      selection,
      baseProfile: base,
      branches: [projBranch, learnBranch, personalBranch],
    });

    const fromBranches = composeRuntimeDomainProfileFromBranches({
      baseProfile: base,
      branches: [projBranch, learnBranch, personalBranch],
    });

    expect(fromSelection.labels.hubTitle).toBe(fromBranches.labels.hubTitle);
    expect(fromSelection.labels.itemSingular).toBe(fromBranches.labels.itemSingular);
    expect(fromSelection.id).toBe(fromBranches.id);
    expect(fromSelection.ontology.nodes.length).toBe(fromBranches.ontology.nodes.length);
    expect(fromSelection.ontology.itemTypeNodeIds).toEqual(
      fromBranches.ontology.itemTypeNodeIds,
    );
    expect(fromSelection.labels.hubTitle).toBe('Personal Hub');
  });
});

describe('profileSelection source/test boundary', () => {
  it('keeps selection helpers domain-only', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '..', 'profileSelection.ts'),
      'utf8',
    );
    const terms = [
      'Async' + 'Storage',
      'sqli' + 'te',
      'driz' + 'zle',
      'sche' + 'ma',
      'd' + 'b',
      'migra' + 'tion',
      'zust' + 'and',
      'create' + 'Store',
      'setActive' + 'Branch',
      'useActive' + 'Branch',
      'profile_' + 'branches',
      'profile_' + 'overlays',
      'automatic' + 'Merge',
      'auto' + 'Merge',
      'apply' + 'Merge',
      'getActive' + 'Selection',
      'setActive' + 'Selection',
      'useActive' + 'Selection',
      'current' + 'Selection',
      'active' + 'SelectionStore',
      'M' + 'CP',
      'ag' + 'ent',
      'app-' + 'builder',
      'Rac' + 'ket',
      'D' + 'SL',
    ];

    for (const term of terms) {
      expect(source).not.toContain(term);
    }
  });

  it('keeps selection test domain-only', () => {
    const testSource = fs.readFileSync(
      path.resolve(__dirname, 'profileSelection.test.ts'),
      'utf8',
    );
    const terms = [
      'Async' + 'Storage',
      'sqli' + 'te',
      'driz' + 'zle',
      'sche' + 'ma',
      'zust' + 'and',
      'create' + 'Store',
      'setActive' + 'Branch',
      'getActive' + 'Selection',
      'setActive' + 'Selection',
      'useActive' + 'Selection',
      'current' + 'Selection',
      'active' + 'SelectionStore',
      'M' + 'CP',
      'ag' + 'ent',
      'app-' + 'builder',
      'Rac' + 'ket',
      'D' + 'SL',
    ];

    for (const term of terms) {
      expect(testSource).not.toContain(term);
    }
  });
});
