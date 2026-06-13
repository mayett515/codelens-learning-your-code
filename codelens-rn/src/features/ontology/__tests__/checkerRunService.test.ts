import { describe, expect, it, vi } from 'vitest';
import type { DbOrTx } from '../../../db/client';

const { mockDb } = vi.hoisted(() => ({
  mockDb: {},
}));

vi.mock('../../../db/client', () => ({
  db: mockDb,
}));

import { CHECKER_PROMPT_OUTPUT_VERSION, type CheckerPromptOutput } from '../checkerPromptBuilder';
import {
  ManualCheckerRunServiceError,
  runManualOntologyChecker,
  type ManualCheckerRunServiceDependencies,
} from '../data/checkerRunService';
import { validateProfileChangeProposal } from '../codecs/profileChangeProposal';
import { codingProfile } from '../profiles/codingProfile';
import type {
  DomainProfile,
  OntologyCorrectionEvidence,
  OntologyNode,
  ProfileBranch,
  ProfileChangeProposal,
  ProfileProposalEvent,
} from '../types';

function makeNode(id: string, overrides: Partial<OntologyNode> = {}): OntologyNode {
  return {
    id,
    label: id.replace(/_/g, ' '),
    kind: 'category',
    parentId: null,
    meaning: `Meaning for ${id}.`,
    useWhen: [`Use ${id}.`],
    doNotUseWhen: [],
    examples: [],
    relatedNodeIds: [],
    contrastNodeIds: [],
    status: 'active',
    createdBy: 'user',
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function makeBranch(overrides: Partial<ProfileBranch<string>> = {}): ProfileBranch<string> {
  return {
    id: 'react-project',
    parentProfileId: 'coding',
    branchKind: 'project',
    name: 'React project',
    overlay: {
      id: 'overlay-react',
      kind: 'project',
    },
    createdAt: 1,
    updatedAt: 5,
    ...overrides,
  };
}

function makeEvidence(overrides: Partial<OntologyCorrectionEvidence> = {}): OntologyCorrectionEvidence {
  return {
    id: 'evidence-1',
    profileId: 'coding',
    activeSelectionSnapshot: {
      baseProfileId: 'coding',
      projectBranchIds: ['react-project'],
      learningBranchIds: [],
      personalBranchIds: [],
    },
    subjectKind: 'capture',
    subjectId: 'capture-1',
    field: 'typeNodeId',
    previousTypeNodeId: 'mechanism',
    correctedTypeNodeId: 'pattern',
    rawProposedTypeNodeId: null,
    nearMissCandidates: [],
    reason: 'The user corrected this toward a reusable React pattern.',
    source: 'user',
    createdAt: 50,
    ...overrides,
  };
}

function checkerOutput(overrides: Partial<CheckerPromptOutput> = {}): CheckerPromptOutput {
  return {
    schemaVersion: CHECKER_PROMPT_OUTPUT_VERSION,
    explanation: {
      summary: 'Repeated corrections suggest one missing branch-local concept.',
      relationshipOrBoundaryObservations: ['A boundary rule may be useful later.'],
    },
    findings: [
      {
        kind: 'missing_branch_item_type',
        label: 'React render timing',
        parentNodeRef: {
          scopeId: 'coding',
          nodeId: 'pattern',
        },
        meaning: 'Timing behavior around React render and commit work.',
        rationale: 'Evidence shows repeated corrections toward React render timing.',
        evidenceIds: ['evidence-1'],
        semanticConfidence: 0.82,
      },
    ],
    ...overrides,
  };
}

function makeExistingPendingProposal(nodeId: string): ProfileChangeProposal {
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
    targetBranchUpdatedAt: 4,
    evidenceIds: ['evidence-1'],
    patch: {
      addOntologyNodes: [makeNode(nodeId, {
        kind: 'subcategory',
        parentId: 'pattern',
        createdBy: 'model',
      })],
      addItemTypeNodeIds: [nodeId],
    },
    title: `Add ${nodeId}`,
    summary: 'Already pending.',
    reason: 'Already proposed.',
    riskScore: 20,
    semanticConfidence: 0.7,
    userFitConfidence: null,
    status: 'pending',
    supersededByProposalId: null,
    createdAt: 1,
    updatedAt: 2,
    reviewedAt: null,
    appliedAt: null,
  });
}

