import { describe, expect, it, vi } from 'vitest';
import {
  codingProfile,
  serializeContextPack,
  type DomainProfile,
  type OntologyNode,
  type ProfileBranch,
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
}) {
  const branches = input.branches ?? [];
  return createConceptualizeProfileContext({
    profile: input.profile ?? baseProfile,
    baseProfile,
    branches,
    selectionSnapshot: branches.length > 0
      ? { baseProfileId: baseProfile.id, projectBranchIds: branches.map((branch) => branch.id) }
      : { baseProfileId: baseProfile.id },
    proposalTarget: branches.length > 0
      ? { kind: 'profile_branch', branchId: branches[branches.length - 1]!.id }
      : { kind: 'base_profile', profileId: baseProfile.id },
  });
}

function branchWithNode(node: OntologyNode): ProfileBranch<string> {
  return {
    id: 'react-branch',
    parentProfileId: baseProfile.id,
    branchKind: 'project',
    name: 'React branch',
    overlay: {
      id: 'react-branch-overlay',
      kind: 'project',
      addOntologyNodes: [node],
      addItemTypeNodeIds: [node.id],
    },
    createdAt: 1,
    updatedAt: 2,
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
