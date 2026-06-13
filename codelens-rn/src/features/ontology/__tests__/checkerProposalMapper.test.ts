import { describe, expect, it } from 'vitest';
import {
  CHECKER_BRANCH_LOCAL_ADDITIVE_RISK_SCORE,
  CHECKER_PROMPT_OUTPUT_VERSION,
  assembleContextPack,
  mapCheckerOutputToProfileChangeProposals,
} from '../index';
import { validateProfileChangeProposal } from '../codecs/profileChangeProposal';
import { createProposalEditorModel } from '../ui/profileProposalReviewPresentation';
import type {
  AssembleContextPackInput,
  CheckerPromptOutput,
  ContextOntologyNodeInput,
  ContextPack,
  ContextPolicy,
  ProfileChangeProposal,
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
    meaning: `Meaning for ${label}.`,
    useWhen: [`Use ${label}.`],
    doNotUseWhen: [`Do not use ${label}.`],
    examples: [`Example ${label}.`],
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

function makePack(overrides: Partial<AssembleContextPackInput> = {}): ContextPack {
  return assembleContextPack({
    packId: 'checker-pack-1',
    createdAt: 100,
    consumer: 'checker',
    focal: {
      kind: 'checkerRun',
      id: 'checker-run-1',
      summary: 'Review repeated React classification corrections.',
      nodeRefs: [ref('react-project', 'effect')],
      sourceIds: ['checker-run-1'],
    },
    compositionStamp: {
      baseProfileId: 'coding',
      activeProfileId: 'coding-runtime',
      branchOrder: [{ branchId: 'react-project', kind: 'project' }],
      compositionHash: 'hash-1',
    },
    scopeLegend: {
      activeScopeId: 'react-project',
      scopes: [
        { scopeId: 'coding', label: 'Coding Core', kind: 'baseProfile' },
        { scopeId: 'react-project', label: 'React Project', kind: 'branch' },
      ],
    },
    ontologyNodes: [
      node('react-project', 'effect', 'Effect', { pinned: true }),
      node('react-project', 'frontend', 'Frontend'),
      node('coding', 'concept', 'Concept'),
    ],
    evidenceClaims: [
      {
        evidenceId: 'evidence-1',
        previousNodeRef: ref('react-project', 'effect'),
        correctedNodeRef: ref('react-project', 'frontend'),
        reason: 'The user repeatedly corrected this toward frontend behavior.',
        patternFrequency: 3,
        latestAt: 90,
        crossScope: false,
        sourceIds: ['capture-1', 'capture-2'],
      },
    ],
    proposalSnapshots: [],
    proposalEventSignals: [],
    userFitNodeSignals: [],
    userFitProposalSignals: [],
    policy,
    caps: {
      maxNodes: 10,
      maxEvidenceClaims: 10,
      maxProposals: 10,
      maxProposalEvents: 10,
      maxUserFitNodeSignals: 10,
      maxUserFitProposalSignals: 10,
    },
    ...overrides,
  });
}

function outputWithLabels(labels: readonly string[]): CheckerPromptOutput {
  return {
    schemaVersion: CHECKER_PROMPT_OUTPUT_VERSION,
    explanation: {
      summary: 'Repeated corrections suggest missing branch-local concepts.',
      relationshipOrBoundaryObservations: ['A future boundary operation may be useful.'],
    },
    findings: labels.map((label) => ({
      kind: 'missing_branch_item_type' as const,
      label,
      parentNodeRef: ref('react-project', 'frontend'),
      meaning: `${label} is a missing branch-local React concept.`,
      rationale: `Evidence shows repeated corrections toward ${label}.`,
      evidenceIds: ['evidence-1'],
      semanticConfidence: 0.8,
    })),
  };
}

function mapOutput(input: {
  output?: CheckerPromptOutput | undefined;
  pack?: ContextPack | undefined;
  targetBranch?: { branchId: string; updatedAt: number } | null | undefined;
  existingPendingProposals?: readonly ProfileChangeProposal[] | undefined;
  maxProposals?: number | undefined;
} = {}) {
  return mapCheckerOutputToProfileChangeProposals({
    output: input.output ?? outputWithLabels(['React render timing']),
    pack: input.pack ?? makePack(),
    targetBranch: Object.prototype.hasOwnProperty.call(input, 'targetBranch')
      ? input.targetBranch ?? null
      : { branchId: 'react-project', updatedAt: 42 },
    existingPendingProposals: input.existingPendingProposals,
    now: 1000,
    createProposalId: (_finding, index) => `checker-proposal-${index + 1}`,
    maxProposals: input.maxProposals,
  });
}

function makeExistingPendingProposal(nodeId: string, overrides: Partial<ProfileChangeProposal> = {}): ProfileChangeProposal {
  return validateProfileChangeProposal({
    id: `existing-${nodeId}`,
    proposalKind: 'ontology_node_patch',
    sourceKind: 'checker',
    baseProfileId: 'coding',
    sourceBranchId: null,
    target: {
      kind: 'profile_branch',
      branchId: 'react-project',
    },
    targetProfileVersion: null,
    targetBranchUpdatedAt: 30,
    evidenceIds: ['evidence-1'],
    patch: {
      addOntologyNodes: [{
        id: nodeId,
        label: nodeId.replace(/_/g, ' '),
        kind: 'subcategory',
        parentId: 'frontend',
        meaning: 'Existing pending proposal.',
        useWhen: ['Use existing.'],
        doNotUseWhen: [],
        examples: [],
        relatedNodeIds: ['frontend'],
        contrastNodeIds: [],
        status: 'active',
        createdBy: 'model',
        createdAt: 1,
        updatedAt: 1,
      }],
      addItemTypeNodeIds: [nodeId],
    },
    title: 'Existing pending proposal',
    summary: 'Already pending.',
    reason: 'Already proposed.',
    riskScore: 20,
    semanticConfidence: 0.7,
    userFitConfidence: null,
    status: 'pending',
    supersededByProposalId: null,
    createdAt: 1,
    updatedAt: 1,
    reviewedAt: null,
    appliedAt: null,
    ...overrides,
  });
}

describe('checker proposal mapper', () => {
  it('maps one validated checker finding into a pinned branch-local proposal shape', () => {
    const result = mapOutput();
    const proposal = result.proposals[0];
    if (!proposal) throw new Error('Expected proposal');

    expect(result.explanation.relationshipOrBoundaryObservations).toEqual([
      'A future boundary operation may be useful.',
    ]);
    expect(proposal).toMatchObject({
      id: 'checker-proposal-1',
      proposalKind: 'ontology_node_patch',
      sourceKind: 'checker',
      baseProfileId: 'coding',
      sourceBranchId: null,
      target: {
        kind: 'profile_branch',
        branchId: 'react-project',
      },
      targetProfileVersion: null,
      targetBranchUpdatedAt: 42,
      evidenceIds: ['evidence-1'],
      title: 'Add React render timing type',
      summary: 'Create React render timing as a branch-local item type after checker review.',
      reason: 'Evidence shows repeated corrections toward React render timing.',
      riskScore: CHECKER_BRANCH_LOCAL_ADDITIVE_RISK_SCORE,
      semanticConfidence: 0.8,
      userFitConfidence: null,
      status: 'pending',
      supersededByProposalId: null,
    });
    expect(proposal.patch.addItemTypeNodeIds).toEqual(['react_render_timing']);
    expect(proposal.patch.addOntologyNodes?.[0]).toMatchObject({
      id: 'react_render_timing',
      label: 'React render timing',
      kind: 'subcategory',
      parentId: 'frontend',
      meaning: 'React render timing is a missing branch-local React concept.',
      relatedNodeIds: [],
      status: 'active',
      createdBy: 'model',
      createdAt: 1000,
      updatedAt: 1000,
    });
    expect(() => validateProfileChangeProposal(proposal)).not.toThrow();
    expect(createProposalEditorModel(proposal)).toMatchObject({ canEdit: true });
  });

  it('keeps the existing codec evidence guard active by pinning sourceBranchId to null', () => {
    const proposal = mapOutput().proposals[0];
    if (!proposal) throw new Error('Expected proposal');

    expect(proposal.sourceBranchId).toBeNull();
    expect(() => validateProfileChangeProposal({
      ...proposal,
      evidenceIds: [],
    })).toThrow(/require evidence ids/);
  });

  it('expands aggregate evidence claim ids to their concrete backing evidence rows', () => {
    const aggregatePack = makePack({
      evidenceClaims: [
        {
          evidenceId: 'evidence-3',
          previousNodeRef: ref('react-project', 'effect'),
          correctedNodeRef: ref('react-project', 'frontend'),
          reason: 'The aggregate representative is the newest correction row.',
          patternFrequency: 3,
          latestAt: 90,
          crossScope: false,
          sourceEvidenceIds: ['evidence-3', 'evidence-2', 'evidence-1'],
          sourceIds: ['capture-3', 'capture-2', 'capture-1'],
        },
      ],
    });

    const aggregateCitation = mapOutput({
      pack: aggregatePack,
      output: {
        ...outputWithLabels(['React render timing']),
        findings: [
          {
            ...outputWithLabels(['React render timing']).findings[0],
            evidenceIds: ['evidence-3'],
          },
        ],
      },
    });
    expect(aggregateCitation.proposals[0]?.evidenceIds).toEqual([
      'evidence-3',
      'evidence-2',
      'evidence-1',
    ]);

    const concreteCitation = mapOutput({
      pack: aggregatePack,
      output: {
        ...outputWithLabels(['Specific row only']),
        findings: [
          {
            ...outputWithLabels(['Specific row only']).findings[0],
            evidenceIds: ['evidence-2'],
          },
        ],
      },
    });
    expect(concreteCitation.proposals[0]?.evidenceIds).toEqual(['evidence-2']);
  });

  it('returns explanation only when no active branch target exists', () => {
    const result = mapOutput({ targetBranch: null });

    expect(result.proposals).toEqual([]);
    expect(result.explanation.skippedFindings).toEqual([
      {
        label: 'React render timing',
        reason: 'no-active-branch',
      },
    ]);
  });

  it('splits findings into one proposal per concept, skips pending duplicates, then caps', () => {
    const result = mapOutput({
      output: outputWithLabels([
        'New alpha',
        'New beta',
        'New gamma',
        'New delta',
      ]),
      existingPendingProposals: [makeExistingPendingProposal('new_beta')],
      maxProposals: 2,
    });

    expect(result.proposals.map((proposal) => proposal.patch.addItemTypeNodeIds?.[0])).toEqual([
      'new_alpha',
      'new_gamma',
    ]);
    expect(result.explanation.skippedFindings).toEqual(expect.arrayContaining([
      {
        label: 'New beta',
        reason: 'duplicate-pending-proposal',
        proposedNodeId: 'new_beta',
        existingProposalId: 'existing-new_beta',
      },
      {
        label: 'New delta',
        reason: 'proposal-cap',
        proposedNodeId: 'new_delta',
      },
    ]));
  });

  it('does not let callers raise the per-run proposal cap above the checker limit', () => {
    const result = mapOutput({
      output: outputWithLabels([
        'New one',
        'New two',
        'New three',
        'New four',
        'New five',
        'New six',
      ]),
      maxProposals: 10,
    });

    expect(result.proposals).toHaveLength(5);
    expect(result.proposals.map((proposal) => proposal.patch.addItemTypeNodeIds?.[0])).toEqual([
      'new_one',
      'new_two',
      'new_three',
      'new_four',
      'new_five',
    ]);
    expect(result.explanation.skippedFindings).toEqual([
      {
        label: 'New six',
        reason: 'proposal-cap',
        proposedNodeId: 'new_six',
      },
    ]);
  });

  it('maps null parent findings to root category proposals without relationships', () => {
    const result = mapOutput({
      output: {
        ...outputWithLabels(['Standalone pattern']),
        findings: [
          {
            ...outputWithLabels(['Standalone pattern']).findings[0],
            parentNodeRef: null,
          },
        ],
      },
    });
    const node = result.proposals[0]?.patch.addOntologyNodes?.[0];

    expect(node).toMatchObject({
      id: 'standalone_pattern',
      kind: 'category',
      parentId: null,
      relatedNodeIds: [],
    });
  });

  it('skips invalid ids, unknown evidence, and duplicate output nodes without creating proposals', () => {
    const result = mapOutput({
      output: {
        ...outputWithLabels([]),
        findings: [
          {
            ...outputWithLabels(['!!!']).findings[0],
            evidenceIds: ['evidence-1'],
          },
          {
            ...outputWithLabels(['Unknown evidence']).findings[0],
            evidenceIds: ['missing-evidence'],
          },
          ...outputWithLabels(['Repeat', 'Repeat']).findings,
        ],
      },
    });

    expect(result.proposals.map((proposal) => proposal.patch.addItemTypeNodeIds?.[0])).toEqual(['repeat']);
    expect(result.explanation.skippedFindings.map((finding) => finding.reason)).toEqual(expect.arrayContaining([
      'invalid-node-id',
      'unknown-evidence',
      'duplicate-output-node',
    ]));
  });
});