function makeDeps(input: {
  branchBeforeModel?: ProfileBranch<string> | undefined;
  branchInTransaction?: ProfileBranch<string> | undefined;
  pendingProposals?: readonly ProfileChangeProposal[] | undefined;
  correctionEvidence?: readonly OntologyCorrectionEvidence[] | undefined;
  output?: unknown;
  calls?: string[] | undefined;
  onModel?: ((invocation: Parameters<ManualCheckerRunServiceDependencies['runCheckerModel']>[0]) => void) | undefined;
} = {}): ManualCheckerRunServiceDependencies {
  const tx = { kind: 'tx' } as unknown as DbOrTx;
  const calls = input.calls ?? [];
  const branchBeforeModel = input.branchBeforeModel ?? makeBranch();
  const branchInTransaction = input.branchInTransaction ?? makeBranch({ updatedAt: 8 });

  return {
    transaction: async (callback) => {
      calls.push('transaction');
      return callback(tx);
    },
    getBranchById: async (_id, executor) => {
      calls.push(executor === tx ? 'getBranch:tx' : 'getBranch:read');
      return executor === tx ? branchInTransaction : branchBeforeModel;
    },
    listProposalsForTargetBranch: async (_branchId, executor) => {
      calls.push(executor === tx ? 'listProposals:tx' : 'listProposals:read');
      return [...(input.pendingProposals ?? [])];
    },
    insertProposal: async (proposal, executor) => {
      calls.push(executor === tx ? `insert:${proposal.id}` : `insert-outside:${proposal.id}`);
    },
    loadUserFitFacts: async () => {
      calls.push('loadUserFitFacts');
      return {
        correctionEvidence: [...(input.correctionEvidence ?? [makeEvidence()])],
        proposalEvents: [] as ProfileProposalEvent[],
      };
    },
    loadRegistry: async () => {
      calls.push('loadRegistry');
      return {
        getProfile: () => codingProfile as DomainProfile<string>,
        listProfiles: () => [],
      };
    },
    runCheckerModel: async (invocation) => {
      calls.push('model');
      expect(invocation.pack.consumer).toBe('checker');
      expect(invocation.prompt.outputSchemaName).toBe('CheckerPromptOutputSchema');
      input.onModel?.(invocation);
      return input.output ?? checkerOutput();
    },
    newProposalId: () => 'checker-proposal-1',
  };
}

async function captureRejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('Expected promise to reject');
}

