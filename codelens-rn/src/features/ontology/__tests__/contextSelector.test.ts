import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  assembleContextPack,
  createCheckerContextSelector,
  createConceptualizeContextSelector,
  scopedNodeRefKey,
  selectCheckerContext,
  selectConceptualizeContext,
  validateContextPack,
} from '../index';
import type {
  CheckerContextSelectorInput,
  ConceptualizeContextSelectorInput,
  ContextOntologyNodeInput,
  ContextPolicy,
  ScopedNodeRef,
} from '../index';

function ref(scopeId: string, nodeId: string): ScopedNodeRef {
  return { scopeId, nodeId };
}

function node(
  scopeId: string,
  nodeId: string,
  label: string,
  overrides: Partial<ContextOntologyNodeInput> = {},
): ContextOntologyNodeInput {
  return {
    ref: ref(scopeId, nodeId),
    label,
    meaning: `Meaning for ${scopeId}/${nodeId}`,
    useWhen: [`use ${nodeId}`],
    doNotUseWhen: [`do not use ${nodeId}`],
    examples: [`example ${nodeId}`],
    relationshipRefs: [],
    ...overrides,
  };
}

const policy: ContextPolicy = {
  trustMode: 'suggest_first',
  autoApplyEnabled: false,
  maxAutoApplyRiskScore: 0,
  approvalRequiredFor: ['base_profile_mutation'],
  forbiddenSilentMutations: ['base_profile', 'profile_branch'],
  coreMutationRule: 'explicitUserIntentOrCrossScopeEvidenceOnly',
  opsMustUseNodeRef: true,
};

function baseInput(overrides: Partial<ConceptualizeContextSelectorInput> = {}): ConceptualizeContextSelectorInput {
  return {
    focal: {
      kind: 'capture',
      id: 'capture-1',
      summary: 'Urban night image with city lights',
      nodeRefs: [ref('night-photography', 'urban_night')],
      sourceIds: ['capture-1'],
    },
    ontologyNodes: [
      node('night-photography', 'urban_night', 'Category'),
      node('photography-core', 'category', 'Category'),
      node('photography-core', 'exposure', 'Exposure'),
    ],
    evidenceClaims: [],
    proposalSnapshots: [],
    proposalEventSignals: [],
    caps: {
      maxNodes: 1,
      maxEvidenceClaims: 1,
      maxProposals: 1,
      maxProposalEvents: 1,
      maxGraphNeighbors: 1,
    },
    ...overrides,
  };
}

function checkerInput(overrides: Partial<CheckerContextSelectorInput> = {}): CheckerContextSelectorInput {
  return {
    ...baseInput(),
    focal: {
      kind: 'checkerRun',
      id: 'checker-run-1',
      summary: 'Review branch-local classification drift',
      nodeRefs: [ref('react-project', 'effect')],
      sourceIds: ['checker-run-1'],
    },
    ontologyNodes: [
      node('react-project', 'effect', 'Effect'),
      node('react-project', 'closure', 'Closure'),
      node('coding-core', 'effect', 'Effect'),
    ],
    ...overrides,
  };
}

