import { describe, expect, it } from 'vitest';
import {
  assembleContextPack,
  assertValidContextPack,
  scopedNodeRefKey,
  serializeContextPack,
  validateContextPack,
} from '../contextAssembly';
import type {
  AssembleContextPackInput,
  ContextOntologyNodeInput,
  ContextPack,
  ContextPolicy,
  ScopedNodeRef,
} from '../contextAssembly';

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

function baseInput(overrides: Partial<AssembleContextPackInput> = {}): AssembleContextPackInput {
  return {
    packId: 'pack-1',
    createdAt: 100,
    consumer: 'conceptualize',
    focal: {
      kind: 'capture',
      id: 'capture-1',
      summary: 'Urban night image with city lights',
      nodeRefs: [ref('night-photography', 'urban_night')],
    },
    compositionStamp: {
      baseProfileId: 'photography-core',
      activeProfileId: 'photography-runtime',
      branchOrder: [
        {
          branchId: 'night-photography',
          kind: 'project',
        },
      ],
      compositionHash: 'hash-1',
    },
    scopeLegend: {
      activeScopeId: 'night-photography',
      scopes: [
        {
          scopeId: 'photography-core',
          label: 'Photography Core',
          kind: 'baseProfile',
        },
        {
          scopeId: 'night-photography',
          label: 'Night Photography branch',
          kind: 'branch',
        },
      ],
    },
    ontologyNodes: [
      node('photography-core', 'category', 'Category', { pinned: true }),
      node('night-photography', 'night_photo_subarea', 'Category'),
      node('photography-core', 'exposure', 'Exposure'),
    ],
    evidenceClaims: [],
    proposalSnapshots: [],
    proposalEventSignals: [],
    policy,
    caps: {
      maxNodes: 1,
      maxEvidenceClaims: 1,
      maxProposals: 1,
      maxProposalEvents: 1,
      maxGraphNeighbors: 1,
    },
    expandHandles: {},
    ...overrides,
  };
}