describe('runManualOntologyChecker', () => {
  it('calls the model before the write transaction and inserts dry-run-valid proposals with the fresh branch snapshot', async () => {
    const calls: string[] = [];
    const result = await runManualOntologyChecker({
      baseProfileId: 'coding',
      targetBranchId: 'react-project',
      now: 100,
      deps: makeDeps({ calls }),
    });

    expect(calls).toEqual([
      'loadRegistry',
      'getBranch:read',
      'loadUserFitFacts',
      'model',
      'transaction',
      'getBranch:tx',
      'listProposals:tx',
      'insert:checker-proposal-1',
    ]);
    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0]).toMatchObject({
      id: 'checker-proposal-1',
      sourceKind: 'checker',
      sourceBranchId: null,
      proposalKind: 'ontology_node_patch',
      target: {
        kind: 'profile_branch',
        branchId: 'react-project',
      },
      targetProfileVersion: null,
      targetBranchUpdatedAt: 8,
      evidenceIds: ['evidence-1'],
      status: 'pending',
    });
    expect(result.proposals[0]?.patch.addOntologyNodes?.[0]).toMatchObject({
      id: 'react_render_timing',
      parentId: 'pattern',
      status: 'active',
      createdBy: 'model',
    });
    expect(result.explanation.skippedFindings).toEqual([]);
  });

  it('aggregates repeated correction patterns before building the checker prompt', async () => {
    const evidenceNewest = makeEvidence({
      id: 'evidence-3',
      subjectId: 'capture-3',
      reason: 'Newest correction confirms the same missing concept.',
      createdAt: 80,
    });
    const evidenceMiddle = makeEvidence({
      id: 'evidence-2',
      subjectId: 'capture-2',
      createdAt: 70,
    });
    const evidenceOldest = makeEvidence({
      id: 'evidence-1',
      subjectId: 'capture-1',
      createdAt: 50,
    });
    const calls: string[] = [];

    const result = await runManualOntologyChecker({
      baseProfileId: 'coding',
      targetBranchId: 'react-project',
      now: 100,
      deps: makeDeps({
        calls,
        correctionEvidence: [evidenceNewest, evidenceMiddle, evidenceOldest],
        output: checkerOutput({
          findings: [
            {
              ...checkerOutput().findings[0],
              evidenceIds: ['evidence-3', 'evidence-2', 'evidence-1'],
            },
          ],
        }),
        onModel: (invocation) => {
          expect(invocation.pack.evidence.claims).toHaveLength(1);
          expect(invocation.pack.evidence.claims[0]).toMatchObject({
            evidenceId: 'evidence-3',
            patternFrequency: 3,
            latestAt: 80,
            reason: 'Newest correction confirms the same missing concept.',
            sourceEvidenceIds: ['evidence-3', 'evidence-2', 'evidence-1'],
            sourceIds: ['capture-3', 'capture-2', 'capture-1'],
          });
          expect(invocation.prompt.dataPayload.evidence.claims[0]).toMatchObject({
            evidenceId: 'evidence-3',
            patternFrequency: 3,
            sourceEvidenceIds: ['evidence-3', 'evidence-2', 'evidence-1'],
          });
          expect(invocation.prompt.allowedEvidenceIds).toEqual([
            'evidence-3',
            'evidence-2',
            'evidence-1',
          ]);
        },
      }),
    });

    expect(calls).toContain('insert:checker-proposal-1');
    expect(result.proposals[0]?.evidenceIds).toEqual([
      'evidence-3',
      'evidence-2',
      'evidence-1',
    ]);
  });

  it('returns explanation only when no active branch is supplied', async () => {
    const result = await runManualOntologyChecker({
      baseProfileId: 'coding',
      targetBranchId: null,
      now: 100,
      deps: {
        runCheckerModel: async () => {
          throw new Error('model should not be called');
        },
      },
    });

    expect(result.pack).toBeNull();
    expect(result.output).toBeNull();
    expect(result.proposals).toEqual([]);
    expect(result.explanation.summary).toContain('active branch');
  });

  it('skips duplicate pending proposals without rewriting them', async () => {
    const calls: string[] = [];
    const result = await runManualOntologyChecker({
      baseProfileId: 'coding',
      targetBranchId: 'react-project',
      now: 100,
      deps: makeDeps({
        calls,
        pendingProposals: [makeExistingPendingProposal('react_render_timing')],
      }),
    });

    expect(calls).not.toContain('insert:checker-proposal-1');
    expect(result.proposals).toEqual([]);
    expect(result.explanation.skippedFindings).toEqual([
      {
        label: 'React render timing',
        reason: 'duplicate-pending-proposal',
        proposedNodeId: 'react_render_timing',
        existingProposalId: 'existing-react_render_timing',
      },
    ]);
  });

  it('skips dry-run patch conflicts and inserts nothing for that candidate', async () => {
    const branchWithConflictingNode = makeBranch({
      updatedAt: 8,
      overlay: {
        id: 'overlay-react',
        kind: 'project',
        addOntologyNodes: [makeNode('react_render_timing')],
      },
    });
    const calls: string[] = [];
    const result = await runManualOntologyChecker({
      baseProfileId: 'coding',
      targetBranchId: 'react-project',
      now: 100,
      deps: makeDeps({
        calls,
        branchInTransaction: branchWithConflictingNode,
      }),
    });

    expect(calls).not.toContain('insert:checker-proposal-1');
    expect(result.proposals).toEqual([]);
    expect(result.explanation.skippedFindings).toEqual([
      {
        label: 'React render timing',
        reason: 'patch-conflict',
        proposedNodeId: 'react_render_timing',
      },
    ]);
  });

  it('rejects invalid model output before opening a write transaction', async () => {
    const calls: string[] = [];
    const error = await captureRejection(runManualOntologyChecker({
      baseProfileId: 'coding',
      targetBranchId: 'react-project',
      now: 100,
      deps: makeDeps({
        calls,
        output: checkerOutput({
          findings: [
            {
              ...checkerOutput().findings[0],
              evidenceIds: ['missing-evidence'],
            },
          ],
        }),
      }),
    }));

    expect(error).toBeInstanceOf(ManualCheckerRunServiceError);
    expect((error as ManualCheckerRunServiceError).code).toBe('checker_output_invalid');
    expect(calls).not.toContain('transaction');
  });
});