describe('context selector', () => {
  it('pins the focal ontology node and same-label ambiguity siblings before elastic nodes', () => {
    const selection = selectConceptualizeContext(baseInput());

    expect(selection.consumer).toBe('conceptualize');
    expect(selection.ontologyNodes.map((entry) => scopedNodeRefKey(entry.ref))).toEqual([
      'night-photography:urban_night',
      'photography-core:category',
    ]);
    expect(selection.ontologyNodes.map((entry) => entry.pinned)).toEqual([true, true]);
    expect(selection.trace).toEqual(expect.arrayContaining([
      {
        candidateId: 'night-photography:urban_night',
        section: 'ontology',
        bucket: 'pinned',
        reason: 'focal',
      },
      {
        candidateId: 'photography-core:category',
        section: 'ontology',
        bucket: 'pinned',
        reason: 'sameLabelAmbiguity',
      },
      {
        candidateId: 'photography-core:exposure',
        section: 'ontology',
        bucket: 'omitted',
        reason: 'cap',
      },
    ]));
  });

  it('feeds selected Conceptualize context into the existing ContextPack assembler', () => {
    const selection = selectConceptualizeContext(baseInput());
    const pack = assembleContextPack({
      packId: 'pack-1',
      createdAt: 100,
      consumer: selection.consumer,
      focal: selection.focal,
      compositionStamp: {
        baseProfileId: 'photography-core',
        activeProfileId: 'photography-runtime',
        branchOrder: [{ branchId: 'night-photography', kind: 'project' }],
        compositionHash: 'hash-1',
      },
      scopeLegend: {
        activeScopeId: 'night-photography',
        scopes: [
          { scopeId: 'photography-core', label: 'Photography Core', kind: 'baseProfile' },
          { scopeId: 'night-photography', label: 'Night Photography', kind: 'branch' },
        ],
      },
      ontologyNodes: selection.ontologyNodes,
      evidenceClaims: selection.evidenceClaims,
      proposalSnapshots: selection.proposalSnapshots,
      proposalEventSignals: selection.proposalEventSignals,
      policy,
      caps: selection.caps,
    });

    expect(validateContextPack(pack)).toEqual({
      valid: true,
      errors: [],
    });
    expect(pack.ontology.sameLabelSiblings).toHaveLength(1);
  });

  it('feeds selected checker context into the existing ContextPack assembler with advisory user-fit', () => {
    const selector = createCheckerContextSelector();
    const selection = selector.select(checkerInput({
      userFitNodeSignals: [
        {
          signalId: 'node:react-project:effect',
          baseProfileId: 'coding',
          activeSelectionKey: 'base:coding|project:react-project|learning:-|personal:-',
          activeSelectionSnapshot: {
            baseProfileId: 'coding',
            projectBranchIds: ['react-project'],
            learningBranchIds: [],
            personalBranchIds: [],
          },
          nodeId: 'effect',
          nodeRefs: [ref('react-project', 'effect')],
          userFitConfidence: 0.82,
          score: 0.64,
          positiveCorrectionCount: 4,
          negativeCorrectionCount: 0,
          missingConceptCorrectionCount: 1,
          nearMissHitCount: 1,
          evidenceIds: ['evidence-2', 'evidence-1'],
          latestAt: 40,
        },
        {
          signalId: 'node:react-project:closure',
          baseProfileId: 'coding',
          activeSelectionKey: 'base:coding|project:react-project|learning:-|personal:-',
          activeSelectionSnapshot: {
            baseProfileId: 'coding',
            projectBranchIds: ['react-project'],
            learningBranchIds: [],
            personalBranchIds: [],
          },
          nodeId: 'closure',
          nodeRefs: [ref('react-project', 'closure')],
          userFitConfidence: 0.3,
          score: -0.4,
          positiveCorrectionCount: 0,
          negativeCorrectionCount: 2,
          missingConceptCorrectionCount: 0,
          nearMissHitCount: 0,
          evidenceIds: ['evidence-3'],
          latestAt: 30,
        },
      ],
      userFitProposalSignals: [
        {
          signalId: 'proposal:classification_patch:profile_branch:react-project',
          baseProfileId: 'coding',
          proposalKind: 'classification_patch',
          target: { kind: 'profile_branch', branchId: 'react-project' },
          targetKey: 'profile_branch:react-project',
          userFitConfidence: 0.76,
          score: 0.52,
          appliedCount: 2,
          rejectedCount: 0,
          postponedCount: 0,
          askedWhyCount: 1,
          eventIds: ['event-2', 'event-1'],
          latestAt: 50,
        },
        {
          signalId: 'proposal:ontology_node_patch:base_profile:coding',
          baseProfileId: 'coding',
          proposalKind: 'ontology_node_patch',
          target: { kind: 'base_profile', profileId: 'coding' },
          targetKey: 'base_profile:coding',
          userFitConfidence: 0.25,
          score: -0.5,
          appliedCount: 0,
          rejectedCount: 2,
          postponedCount: 0,
          askedWhyCount: 0,
          eventIds: ['event-3'],
          latestAt: 20,
        },
      ],
      caps: {
        maxNodes: 1,
        maxUserFitNodeSignals: 1,
        maxUserFitProposalSignals: 1,
      },
    }));

    expect(selection.consumer).toBe('checker');
    expect(selection.focal.kind).toBe('checkerRun');
    expect(selection.userFitNodeSignals.map((signal) => signal.signalId))
      .toEqual(['node:react-project:effect']);
    expect(selection.userFitProposalSignals.map((signal) => signal.signalId))
      .toEqual(['proposal:classification_patch:profile_branch:react-project']);
    expect(selection.trace).toEqual(expect.arrayContaining([
      {
        candidateId: 'node:react-project:closure',
        section: 'userFit',
        bucket: 'omitted',
        reason: 'cap',
      },
      {
        candidateId: 'proposal:ontology_node_patch:base_profile:coding',
        section: 'userFit',
        bucket: 'omitted',
        reason: 'cap',
      },
    ]));

    const pack = assembleContextPack({
      packId: 'checker-pack-1',
      createdAt: 200,
      consumer: selection.consumer,
      focal: selection.focal,
      compositionStamp: {
        baseProfileId: 'coding',
        activeProfileId: 'coding-react-runtime',
        branchOrder: [{ branchId: 'react-project', kind: 'project' }],
        compositionHash: 'hash-checker-1',
      },
      scopeLegend: {
        activeScopeId: 'react-project',
        scopes: [
          { scopeId: 'coding', label: 'Coding Core', kind: 'baseProfile' },
          { scopeId: 'react-project', label: 'React Project', kind: 'branch' },
        ],
      },
      ontologyNodes: selection.ontologyNodes,
      evidenceClaims: selection.evidenceClaims,
      proposalSnapshots: selection.proposalSnapshots,
      proposalEventSignals: selection.proposalEventSignals,
      userFitNodeSignals: selection.userFitNodeSignals,
      userFitProposalSignals: selection.userFitProposalSignals,
      policy,
      caps: selection.caps,
    });

    expect(validateContextPack(pack)).toEqual({
      valid: true,
      errors: [],
    });
    expect(pack.consumer).toBe('checker');
    expect(pack.userFit.nodeSignals.map((signal) => signal.signalId))
      .toEqual(['node:react-project:effect']);
    expect(pack.userFit.omittedNodeSignalCount).toBe(0);
  });

  it('keeps same-label ambiguity siblings when the selected node is elastic', () => {
    const selection = selectConceptualizeContext(baseInput({
      focal: {
        kind: 'capture',
        id: 'capture-1',
        summary: 'Image with a new exposure pattern',
        sourceIds: ['capture-1'],
      },
      ontologyNodes: [
        node('photography-core', 'category', 'Category'),
        node('night-photography', 'urban_night', 'Category'),
        node('photography-core', 'exposure', 'Exposure'),
      ],
      caps: {
        maxNodes: 1,
      },
    }));

    expect(selection.ontologyNodes.map((entry) => scopedNodeRefKey(entry.ref))).toEqual([
      'photography-core:category',
      'night-photography:urban_night',
    ]);
    expect(selection.ontologyNodes.map((entry) => entry.pinned)).toEqual([false, true]);
    expect(selection.trace).toEqual(expect.arrayContaining([
      {
        candidateId: 'photography-core:category',
        section: 'ontology',
        bucket: 'elastic',
        reason: 'callerPriority',
      },
      {
        candidateId: 'night-photography:urban_night',
        section: 'ontology',
        bucket: 'pinned',
        reason: 'sameLabelAmbiguity',
      },
      {
        candidateId: 'photography-core:exposure',
        section: 'ontology',
        bucket: 'omitted',
        reason: 'cap',
      },
    ]));
  });

  it('pins cross-scope and direct-reference evidence ahead of caller order', () => {
    const selection = selectConceptualizeContext(baseInput({
      evidenceClaims: [
        {
          evidenceId: 'elastic-old',
          correctedNodeRef: ref('photography-core', 'exposure'),
          patternFrequency: 1,
          latestAt: 10,
          crossScope: false,
          sourceIds: ['capture-2'],
        },
        {
          evidenceId: 'cross-scope',
          previousNodeRef: ref('photography-core', 'category'),
          correctedNodeRef: ref('night-photography', 'urban_night'),
          reason: 'Branch meaning differs from core category',
          patternFrequency: 3,
          latestAt: 20,
          crossScope: true,
          sourceIds: ['capture-3'],
        },
        {
          evidenceId: 'direct-current-node',
          correctedNodeRef: ref('night-photography', 'urban_night'),
          patternFrequency: 2,
          latestAt: 30,
          crossScope: false,
          sourceIds: ['capture-4'],
        },
      ],
      caps: {
        maxNodes: 1,
        maxEvidenceClaims: 1,
      },
    }));

    expect(selection.evidenceClaims.map((claim) => claim.evidenceId)).toEqual([
      'cross-scope',
      'direct-current-node',
    ]);
    expect(selection.evidenceClaims.map((claim) => claim.pinned)).toEqual([true, true]);
    expect(selection.trace).toEqual(expect.arrayContaining([
      {
        candidateId: 'cross-scope',
        section: 'evidence',
        bucket: 'pinned',
        reason: 'crossScopeEvidence',
      },
      {
        candidateId: 'direct-current-node',
        section: 'evidence',
        bucket: 'pinned',
        reason: 'directReference',
      },
      {
        candidateId: 'elastic-old',
        section: 'evidence',
        bucket: 'omitted',
        reason: 'cap',
      },
    ]));
  });

  it('keeps evidence for elastic ontology nodes capped while pinning decision-center evidence', () => {
    const selection = selectConceptualizeContext(baseInput({
      ontologyNodes: [
        node('night-photography', 'urban_night', 'Urban Night'),
        node('photography-core', 'exposure', 'Exposure'),
      ],
      evidenceClaims: [
        {
          evidenceId: 'elastic-exposure-history',
          correctedNodeRef: ref('photography-core', 'exposure'),
          patternFrequency: 8,
          latestAt: 40,
          crossScope: false,
          sourceIds: ['capture-9'],
        },
        {
          evidenceId: 'direct-focal-history',
          subjectNodeRef: ref('night-photography', 'urban_night'),
          patternFrequency: 2,
          latestAt: 50,
          crossScope: false,
          sourceIds: ['capture-10'],
        },
      ],
      caps: {
        maxNodes: 2,
        maxEvidenceClaims: 1,
      },
    }));

    expect(selection.ontologyNodes.map((entry) => [
      scopedNodeRefKey(entry.ref),
      entry.pinned,
    ])).toEqual([
      ['night-photography:urban_night', true],
      ['photography-core:exposure', false],
    ]);
    expect(selection.evidenceClaims.map((claim) => claim.evidenceId)).toEqual([
      'direct-focal-history',
    ]);
    expect(selection.trace).toEqual(expect.arrayContaining([
      {
        candidateId: 'direct-focal-history',
        section: 'evidence',
        bucket: 'pinned',
        reason: 'directReference',
      },
      {
        candidateId: 'elastic-exposure-history',
        section: 'evidence',
        bucket: 'omitted',
        reason: 'cap',
      },
    ]));
  });

  it('pins explicitly referenced evidence ids without widening ontology selection', () => {
    const selection = selectConceptualizeContext(baseInput({
      pinnedEvidenceIds: ['manual-proof'],
      evidenceClaims: [
        {
          evidenceId: 'manual-proof',
          patternFrequency: 1,
          latestAt: 70,
          crossScope: false,
          sourceIds: ['capture-12'],
        },
        {
          evidenceId: 'unrelated-recent',
          patternFrequency: 10,
          latestAt: 80,
          crossScope: false,
          sourceIds: ['capture-13'],
        },
      ],
      caps: {
        maxNodes: 1,
        maxEvidenceClaims: 0,
      },
    }));

    expect(selection.evidenceClaims.map((claim) => claim.evidenceId)).toEqual(['manual-proof']);
    expect(selection.trace).toEqual(expect.arrayContaining([
      {
        candidateId: 'manual-proof',
        section: 'evidence',
        bucket: 'pinned',
        reason: 'directReference',
      },
      {
        candidateId: 'unrelated-recent',
        section: 'evidence',
        bucket: 'omitted',
        reason: 'cap',
      },
    ]));
  });

  it('honors caller-pinned evidence without requiring node references', () => {
    const selection = selectConceptualizeContext(baseInput({
      evidenceClaims: [
        {
          evidenceId: 'caller-pinned-note',
          pinned: true,
          patternFrequency: 1,
          latestAt: 90,
          crossScope: false,
          sourceIds: ['capture-14'],
        },
      ],
      caps: {
        maxEvidenceClaims: 0,
      },
    }));

    expect(selection.evidenceClaims).toEqual([
      expect.objectContaining({
        evidenceId: 'caller-pinned-note',
        pinned: true,
      }),
    ]);
    expect(selection.trace).toEqual(expect.arrayContaining([
      {
        candidateId: 'caller-pinned-note',
        section: 'evidence',
        bucket: 'pinned',
        reason: 'callerPriority',
      },
    ]));
  });

  it('pins evidence for same-label ambiguity nodes that were pulled into the decision center', () => {
    const selection = selectConceptualizeContext(baseInput({
      evidenceClaims: [
        {
          evidenceId: 'same-label-core-history',
          correctedNodeRef: ref('photography-core', 'category'),
          patternFrequency: 2,
          latestAt: 100,
          crossScope: false,
          sourceIds: ['capture-15'],
        },
      ],
      caps: {
        maxNodes: 1,
        maxEvidenceClaims: 0,
      },
    }));

    expect(selection.ontologyNodes.map((entry) => [
      scopedNodeRefKey(entry.ref),
      entry.pinned,
    ])).toEqual([
      ['night-photography:urban_night', true],
      ['photography-core:category', true],
    ]);
    expect(selection.evidenceClaims.map((claim) => claim.evidenceId)).toEqual([
      'same-label-core-history',
    ]);
    expect(selection.trace).toEqual(expect.arrayContaining([
      {
        candidateId: 'same-label-core-history',
        section: 'evidence',
        bucket: 'pinned',
        reason: 'directReference',
      },
    ]));
  });

  it('pins explicitly referenced proposals and proposal events while capping elastic entries', () => {
    const selection = selectConceptualizeContext(baseInput({
      pinnedProposalIds: ['proposal-b'],
      pinnedProposalEventIds: ['event-b'],
      proposalSnapshots: [
        {
          proposalId: 'proposal-a',
          proposalKind: 'ontology_node_patch',
          target: { kind: 'profile_branch', branchId: 'night-photography' },
          status: 'pending',
          title: 'A',
          summary: 'A',
          riskScore: 0.1,
          evidenceIds: [],
          nodeRefs: [],
        },
        {
          proposalId: 'proposal-b',
          proposalKind: 'ontology_node_patch',
          target: { kind: 'base_profile', profileId: 'photography-core' },
          status: 'pending',
          title: 'B',
          summary: 'B',
          riskScore: 0.8,
          evidenceIds: [],
          nodeRefs: [],
        },
      ],
      proposalEventSignals: [
        {
          eventId: 'event-a',
          proposalId: 'proposal-a',
          action: 'postponed',
          createdAt: 10,
        },
        {
          eventId: 'event-b',
          proposalId: 'proposal-b',
          action: 'asked_why',
          createdAt: 20,
        },
      ],
      caps: {
        maxProposals: 1,
        maxProposalEvents: 1,
      },
    }));

    expect(selection.proposalSnapshots.map((proposal) => proposal.proposalId)).toEqual(['proposal-b']);
    expect(selection.proposalEventSignals.map((event) => event.eventId)).toEqual(['event-b']);
    expect(selection.trace).toEqual(expect.arrayContaining([
      {
        candidateId: 'proposal-b',
        section: 'proposals',
        bucket: 'pinned',
        reason: 'directReference',
      },
      {
        candidateId: 'proposal-a',
        section: 'proposals',
        bucket: 'omitted',
        reason: 'cap',
      },
      {
        candidateId: 'event-b',
        section: 'proposalEvents',
        bucket: 'pinned',
        reason: 'directReference',
      },
    ]));
  });

  it('pins explicit required node refs and their direct evidence', () => {
    const selector = createConceptualizeContextSelector();
    const selection = selector.select(baseInput({
      focal: {
        kind: 'capture',
        id: 'capture-1',
        summary: 'Image with a manual exposure correction',
        sourceIds: ['capture-1'],
      },
      requiredNodeRefs: [ref('photography-core', 'exposure')],
      ontologyNodes: [
        node('night-photography', 'urban_night', 'Urban Night'),
        node('photography-core', 'exposure', 'Exposure'),
      ],
      evidenceClaims: [
        {
          evidenceId: 'required-node-evidence',
          correctedNodeRef: ref('photography-core', 'exposure'),
          patternFrequency: 1,
          latestAt: 60,
          crossScope: false,
          sourceIds: ['capture-11'],
        },
      ],
      caps: {
        maxNodes: 1,
        maxEvidenceClaims: 0,
      },
    }));

    expect(selection.ontologyNodes.map((entry) => [
      scopedNodeRefKey(entry.ref),
      entry.pinned,
    ])).toEqual([
      ['photography-core:exposure', true],
    ]);
    expect(selection.evidenceClaims.map((claim) => claim.evidenceId)).toEqual([
      'required-node-evidence',
    ]);
    expect(selection.trace).toEqual(expect.arrayContaining([
      {
        candidateId: 'photography-core:exposure',
        section: 'ontology',
        bucket: 'pinned',
        reason: 'directReference',
      },
      {
        candidateId: 'required-node-evidence',
        section: 'evidence',
        bucket: 'pinned',
        reason: 'directReference',
      },
    ]));
  });

  it('handles minimal input with empty optional context', () => {
    const selection = selectConceptualizeContext({
      focal: {
        kind: 'capture',
        id: 'capture-empty',
        summary: '',
      },
    });

    expect(selection.consumer).toBe('conceptualize');
    expect(selection.ontologyNodes).toEqual([]);
    expect(selection.evidenceClaims).toEqual([]);
    expect(selection.proposalSnapshots).toEqual([]);
    expect(selection.proposalEventSignals).toEqual([]);
    expect(selection.userFitNodeSignals).toEqual([]);
    expect(selection.userFitProposalSignals).toEqual([]);
    expect(selection.graph).toBeUndefined();
    expect(selection.caps).toBeUndefined();
    expect(selection.trace).toEqual([]);
  });

  it('handles minimal checker input with empty optional context', () => {
    const selection = selectCheckerContext({
      focal: {
        kind: 'checkerRun',
        id: 'checker-empty',
        summary: '',
      },
    });

    expect(selection.consumer).toBe('checker');
    expect(selection.focal.kind).toBe('checkerRun');
    expect(selection.ontologyNodes).toEqual([]);
    expect(selection.evidenceClaims).toEqual([]);
    expect(selection.proposalSnapshots).toEqual([]);
    expect(selection.proposalEventSignals).toEqual([]);
    expect(selection.userFitNodeSignals).toEqual([]);
    expect(selection.userFitProposalSignals).toEqual([]);
    expect(selection.graph).toBeUndefined();
    expect(selection.caps).toBeUndefined();
    expect(selection.trace).toEqual([]);
  });

  it('keeps selected graph nodes pinned and caps caller-supplied neighbors', () => {
    const selection = selectConceptualizeContext(baseInput({
      graph: {
        selectedNodeRefs: [ref('night-photography', 'urban_night')],
        neighborNodeRefs: [
          ref('night-photography', 'blue_hour_cityscape'),
          ref('night-photography', 'neon_street'),
        ],
        expansionDepth: 1,
      },
      caps: {
        maxGraphNeighbors: 1,
      },
    }));

    expect(selection.graph).toEqual({
      selectedNodeRefs: [ref('night-photography', 'urban_night')],
      neighborNodeRefs: [ref('night-photography', 'blue_hour_cityscape')],
      expansionDepth: 1,
    });
    expect(selection.trace).toEqual(expect.arrayContaining([
      {
        candidateId: 'night-photography:urban_night',
        section: 'graph',
        bucket: 'pinned',
        reason: 'focal',
      },
      {
        candidateId: 'night-photography:neon_street',
        section: 'graph',
        bucket: 'omitted',
        reason: 'cap',
      },
    ]));
  });

  it('is deterministic and does not mutate caller input objects', () => {
    const input = baseInput();
    const before = JSON.stringify(input);
    const first = selectConceptualizeContext(input);
    const second = selectConceptualizeContext(input);

    expect(first).toEqual(second);
    expect(JSON.stringify(input)).toBe(before);
    expect(first.ontologyNodes[0]).not.toBe(input.ontologyNodes?.[0]);
    expect(first.focal).not.toBe(input.focal);
  });

  it('keeps contextSelector source pure and free of runtime dependencies', () => {
    const repoRoot = path.resolve(__dirname, '../../../..');
    const source = fs.readFileSync(
      path.join(repoRoot, 'src/features/ontology/contextSelector.ts'),
      'utf8',
    );

    expect(source).not.toMatch(
      /from\s+['"][^'"]*(?:db\/|\/db|features\/backup|features\/learning|features\/graph|ai\/|react|react-native|expo|zustand|@tanstack)[^'"]*['"]/,
    );
    expect(source).not.toMatch(/render\w*Prompt|toPrompt|SystemPrompt|formatPrompt/i);
    expect(source).not.toMatch(/\bapplyProfile|applyMutation|mutateProfile\b/);
  });
});