describe('context assembly', () => {
  it('assembles a valid typed pack with a mandatory composition stamp', () => {
    const pack = assembleContextPack(baseInput());

    expect(pack.packVersion).toBe('context-pack-v1');
    expect(pack.compositionStamp).toEqual({
      baseProfileId: 'photography-core',
      activeProfileId: 'photography-runtime',
      branchOrder: [
        {
          branchId: 'night-photography',
          kind: 'project',
        },
      ],
      compositionHash: 'hash-1',
    });
    expect(validateContextPack(pack)).toEqual({
      valid: true,
      errors: [],
    });
    expect(() => assertValidContextPack(pack)).not.toThrow();
  });

  it('keeps same-label scoped sibling nodes even when the node cap would drop one', () => {
    const pack = assembleContextPack(baseInput());

    expect(pack.ontology.nodes.map((entry) => scopedNodeRefKey(entry.ref))).toEqual([
      'photography-core:category',
      'night-photography:night_photo_subarea',
    ]);
    expect(pack.ontology.sameLabelSiblings).toEqual([
      {
        label: 'Category',
        normalizedLabel: 'category',
        nodeRefs: [
          ref('photography-core', 'category'),
          ref('night-photography', 'night_photo_subarea'),
        ],
      },
    ]);
    expect(pack.budgetReport.included['ontology.nodes']).toBe(2);
    expect(pack.budgetReport.omitted['ontology.nodes']).toBe(1);
  });

  it('pins a unique ontology node without relying on same-label sibling expansion', () => {
    const pack = assembleContextPack(baseInput({
      ontologyNodes: [
        node('photography-core', 'exposure', 'Exposure'),
        node('photography-core', 'category', 'Category', { pinned: true }),
      ],
      caps: {
        maxNodes: 1,
      },
    }));

    expect(pack.ontology.nodes.map((entry) => scopedNodeRefKey(entry.ref))).toEqual([
      'photography-core:category',
    ]);
    expect(pack.budgetReport.omitted['ontology.nodes']).toBe(1);
  });

  it('pins cross-scope evidence ahead of caller order when caps are tight', () => {
    const pack = assembleContextPack(baseInput({
      evidenceClaims: [
        {
          evidenceId: 'branch-local',
          correctedNodeRef: ref('night-photography', 'urban_night'),
          patternFrequency: 1,
          latestAt: 10,
          crossScope: false,
          sourceIds: ['capture-1'],
        },
        {
          evidenceId: 'cross-scope',
          previousNodeRef: ref('photography-core', 'astrophotography'),
          correctedNodeRef: ref('night-photography', 'urban_night'),
          reason: 'City lights, not stars',
          patternFrequency: 3,
          latestAt: 20,
          crossScope: true,
          sourceIds: ['capture-2', 'capture-3'],
        },
      ],
      caps: {
        maxEvidenceClaims: 1,
      },
    }));

    expect(pack.evidence.claims.map((claim) => claim.evidenceId)).toEqual(['cross-scope']);
    expect(pack.evidence.omittedCount).toBe(1);
  });

  it('uses caller ordering plus deterministic caps for graph neighbors', () => {
    const pack = assembleContextPack(baseInput({
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

    expect(pack.graph).toEqual({
      selectedNodeRefs: [ref('night-photography', 'urban_night')],
      neighborNodeRefs: [ref('night-photography', 'blue_hour_cityscape')],
      expansionDepth: 1,
      omittedNeighborCount: 1,
    });
  });

  it('serializes byte-identically for semantically identical packs regardless of object key insertion order', () => {
    const first = assembleContextPack(baseInput({
      expandHandles: {
        b: { kind: 'evidence', id: 'evidence-b', reason: 'B' },
        a: { kind: 'evidence', id: 'evidence-a', reason: 'A' },
      },
    }));
    const second = assembleContextPack(baseInput({
      expandHandles: {
        a: { reason: 'A', id: 'evidence-a', kind: 'evidence' },
        b: { reason: 'B', id: 'evidence-b', kind: 'evidence' },
      },
    }));

    expect(serializeContextPack(first)).toBe(serializeContextPack(second));
    expect(serializeContextPack(first)).toContain('"compositionStamp"');
  });

  it('rejects missing branchOrder because it is part of composition identity', () => {
    const pack = assembleContextPack(baseInput()) as ContextPack;
    const invalid = {
      ...pack,
      compositionStamp: {
        baseProfileId: 'photography-core',
        activeProfileId: 'photography-runtime',
        compositionHash: 'hash-1',
      },
    } as unknown as ContextPack;

    const result = validateContextPack(invalid);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      code: 'missing-branch-order',
      path: 'compositionStamp.branchOrder',
      message: 'branchOrder must be present, even when no branches are active.',
    });
  });

  it('rejects malformed branchOrder entries', () => {
    const pack = assembleContextPack(baseInput()) as ContextPack;
    const invalid = {
      ...pack,
      compositionStamp: {
        ...pack.compositionStamp,
        branchOrder: [
          {
            branchId: '',
            kind: 'global',
          },
        ],
      },
    } as unknown as ContextPack;

    const result = validateContextPack(invalid);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      code: 'invalid-branch-order',
      path: 'compositionStamp.branchOrder[0]',
      message: 'branchOrder entries require branchId and kind.',
    });
  });

  it('accepts an empty branchOrder because the field must exist even without active branches', () => {
    const pack = assembleContextPack(baseInput({
      compositionStamp: {
        baseProfileId: 'photography-core',
        activeProfileId: 'photography-runtime',
        branchOrder: [],
        compositionHash: 'hash-1',
      },
    }));

    expect(validateContextPack(pack)).toEqual({
      valid: true,
      errors: [],
    });
  });

  it('rejects a missing composition stamp', () => {
    const pack = assembleContextPack(baseInput()) as ContextPack;
    const invalid = {
      ...pack,
      compositionStamp: undefined,
    } as unknown as ContextPack;

    const result = validateContextPack(invalid);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      code: 'missing-composition-stamp',
      path: 'compositionStamp',
      message: 'ContextPack requires baseProfileId, activeProfileId, and compositionHash.',
    });
  });

  it('rejects invalid scoped node refs', () => {
    const pack = assembleContextPack(baseInput()) as ContextPack;
    const invalid = {
      ...pack,
      ontology: {
        ...pack.ontology,
        nodes: [
          {
            ...pack.ontology.nodes[0],
            ref: {
              scopeId: '',
              nodeId: 'category',
            },
          },
        ],
      },
    } as ContextPack;

    const result = validateContextPack(invalid);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      code: 'invalid-node-ref',
      path: 'ontology.nodes[0].ref',
      message: 'Ontology references must include scopeId and nodeId.',
    });
  });

  it('rejects evidence that omits crossScope', () => {
    const pack = assembleContextPack(baseInput({
      evidenceClaims: [
        {
          evidenceId: 'evidence-1',
          correctedNodeRef: ref('night-photography', 'urban_night'),
          patternFrequency: 1,
          latestAt: 10,
          crossScope: false,
          sourceIds: ['capture-1'],
        },
      ],
    })) as ContextPack;
    const invalid = {
      ...pack,
      evidence: {
        ...pack.evidence,
        claims: [
          {
            evidenceId: 'evidence-1',
            correctedNodeRef: ref('night-photography', 'urban_night'),
            patternFrequency: 1,
            latestAt: 10,
            sourceIds: ['capture-1'],
          },
        ],
      },
    } as unknown as ContextPack;

    const result = validateContextPack(invalid);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      code: 'missing-cross-scope',
      path: 'evidence.claims[0].crossScope',
      message: 'Every evidence claim must explicitly state crossScope.',
    });
  });

  it('rejects missing structured policy requirements', () => {
    const pack = assembleContextPack(baseInput()) as ContextPack;
    const invalid = {
      ...pack,
      policy: {
        ...pack.policy,
        opsMustUseNodeRef: false,
        coreMutationRule: 'proseOnly',
      },
    } as unknown as ContextPack;

    const result = validateContextPack(invalid);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      code: 'missing-policy',
      path: 'policy.opsMustUseNodeRef',
      message: 'ContextPack policy must require scoped node refs.',
    });
    expect(result.errors).toContainEqual({
      code: 'missing-policy',
      path: 'policy.coreMutationRule',
      message: 'ContextPack policy must encode the base/core mutation rule.',
    });
  });

  it('rejects missing same-label sibling groups for different scoped meanings', () => {
    const pack = assembleContextPack(baseInput()) as ContextPack;
    const invalid = {
      ...pack,
      ontology: {
        ...pack.ontology,
        sameLabelSiblings: [],
      },
    };

    const result = validateContextPack(invalid);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      code: 'missing-same-label-siblings',
      path: 'ontology.sameLabelSiblings',
      message: 'Same-label scoped meanings for "Category" must be listed explicitly.',
    });
  });

  it('rejects same-label sibling groups that do not match included ontology nodes', () => {
    const pack = assembleContextPack(baseInput()) as ContextPack;
    const invalid = {
      ...pack,
      ontology: {
        ...pack.ontology,
        sameLabelSiblings: [
          ...pack.ontology.sameLabelSiblings,
          {
            label: 'Ghost',
            normalizedLabel: 'ghost',
            nodeRefs: [
              ref('photography-core', 'ghost'),
              ref('night-photography', 'ghost_branch'),
            ],
          },
        ],
      },
    };

    const result = validateContextPack(invalid);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      code: 'invalid-same-label-siblings',
      path: 'ontology.sameLabelSiblings[1]',
      message: 'sameLabelSiblings[1] does not match included ontology nodes.',
    });
  });

  it('does not treat same-label inherited node ids as ambiguous scoped meanings', () => {
    const pack = assembleContextPack(baseInput({
      ontologyNodes: [
        node('photography-core', 'category', 'Category', { pinned: true }),
        node('night-photography', 'category', 'Category'),
      ],
      caps: {
        maxNodes: 1,
      },
    }));

    expect(pack.ontology.nodes.map((entry) => scopedNodeRefKey(entry.ref))).toEqual([
      'photography-core:category',
    ]);
    expect(pack.ontology.sameLabelSiblings).toEqual([]);
  });

  it('pins proposals and proposal events ahead of caller order when caps are tight', () => {
    const pack = assembleContextPack(baseInput({
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
          pinned: true,
        },
      ],
      proposalEventSignals: [
        {
          eventId: 'event-a',
          proposalId: 'proposal-a',
          action: 'postponed',
          createdAt: 1,
        },
        {
          eventId: 'event-b',
          proposalId: 'proposal-b',
          action: 'asked_why',
          createdAt: 2,
          pinned: true,
        },
      ],
      caps: {
        maxProposals: 1,
        maxProposalEvents: 1,
      },
    }));

    expect(pack.proposals.snapshots.map((proposal) => proposal.proposalId)).toEqual(['proposal-b']);
    expect(pack.proposals.aggregatedSignals).toMatchObject({
      pendingCount: 1,
      highestRiskScore: 0.8,
      branchLocalCount: 0,
      baseOrCoreTargetCount: 1,
    });
    expect(pack.proposalEvents.recentDecisionSignals.map((event) => event.eventId)).toEqual(['event-b']);
  });

  it('computes omitted counts after deduplication instead of counting duplicate inputs as drops', () => {
    const pack = assembleContextPack(baseInput({
      evidenceClaims: [
        {
          evidenceId: 'same-evidence',
          correctedNodeRef: ref('night-photography', 'urban_night'),
          patternFrequency: 1,
          latestAt: 10,
          crossScope: false,
          sourceIds: ['capture-1'],
        },
        {
          evidenceId: 'same-evidence',
          correctedNodeRef: ref('night-photography', 'urban_night'),
          patternFrequency: 1,
          latestAt: 10,
          crossScope: false,
          sourceIds: ['capture-1'],
        },
      ],
      caps: {
        maxEvidenceClaims: 10,
      },
    }));

    expect(pack.evidence.claims).toHaveLength(1);
    expect(pack.evidence.omittedCount).toBe(0);
    expect(pack.budgetReport.omitted['evidence.claims']).toBe(0);
  });

  it('throws a readable error when asserting an invalid pack', () => {
    const pack = assembleContextPack(baseInput()) as ContextPack;
    const invalid = {
      ...pack,
      compositionStamp: {
        baseProfileId: 'photography-core',
        activeProfileId: 'photography-runtime',
        compositionHash: 'hash-1',
      },
    } as unknown as ContextPack;

    expect(() => assertValidContextPack(invalid)).toThrow(
      /Invalid ContextPack: compositionStamp\.branchOrder: branchOrder must be present/,
    );
  });

  it('rejects label-only target keys anywhere in the pack', () => {
    const pack = assembleContextPack(baseInput()) as ContextPack;
    const forbiddenKey = ['target', 'Label'].join('');
    const invalid = {
      ...pack,
      proposals: {
        ...pack.proposals,
        snapshots: [
          {
            proposalId: 'proposal-1',
            proposalKind: 'ontology_node_patch',
            target: { kind: 'profile_branch', branchId: 'night-photography' },
            status: 'pending',
            title: 'Bad target',
            summary: 'Uses label-only targeting',
            riskScore: 0.3,
            evidenceIds: [],
            nodeRefs: [],
            [forbiddenKey]: 'Category',
          },
        ],
      },
    } as unknown as ContextPack;

    const result = validateContextPack(invalid);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      code: 'forbidden-label-target-key',
      path: `proposals.snapshots[0].${forbiddenKey}`,
      message: `${forbiddenKey} is a label-only ontology target. Use ScopedNodeRef instead.`,
    });
  });
});
