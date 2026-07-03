import { describe, expect, it, vi } from 'vitest';
import {
  codingProfile,
  serializeContextPack,
  type DomainProfile,
  type OntologyNode,
  type ProfileBranch,
  type UserFitProjection,
} from '../../../ontology';
import type { SaveModalCandidateData } from '../../types/saveModal';
import { buildConceptualizeContextPackShadow } from '../conceptualizeContextPack';
import { createConceptualizeProfileContext } from '../conceptualizeProfileContext';

vi.mock('../../../../db/client', () => ({
  db: {},
}));

const baseProfile = codingProfile as DomainProfile<string>;

function candidate(overrides: Partial<SaveModalCandidateData> = {}): SaveModalCandidateData {
  return {
    profileId: 'coding',
    title: 'Closure captures stale state',
    whatClicked: 'A callback kept reading the old value after render.',
    whyItMattered: 'The fix was to understand the runtime mechanism.',
    rawSnippet: 'const handler = () => value;',
    snippetLang: 'ts',
    snippetSourcePath: 'src/example.ts',
    snippetStartLine: 1,
    snippetEndLine: 1,
    chatMessageId: 'message-1',
    sessionId: 'chat-1',
    derivedFromCaptureId: null,
    isNewLanguageForExistingConcept: false,
    linkedConceptName: null,
    linkedConceptLanguages: null,
    linkedConceptId: null,
    extractionConfidence: 0.84,
    matchSimilarity: null,
    conceptHint: {
      proposedName: 'Closure captures stale state',
      proposedNormalizedKey: 'closure_captures_stale_state',
      proposedConceptType: 'mechanism',
      extractionConfidence: 0.84,
      linkedConceptId: null,
      linkedConceptName: null,
      linkedConceptLanguages: null,
      isNewLanguageForExistingConcept: false,
    },
    rawProposedTypeNodeId: null,
    keywords: ['closure', 'state'],
    ...overrides,
  };
}

function contextWith(input: {
  profile?: DomainProfile<string> | undefined;
  branches?: readonly ProfileBranch<string>[] | undefined;
  userFitProjection?: UserFitProjection | undefined;
}) {
  const branches = input.branches ?? [];
  const projectBranchIds = branchIdsOfKind(branches, 'project');
  const learningBranchIds = branchIdsOfKind(branches, 'learning');
  const personalBranchIds = branchIdsOfKind(branches, 'personal');
  return createConceptualizeProfileContext({
    profile: input.profile ?? baseProfile,
    baseProfile,
    branches,
    selectionSnapshot: branches.length > 0
      ? {
          baseProfileId: baseProfile.id,
          ...(projectBranchIds.length > 0 ? { projectBranchIds } : {}),
          ...(learningBranchIds.length > 0 ? { learningBranchIds } : {}),
          ...(personalBranchIds.length > 0 ? { personalBranchIds } : {}),
        }
      : { baseProfileId: baseProfile.id },
    proposalTarget: branches.length > 0
      ? { kind: 'profile_branch', branchId: branches[branches.length - 1]!.id }
      : { kind: 'base_profile', profileId: baseProfile.id },
    userFitProjection: input.userFitProjection,
  });
}

function branchIdsOfKind(
  branches: readonly ProfileBranch<string>[],
  kind: ProfileBranch['branchKind'],
): string[] {
  return branches.filter((branch) => branch.branchKind === kind).map((branch) => branch.id);
}

function branchWithNode(
  node: OntologyNode,
  overrides: Partial<Pick<ProfileBranch<string>, 'id' | 'branchKind' | 'name'>> = {},
): ProfileBranch<string> {
  const id = overrides.id ?? 'react-branch';
  const branchKind = overrides.branchKind ?? 'project';
  return {
    id,
    parentProfileId: baseProfile.id,
    branchKind,
    name: overrides.name ?? 'React branch',
    overlay: {
      id: `${id}-overlay`,
      kind: branchKind,
      addOntologyNodes: [node],
      addItemTypeNodeIds: [node.id],
    },
    createdAt: 1,
    updatedAt: 2,
  };
}

