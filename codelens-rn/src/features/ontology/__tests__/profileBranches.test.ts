import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  composeRuntimeDomainProfileFromBranches,
  createActiveDomainProfileSourceFromBranches,
  groupProfileBranchesByKind,
  profileBranchToOverlay,
} from '../profileBranches';
import { composeRuntimeDomainProfile } from '../runtimeProfileCoordinator';
import { codingProfile } from '../profiles/codingProfile';
import type {
  DomainProfile,
  OntologyNode,
  ProfileBranch,
  ProfileOverlay,
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
    meaning: `meaning of ${id}`,
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
      id: `overlay-${id}`,
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

describe('profileBranchToOverlay', () => {
  it('returns the branch overlay', () => {
    const branch = makeProfileBranch('b1', 'project', {
      overrideLabels: { hubTitle: 'Overlay Hub' },
    });
    const overlay = profileBranchToOverlay(branch);
    expect(overlay).toBe(branch.overlay);
    expect(overlay.id).toBe('overlay-b1');
    expect(overlay.kind).toBe('project');
  });
});

describe('groupProfileBranchesByKind', () => {
  it('returns empty arrays for empty input', () => {
    const groups = groupProfileBranchesByKind([]);
    expect(groups.projectOverlays).toEqual([]);
    expect(groups.learningOverlays).toEqual([]);
    expect(groups.personalOverlays).toEqual([]);
  });

  it('groups branches by kind and preserves input order inside each kind', () => {
    const proj1 = makeProfileBranch('proj-1', 'project', {
      overrideLabels: { hubTitle: 'P1' },
    });
    const learn1 = makeProfileBranch('learn-1', 'learning', {
      overrideLabels: { hubTitle: 'L1' },
    });
    const proj2 = makeProfileBranch('proj-2', 'project', {
      overrideLabels: { hubTitle: 'P2' },
    });
    const personal1 = makeProfileBranch('per-1', 'personal', {
      overrideLabels: { hubTitle: 'Per1' },
    });
    const learn2 = makeProfileBranch('learn-2', 'learning', {
      overrideLabels: { hubTitle: 'L2' },
    });

    const groups = groupProfileBranchesByKind([proj1, learn1, proj2, personal1, learn2]);

    expect(groups.projectOverlays).toHaveLength(2);
    expect(groups.projectOverlays[0].id).toBe('overlay-proj-1');
    expect(groups.projectOverlays[1].id).toBe('overlay-proj-2');

    expect(groups.learningOverlays).toHaveLength(2);
    expect(groups.learningOverlays[0].id).toBe('overlay-learn-1');
    expect(groups.learningOverlays[1].id).toBe('overlay-learn-2');

    expect(groups.personalOverlays).toHaveLength(1);
    expect(groups.personalOverlays[0].id).toBe('overlay-per-1');
  });
});

describe('createActiveDomainProfileSourceFromBranches', () => {
  it('returns base profile by reference when branches are empty', () => {
    const base = makeNonDefaultBaseProfile();
    const source = createActiveDomainProfileSourceFromBranches({
      baseProfile: base,
      branches: [],
    });
    expect(source.baseProfile).toBe(base);
    expect('overlays' in source).toBe(false);
  });
});

describe('composeRuntimeDomainProfileFromBranches', () => {
  // Test 1: empty branches return base profile by reference
  it('returns base profile by reference when branches are empty', () => {
    const base = makeNonDefaultBaseProfile();
    const result = composeRuntimeDomainProfileFromBranches({
      baseProfile: base,
      branches: [],
    });
    expect(result).toBe(base);
  });

  // Test 2: project branch overlay adds ontology node
  it('project branch overlay adds ontology node', () => {
    const base = makeNonDefaultBaseProfile();
    const newNode = makeTestNode('project_specific');
    const branch = makeProfileBranch('proj-1', 'project', {
      addOntologyNodes: [newNode],
      addItemTypeNodeIds: ['project_specific'],
    });

    const result = composeRuntimeDomainProfileFromBranches({
      baseProfile: base,
      branches: [branch],
    });

    expect(result).not.toBe(base);
    const addedNode = result.ontology.nodes.find((n) => n.id === 'project_specific');
    expect(addedNode).toBeDefined();
    expect(result.ontology.itemTypeNodeIds).toContain('project_specific');
    expect(base.ontology.nodes.length).toBe(1);
    expect(base.ontology.itemTypeNodeIds).not.toContain('project_specific');
  });

  // Test 3: personal branch wins over project branch label override
  it('personal branch wins over project branch label override', () => {
    const base = makeNonDefaultBaseProfile();
    const projBranch = makeProfileBranch('proj-1', 'project', {
      overrideLabels: { hubTitle: 'Project Hub' },
    });
    const personalBranch = makeProfileBranch('per-1', 'personal', {
      overrideLabels: { hubTitle: 'Personal Hub' },
    });

    const result = composeRuntimeDomainProfileFromBranches({
      baseProfile: base,
      branches: [projBranch, personalBranch],
    });

    expect(result.labels.hubTitle).toBe('Personal Hub');
  });

  // Test 4: learning branch wins over project when personal absent
  it('learning branch wins over project when personal absent', () => {
    const base = makeNonDefaultBaseProfile();
    const projBranch = makeProfileBranch('proj-1', 'project', {
      overrideLabels: { hubTitle: 'Project Hub' },
    });
    const learnBranch = makeProfileBranch('learn-1', 'learning', {
      overrideLabels: { hubTitle: 'Learning Hub' },
    });

    const result = composeRuntimeDomainProfileFromBranches({
      baseProfile: base,
      branches: [projBranch, learnBranch],
    });

    expect(result.labels.hubTitle).toBe('Learning Hub');
  });

  // Test 5: later same-kind project branch wins
  it('later same-kind project branch wins', () => {
    const base = makeNonDefaultBaseProfile();
    const firstBranch = makeProfileBranch('proj-first', 'project', {
      overrideLabels: { hubTitle: 'First Hub' },
    });
    const secondBranch = makeProfileBranch('proj-second', 'project', {
      overrideLabels: { hubTitle: 'Second Hub' },
    });

    const result = composeRuntimeDomainProfileFromBranches({
      baseProfile: base,
      branches: [firstBranch, secondBranch],
    });

    expect(result.labels.hubTitle).toBe('Second Hub');
  });

  // Test 6: sibling project branches remain independent and are not mutated
  it('sibling project branches remain independent input objects and are not mutated', () => {
    const base = makeNonDefaultBaseProfile();
    const nodeToAdd = makeTestNode('sibling_node');
    const branch1 = makeProfileBranch('proj-1', 'project', {
      addOntologyNodes: [nodeToAdd],
      addItemTypeNodeIds: ['sibling_node'],
      overrideLabels: { hubTitle: 'Branch 1 Hub' },
    });
    const branch2 = makeProfileBranch('proj-2', 'project', {
      overrideLabels: { hubTitle: 'Branch 2 Hub' },
    });

    const branch1Snap = JSON.parse(JSON.stringify(branch1));
    const branch2Snap = JSON.parse(JSON.stringify(branch2));
    const baseSnap = JSON.parse(JSON.stringify(base));

    const result = composeRuntimeDomainProfileFromBranches({
      baseProfile: base,
      branches: [branch1, branch2],
    });

    expect(branch1).toEqual(branch1Snap);
    expect(branch2).toEqual(branch2Snap);
    expect(base).toEqual(baseSnap);
    expect(branch1).not.toBe(branch2);
    expect(branch1.overlay).not.toBe(branch2.overlay);
    expect(result.labels.hubTitle).toBe('Branch 2 Hub');
    expect(result.ontology.nodes.some((n) => n.id === 'sibling_node')).toBe(true);
  });

  // Test 7: frozen branch array and frozen branch objects compose correctly
  it('frozen branch array and frozen branch objects compose correctly', () => {
    const base = makeNonDefaultBaseProfile();
    const frozenBranch = Object.freeze<ProfileBranch<string>>(
      makeProfileBranch('frozen-proj', 'project', {
        overrideLabels: { hubTitle: 'Frozen Hub' },
      }),
    );
    const frozenBranches = Object.freeze([frozenBranch]);

    const result = composeRuntimeDomainProfileFromBranches({
      baseProfile: base,
      branches: frozenBranches,
    });

    expect(result.labels.hubTitle).toBe('Frozen Hub');
    expect(result).not.toBe(base);
  });

  // Test 8: grouped helper preserves input order inside each kind
  it('grouped helper preserves input order inside each kind', () => {
    const proj1 = makeProfileBranch('p1', 'project', {
      overrideLabels: { hubTitle: 'P1' },
    });
    const learn1 = makeProfileBranch('l1', 'learning', {
      overrideLabels: { hubTitle: 'L1' },
    });
    const proj2 = makeProfileBranch('p2', 'project', {
      overrideLabels: { hubTitle: 'P2' },
    });
    const personal1 = makeProfileBranch('per1', 'personal', {
      overrideLabels: { hubTitle: 'Per1' },
    });
    const learn2 = makeProfileBranch('l2', 'learning', {
      overrideLabels: { hubTitle: 'L2' },
    });

    const groups = groupProfileBranchesByKind([
      proj1,
      learn1,
      proj2,
      personal1,
      learn2,
    ]);

    expect(groups.projectOverlays.map((o) => o.id)).toEqual([
      'overlay-p1',
      'overlay-p2',
    ]);
    expect(groups.learningOverlays.map((o) => o.id)).toEqual([
      'overlay-l1',
      'overlay-l2',
    ]);
    expect(groups.personalOverlays.map((o) => o.id)).toEqual(['overlay-per1']);
  });

  // Test 9: output matches existing runtime composition path
  it('output matches existing runtime composition path', () => {
    const base = makeNonDefaultBaseProfile();
    const projOverlay: ProfileOverlay<string> = {
      id: 'proj-o',
      kind: 'project',
      overrideLabels: { hubTitle: 'Proj Hub' },
      addOntologyNodes: [makeTestNode('added_node')],
      addItemTypeNodeIds: ['added_node'],
    };
    const learnOverlay: ProfileOverlay<string> = {
      id: 'learn-o',
      kind: 'learning',
      overrideLabels: { itemSingular: 'Idea' },
    };
    const personalOverlay: ProfileOverlay<string> = {
      id: 'personal-o',
      kind: 'personal',
      overrideLabels: { hubTitle: 'Personal Hub' },
    };

    const projBranch = makeProfileBranch('proj-b', 'project', projOverlay);
    const learnBranch = makeProfileBranch('learn-b', 'learning', learnOverlay);
    const personalBranch = makeProfileBranch('personal-b', 'personal', personalOverlay);

    const fromBranches = composeRuntimeDomainProfileFromBranches({
      baseProfile: base,
      branches: [projBranch, learnBranch, personalBranch],
    });

    const fromOverlays = composeRuntimeDomainProfile({
      baseProfile: base,
      projectOverlays: [projOverlay],
      learningOverlays: [learnOverlay],
      personalOverlays: [personalOverlay],
    });

    expect(fromBranches.labels.hubTitle).toBe(fromOverlays.labels.hubTitle);
    expect(fromBranches.labels.itemSingular).toBe(fromOverlays.labels.itemSingular);
    expect(fromBranches.id).toBe(fromOverlays.id);
    expect(fromBranches.ontology.nodes.length).toBe(fromOverlays.ontology.nodes.length);
    expect(fromBranches.ontology.itemTypeNodeIds).toEqual(
      fromOverlays.ontology.itemTypeNodeIds,
    );
    expect(fromBranches.labels.hubTitle).toBe('Personal Hub');
  });

  // Test 10: keep the branch helper source free of persistence/runtime names.
  it('keeps branch helpers domain-only', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '..', 'profileBranches.ts'),
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
});