type UserFitNodeSignalForTest = UserFitProjection['nodeSignals'][number];
type UserFitProposalSignalForTest = UserFitProjection['proposalSignals'][number];

function nodeSignal(
  overrides: Partial<UserFitNodeSignalForTest> = {},
): UserFitNodeSignalForTest {
  return {
    baseProfileId: 'coding',
    scopeId: 'base:coding|project:-|learning:-|personal:-',
    activeSelectionSnapshot: {
      baseProfileId: 'coding',
      projectBranchIds: [],
      learningBranchIds: [],
      personalBranchIds: [],
    },
    nodeId: 'mechanism',
    userFitConfidence: 0.82,
    score: 0.64,
    positiveCorrectionCount: 3,
    negativeCorrectionCount: 0,
    missingConceptCorrectionCount: 1,
    nearMissHitCount: 1,
    evidenceIds: ['evidence-1'],
    latestAt: 789,
    ...overrides,
  };
}

function proposalSignal(
  overrides: Partial<UserFitProposalSignalForTest> = {},
): UserFitProposalSignalForTest {
  const target = overrides.target ?? { kind: 'profile_branch', branchId: 'react-branch' };
  const targetKey = overrides.targetKey ?? (
    target.kind === 'profile_branch'
      ? `profile_branch:${target.branchId ?? '<missing>'}`
      : `base_profile:${target.profileId ?? '<missing>'}`
  );

  return {
    baseProfileId: 'coding',
    proposalKind: 'ontology_node_patch',
    target,
    targetKey,
    userFitConfidence: 0.75,
    score: 0.5,
    appliedCount: 2,
    rejectedCount: 0,
    postponedCount: 0,
    askedWhyCount: 0,
    eventIds: ['event-1'],
    latestAt: 123,
    ...overrides,
  };
}

describe('Conceptualize ContextPack shadow wiring', () => {
  it('builds a valid behavior-neutral pack for a base-profile Conceptualize candidate', () => {
    const result = buildConceptualizeContextPackShadow({
      candidateId: 'candidate-0',
      candidate: candidate(),
      context: contextWith({}),
      now: () => 123,
    });

    expect(result.validation).toEqual({ valid: true, errors: [] });
    expect(result.pack.consumer).toBe('conceptualize');
    expect(result.pack.createdAt).toBe(123);
    expect(result.pack.compositionStamp).toMatchObject({
      baseProfileId: 'coding',
      activeProfileId: 'coding',
      branchOrder: [],
    });
    expect(result.pack.compositionStamp.compositionHash).toMatch(/^fnv1a32:/);
    expect(result.pack.scopeLegend).toEqual({
      activeScopeId: 'coding',
      scopes: [{ scopeId: 'coding', label: 'Coding', kind: 'baseProfile' }],
    });
    expect(result.pack.focal.nodeRefs).toEqual([{ scopeId: 'coding', nodeId: 'mechanism' }]);
    expect(result.pack.policy).toMatchObject({
      trustMode: 'suggest_first',
      autoApplyEnabled: false,
      opsMustUseNodeRef: true,
    });
    expect(result.selectionTrace).toEqual(expect.arrayContaining([
      {
        candidateId: 'coding:mechanism',
        section: 'ontology',
        bucket: 'pinned',
        reason: 'focal',
      },
    ]));
  });

  it('preserves branch order and same-label scoped meanings from the active branch context', () => {
    const branchNode: OntologyNode = {
      id: 'react_mechanism',
      label: 'Mechanism',
      kind: 'subcategory',
      parentId: 'mechanism',
      meaning: 'A React-specific runtime mechanism.',
      useWhen: ['Use for React-specific runtime behavior.'],
      doNotUseWhen: [],
      examples: ['effect cleanup timing'],
      relatedNodeIds: ['mechanism'],
      contrastNodeIds: [],
      status: 'active',
      createdBy: 'user',
      createdAt: 1,
      updatedAt: 1,
    };
    const branch = branchWithNode(branchNode);
    const result = buildConceptualizeContextPackShadow({
      candidateId: 'candidate-1',
      candidate: candidate(),
      context: contextWith({ branches: [branch] }),
      now: () => 456,
    });

    expect(result.validation).toEqual({ valid: true, errors: [] });
    expect(result.pack.compositionStamp.branchOrder).toEqual([
      { branchId: 'react-branch', kind: 'project' },
    ]);
    expect(result.pack.scopeLegend.activeScopeId).toBe('react-branch');
    expect(result.pack.ontology.nodes.map((node) => `${node.ref.scopeId}:${node.ref.nodeId}`))
      .toEqual(expect.arrayContaining([
        'coding:mechanism',
        'react-branch:react_mechanism',
      ]));
    expect(result.pack.ontology.sameLabelSiblings).toEqual([
      {
        label: 'Mechanism',
        normalizedLabel: 'mechanism',
        nodeRefs: [
          { scopeId: 'coding', nodeId: 'mechanism' },
          { scopeId: 'react-branch', nodeId: 'react_mechanism' },
        ],
      },
    ]);
  });

  it('feeds matching user-fit node signals into the ContextPack without exposing them as mutations', () => {
    const context = contextWith({
      userFitProjection: {
        baseProfileId: 'coding',
        nodeSignals: [
          nodeSignal(),
        ],
        proposalSignals: [],
        summary: {
          correctionEvidenceCount: 3,
          proposalEventCount: 0,
          missingConceptCorrectionCount: 1,
          nearMissHitCount: 1,
          omittedNodeSignalCount: 0,
          omittedProposalSignalCount: 0,
        },
      },
    });

    const result = buildConceptualizeContextPackShadow({
      candidateId: 'candidate-user-fit',
      candidate: candidate(),
      context,
      now: () => 789,
    });

    expect(result.validation).toEqual({ valid: true, errors: [] });
    expect(result.pack.userFit.nodeSignals).toEqual([
      expect.objectContaining({
        signalId: 'node:base:coding|project:-|learning:-|personal:-:mechanism',
        nodeId: 'mechanism',
        nodeRefs: [{ scopeId: 'coding', nodeId: 'mechanism' }],
        userFitConfidence: 0.82,
        score: 0.64,
      }),
    ]);
    expect(result.pack.policy.autoApplyEnabled).toBe(false);
  });

  it('rejects user-fit node signals from sibling active-selection scopes', () => {
    const branch = branchWithNode({
      id: 'react_mechanism',
      label: 'React mechanism',
      kind: 'subcategory',
      parentId: 'mechanism',
      meaning: 'React-specific runtime behavior.',
      useWhen: ['Use for React runtime behavior.'],
      doNotUseWhen: [],
      examples: [],
      relatedNodeIds: [],
      contrastNodeIds: [],
      status: 'active',
      createdBy: 'user',
      createdAt: 1,
      updatedAt: 1,
    });
    const context = contextWith({
      branches: [branch],
      userFitProjection: {
        baseProfileId: 'coding',
        nodeSignals: [
          nodeSignal({
            scopeId: 'base:coding|project:vue-branch|learning:-|personal:-',
            activeSelectionSnapshot: {
              baseProfileId: 'coding',
              projectBranchIds: ['vue-branch'],
              learningBranchIds: [],
              personalBranchIds: [],
            },
            evidenceIds: ['evidence-sibling'],
          }),
          nodeSignal({
            scopeId: 'base:coding|project:react-branch|learning:-|personal:-',
            activeSelectionSnapshot: {
              baseProfileId: 'coding',
              projectBranchIds: ['react-branch'],
              learningBranchIds: [],
              personalBranchIds: [],
            },
            evidenceIds: ['evidence-active'],
          }),
        ],
        proposalSignals: [],
        summary: {
          correctionEvidenceCount: 2,
          proposalEventCount: 0,
          missingConceptCorrectionCount: 0,
          nearMissHitCount: 0,
          omittedNodeSignalCount: 0,
          omittedProposalSignalCount: 0,
        },
      },
    });

    const result = buildConceptualizeContextPackShadow({
      candidateId: 'candidate-user-fit-node-scope',
      candidate: candidate(),
      context,
      now: () => 789,
    });

    expect(result.pack.userFit.nodeSignals.map((signal) => signal.evidenceIds))
      .toEqual([['evidence-active']]);
  });

  it('drops user-fit node signals that no longer resolve to current ontology nodes', () => {
    const context = contextWith({
      userFitProjection: {
        baseProfileId: 'coding',
        nodeSignals: [
          nodeSignal({
            nodeId: 'deleted_node',
            evidenceIds: ['evidence-stale'],
          }),
          nodeSignal({
            nodeId: 'mechanism',
            evidenceIds: ['evidence-current'],
          }),
        ],
        proposalSignals: [],
        summary: {
          correctionEvidenceCount: 2,
          proposalEventCount: 0,
          missingConceptCorrectionCount: 0,
          nearMissHitCount: 0,
          omittedNodeSignalCount: 0,
          omittedProposalSignalCount: 0,
        },
      },
    });

    const result = buildConceptualizeContextPackShadow({
      candidateId: 'candidate-stale-user-fit-node',
      candidate: candidate(),
      context,
      now: () => 789,
    });

    expect(result.pack.userFit.nodeSignals.map((signal) => signal.evidenceIds))
      .toEqual([['evidence-current']]);
  });

  it('keeps user-fit proposal signals scoped to the active Conceptualize target', () => {
    const branch = branchWithNode({
      id: 'react_mechanism',
      label: 'React mechanism',
      kind: 'subcategory',
      parentId: 'mechanism',
      meaning: 'React-specific runtime behavior.',
      useWhen: ['Use for React runtime behavior.'],
      doNotUseWhen: [],
      examples: [],
      relatedNodeIds: [],
      contrastNodeIds: [],
      status: 'active',
      createdBy: 'user',
      createdAt: 1,
      updatedAt: 1,
    });
    const context = contextWith({
      branches: [branch],
      userFitProjection: {
        baseProfileId: 'coding',
        nodeSignals: [],
        proposalSignals: [
          proposalSignal(),
          proposalSignal({
            target: { kind: 'profile_branch', branchId: 'vue-branch' },
            targetKey: 'profile_branch:vue-branch',
            eventIds: ['event-sibling'],
          }),
          proposalSignal({
            target: { kind: 'base_profile', profileId: 'coding' },
            targetKey: 'base_profile:coding',
            eventIds: ['event-base'],
          }),
        ],
        summary: {
          correctionEvidenceCount: 0,
          proposalEventCount: 3,
          missingConceptCorrectionCount: 0,
          nearMissHitCount: 0,
          omittedNodeSignalCount: 0,
          omittedProposalSignalCount: 0,
        },
      },
    });

    const result = buildConceptualizeContextPackShadow({
      candidateId: 'candidate-user-fit-proposal',
      candidate: candidate(),
      context,
      now: () => 789,
    });

    expect(result.pack.userFit.proposalSignals.map((signal) => signal.targetKey))
      .toEqual(['profile_branch:react-branch']);
  });

  it('keeps base-profile proposal signals only when no branch is active', () => {
    const context = contextWith({
      userFitProjection: {
        baseProfileId: 'coding',
        nodeSignals: [],
        proposalSignals: [
          proposalSignal({
            target: { kind: 'base_profile', profileId: 'coding' },
            targetKey: 'base_profile:coding',
            eventIds: ['event-base'],
          }),
          proposalSignal({
            target: { kind: 'profile_branch', branchId: 'react-branch' },
            targetKey: 'profile_branch:react-branch',
            eventIds: ['event-branch'],
          }),
        ],
        summary: {
          correctionEvidenceCount: 0,
          proposalEventCount: 2,
          missingConceptCorrectionCount: 0,
          nearMissHitCount: 0,
          omittedNodeSignalCount: 0,
          omittedProposalSignalCount: 0,
        },
      },
    });

    const result = buildConceptualizeContextPackShadow({
      candidateId: 'candidate-base-proposal',
      candidate: candidate(),
      context,
      now: () => 789,
    });

    expect(result.pack.userFit.proposalSignals.map((signal) => signal.targetKey))
      .toEqual(['base_profile:coding']);
  });

  it('allows proposal signals for every active branch kind without leaking siblings', () => {
    const node = {
      id: 'branch_note',
      label: 'Branch note',
      kind: 'tag' as const,
      parentId: null,
      meaning: 'A branch-local note marker.',
      useWhen: [],
      doNotUseWhen: [],
      examples: [],
      relatedNodeIds: [],
      contrastNodeIds: [],
      status: 'active' as const,
      createdBy: 'user' as const,
      createdAt: 1,
      updatedAt: 1,
    };
    const context = contextWith({
      branches: [
        branchWithNode(node, { id: 'project-branch', branchKind: 'project', name: 'Project branch' }),
        branchWithNode({ ...node, id: 'learning_note' }, {
          id: 'learning-branch',
          branchKind: 'learning',
          name: 'Learning branch',
        }),
        branchWithNode({ ...node, id: 'personal_note' }, {
          id: 'personal-branch',
          branchKind: 'personal',
          name: 'Personal branch',
        }),
      ],
      userFitProjection: {
        baseProfileId: 'coding',
        nodeSignals: [],
        proposalSignals: [
          proposalSignal({
            target: { kind: 'profile_branch', branchId: 'project-branch' },
            targetKey: 'profile_branch:project-branch',
            eventIds: ['event-project'],
          }),
          proposalSignal({
            target: { kind: 'profile_branch', branchId: 'learning-branch' },
            targetKey: 'profile_branch:learning-branch',
            eventIds: ['event-learning'],
          }),
          proposalSignal({
            target: { kind: 'profile_branch', branchId: 'personal-branch' },
            targetKey: 'profile_branch:personal-branch',
            eventIds: ['event-personal'],
          }),
          proposalSignal({
            target: { kind: 'profile_branch', branchId: 'sibling-branch' },
            targetKey: 'profile_branch:sibling-branch',
            eventIds: ['event-sibling'],
          }),
        ],
        summary: {
          correctionEvidenceCount: 0,
          proposalEventCount: 4,
          missingConceptCorrectionCount: 0,
          nearMissHitCount: 0,
          omittedNodeSignalCount: 0,
          omittedProposalSignalCount: 0,
        },
      },
    });

    const result = buildConceptualizeContextPackShadow({
      candidateId: 'candidate-multi-branch-proposals',
      candidate: candidate(),
      context,
      now: () => 789,
    });

    expect(result.pack.userFit.proposalSignals.map((signal) => signal.targetKey))
      .toEqual([
        'profile_branch:project-branch',
        'profile_branch:learning-branch',
        'profile_branch:personal-branch',
      ]);
  });

  it('is deterministic and does not mutate caller data', () => {
    const inputCandidate = candidate();
    const context = contextWith({});
    const before = JSON.stringify({ inputCandidate, context });

    const first = buildConceptualizeContextPackShadow({
      candidateId: 'candidate-0',
      candidate: inputCandidate,
      context,
      now: () => 123,
    });
    const second = buildConceptualizeContextPackShadow({
      candidateId: 'candidate-0',
      candidate: inputCandidate,
      context,
      now: () => 123,
    });

    expect(serializeContextPack(first.pack)).toBe(serializeContextPack(second.pack));
    expect(JSON.stringify({ inputCandidate, context })).toBe(before);
  });
});
