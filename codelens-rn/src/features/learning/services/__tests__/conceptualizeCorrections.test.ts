import { describe, expect, it, vi } from 'vitest';
import type { DbOrTx } from '../../../../db/client';
import { codingProfile, photographyProfile } from '../../../ontology';
import type {
  DomainProfile,
  OntologyCorrectionEvidence,
  OntologyNode,
  ProfileChangeProposal,
} from '../../../ontology';
import { unsafeLearningCaptureId } from '../../types/ids';
import type { SaveModalCandidateData } from '../../types/saveModal';
import {
  resolveConceptualizeCorrection,
  saveConceptualizedCapture,
  saveConceptualizedCaptureWithResult,
} from '../saveConceptualizedCapture';
import type { SaveCaptureAfterInsertInput } from '../saveCapture';

vi.mock('../../../../db/client', () => ({
  db: {
    transaction: vi.fn(),
  },
}));

vi.mock('../../../../ai/embed', () => ({
  enqueueEmbed: vi.fn(),
}));

vi.mock('../../../../ai/scopes', () => ({
  getEmbedConfig: () => ({ provider: 'openrouter', model: 'test-model' }),
}));

const captureId = unsafeLearningCaptureId('lc_111111111111111111111');
const profile = codingProfile as DomainProfile<string>;

function candidate(overrides: Partial<SaveModalCandidateData> = {}): SaveModalCandidateData {
  return {
    profileId: 'coding',
    title: 'Closure keeps outer state',
    whatClicked: 'A returned function still reads outer state.',
    whyItMattered: null,
    rawSnippet: 'const value = 1; return () => value;',
    snippetLang: 'typescript',
    snippetSourcePath: null,
    snippetStartLine: null,
    snippetEndLine: null,
    chatMessageId: null,
    sessionId: null,
    derivedFromCaptureId: null,
    isNewLanguageForExistingConcept: false,
    linkedConceptName: 'Closure',
    linkedConceptLanguages: ['javascript'],
    linkedConceptId: null,
    extractionConfidence: 0.8,
    matchSimilarity: 0.7,
    conceptHint: {
      proposedName: 'Closure',
      proposedNormalizedKey: 'closure',
      proposedConceptType: 'mechanism',
      extractionConfidence: 0.8,
      linkedConceptId: null,
      linkedConceptName: 'Closure',
      linkedConceptLanguages: ['javascript'],
      isNewLanguageForExistingConcept: false,
    },
    keywords: ['closure'],
    ...overrides,
  };
}

function saveDeps() {
  const tx = { tx: true } as unknown as DbOrTx;
  const saved: SaveModalCandidateData[] = [];
  const saveOptions: Array<{ saveAsProposedNew?: boolean | undefined }> = [];
  const evidence: OntologyCorrectionEvidence[] = [];
  const proposals: ProfileChangeProposal[] = [];
  return {
    saved,
    saveOptions,
    evidence,
    proposals,
    deps: {
      save: vi.fn(async (
        input: SaveModalCandidateData,
        _deps: unknown,
        options?: {
          saveAsProposedNew?: boolean | undefined;
          afterInsert?: ((
            input: SaveCaptureAfterInsertInput,
            executor: DbOrTx,
          ) => Promise<void>) | undefined;
        },
      ) => {
        saved.push(input);
        saveOptions.push({ saveAsProposedNew: options?.saveAsProposedNew });
        await options?.afterInsert?.(
          { captureId, candidate: input, createdAt: 1_800_000_000_000 },
          tx,
        );
        return captureId;
      }),
      insertEvidence: vi.fn(async (input: OntologyCorrectionEvidence) => {
        evidence.push(input);
      }),
      insertProposal: vi.fn(async (input: ProfileChangeProposal) => {
        proposals.push(input);
      }),
      now: () => 1_800_000_000_000,
      newEvidenceId: () => 'ev-1',
      newProposalId: () => 'proposal-1',
    },
  };
}

describe('Conceptualize correction save', () => {
  it('updates the saved candidate type and clears stale concept links', () => {
    const result = resolveConceptualizeCorrection(
      candidate(),
      profile,
      { correctedTypeNodeId: 'pattern', reason: 'This is a reusable shape' },
    );

    expect(result.candidate.conceptHint?.proposedConceptType).toBe('pattern');
    expect(result.candidate.linkedConceptName).toBeNull();
    expect(result.previousTypeNodeId).toBe('mechanism');
    expect(result.correctedTypeNodeId).toBe('pattern');
  });

  it('scopes the saved candidate to the Conceptualize context profile', () => {
    const result = resolveConceptualizeCorrection(
      candidate({ profileId: 'coding' }),
      photographyProfile as DomainProfile<string>,
      null,
    );

    expect(result.candidate.profileId).toBe('photography');
  });

  it('preserves proposed-new save mode while writing evidence for an existing type correction', async () => {
    const d = saveDeps();

    await saveConceptualizedCapture(
      candidate(),
      {
        profile,
        selectionSnapshot: { baseProfileId: 'coding', projectBranchIds: ['branch-1'] },
        proposalTarget: { kind: 'profile_branch', branchId: 'branch-1' },
      },
      { correctedTypeNodeId: 'pattern', reason: 'Reusable shape' },
      { saveAsProposedNew: true, deps: d.deps },
    );

    expect(d.saved[0].conceptHint?.proposedConceptType).toBe('pattern');
    expect(d.saveOptions[0]?.saveAsProposedNew).toBe(true);
    expect(d.evidence).toEqual([
      expect.objectContaining({
        id: 'ev-1',
        profileId: 'coding',
        subjectKind: 'capture',
        subjectId: captureId,
        previousTypeNodeId: 'mechanism',
        correctedTypeNodeId: 'pattern',
        reason: 'Reusable shape',
      }),
    ]);
    expect(d.proposals).toEqual([]);
  });

  it('records the raw extractor type when normalization hid an unknown model output', async () => {
    const d = saveDeps();

    await saveConceptualizedCapture(
      candidate({
        rawProposedTypeIdentity: {
          kind: 'unresolved_raw',
          rawNodeId: 'hallucinated_runtime_kind',
          source: 'extractor',
          activeScopeId: 'coding',
        },
        conceptualizeNearMissCandidates: [
          { scopeId: 'coding', nodeId: 'pattern', rank: 2, score: 0.69 },
        ],
        rawProposedTypeNodeId: 'legacy_should_be_ignored',
        conceptHint: {
          ...candidate().conceptHint!,
          proposedConceptType: 'mental_model',
        },
      }),
      {
        profile,
        selectionSnapshot: { baseProfileId: 'coding' },
        proposalTarget: { kind: 'base_profile', profileId: 'coding' },
      },
      { correctedTypeNodeId: 'pattern', reason: 'The raw model type was invalid' },
      { deps: d.deps },
    );

    expect(d.evidence[0]).toMatchObject({
      previousTypeNodeId: 'mental_model',
      correctedTypeNodeId: 'pattern',
      rawProposedTypeNodeId: 'hallucinated_runtime_kind',
      nearMissCandidates: [
        { scopeId: 'coding', nodeId: 'pattern', rank: 2, score: 0.69 },
      ],
    });
  });

  it('prefers structured scoped raw identity over the legacy string projection', async () => {
    const d = saveDeps();

    await saveConceptualizedCapture(
      candidate({
        rawProposedTypeIdentity: {
          kind: 'scoped_ref',
          scopeId: 'coding',
          nodeId: 'pattern',
          source: 'conceptualize',
        },
        rawProposedTypeNodeId: 'legacy_wrong',
      }),
      {
        profile,
        selectionSnapshot: { baseProfileId: 'coding' },
        proposalTarget: { kind: 'base_profile', profileId: 'coding' },
      },
      { correctedTypeNodeId: 'pattern', reason: 'Conceptualize picked this scoped node' },
      { deps: d.deps },
    );

    expect(d.evidence[0]).toMatchObject({
      previousTypeNodeId: 'mechanism',
      correctedTypeNodeId: 'pattern',
      rawProposedTypeNodeId: 'coding:pattern',
    });
  });

  it('does not write no-op correction evidence', async () => {
    const d = saveDeps();

    await saveConceptualizedCapture(
      candidate({
        conceptualizeNearMissCandidates: [
          { scopeId: 'coding', nodeId: 'pattern', rank: 2, score: 0.69 },
        ],
      }),
      {
        profile,
        selectionSnapshot: { baseProfileId: 'coding' },
        proposalTarget: { kind: 'base_profile', profileId: 'coding' },
      },
      { correctedTypeNodeId: 'mechanism' },
      { deps: d.deps },
    );

    expect(d.evidence).toEqual([]);
    expect(d.proposals).toEqual([]);
  });

  it('does not persist near-miss diagnostics when the user saves without a correction', async () => {
    const d = saveDeps();

    await saveConceptualizedCapture(
      candidate({
        conceptualizeNearMissCandidates: [
          { scopeId: 'coding', nodeId: 'pattern', rank: 2, score: 0.69 },
        ],
      }),
      {
        profile,
        selectionSnapshot: { baseProfileId: 'coding' },
        proposalTarget: { kind: 'base_profile', profileId: 'coding' },
      },
      null,
      { deps: d.deps },
    );

    expect(d.saved[0].conceptualizeNearMissCandidates).toEqual([
      { scopeId: 'coding', nodeId: 'pattern', rank: 2, score: 0.69 },
    ]);
    expect(d.evidence).toEqual([]);
    expect(d.proposals).toEqual([]);
  });

  it('preserves proposed-new save mode while creating a branch-targeted ontology proposal for a new subtype', async () => {
    const d = saveDeps();

    await saveConceptualizedCapture(
      candidate(),
      {
        profile,
        selectionSnapshot: { baseProfileId: 'coding', personalBranchIds: ['personal-branch'] },
        proposalTarget: { kind: 'profile_branch', branchId: 'personal-branch' },
        proposalTargetBranchUpdatedAt: 2_000,
      },
      {
        correctedTypeNodeId: 'pattern',
        newTypeLabel: 'React hook lifecycle',
        reason: 'This is specifically about hook lifecycle behavior',
      },
      { saveAsProposedNew: true, deps: d.deps },
    );

    expect(d.saved[0].conceptHint?.proposedConceptType).toBe('react_hook_lifecycle');
    expect(d.saveOptions[0]?.saveAsProposedNew).toBe(true);
    expect(d.evidence[0]).toMatchObject({
      correctedTypeNodeId: 'react_hook_lifecycle',
      previousTypeNodeId: 'mechanism',
    });
    expect(d.proposals[0]).toMatchObject({
      id: 'proposal-1',
      proposalKind: 'ontology_node_patch',
      sourceKind: 'user',
      target: { kind: 'profile_branch', branchId: 'personal-branch' },
      targetProfileVersion: null,
      targetBranchUpdatedAt: 2_000,
      status: 'pending',
      patch: {
        addItemTypeNodeIds: ['react_hook_lifecycle'],
      },
    });
    expect(d.proposals[0].patch.addOntologyNodes?.[0]).toMatchObject({
      id: 'react_hook_lifecycle',
      label: 'React hook lifecycle',
      parentId: 'pattern',
      status: 'suggested',
      createdBy: 'user',
    });
  });

  it('returns the created profile proposal for explicit review handoff', async () => {
    const d = saveDeps();

    const result = await saveConceptualizedCaptureWithResult(
      candidate(),
      {
        profile,
        selectionSnapshot: { baseProfileId: 'coding', personalBranchIds: ['personal-branch'] },
        proposalTarget: { kind: 'profile_branch', branchId: 'personal-branch' },
        proposalTargetBranchUpdatedAt: 2_000,
      },
      {
        correctedTypeNodeId: 'pattern',
        newTypeLabel: 'React hook lifecycle',
        reason: 'Review this as a branch-local profile proposal.',
      },
      { deps: d.deps },
    );

    expect(result.captureId).toBe(captureId);
    expect(result.profileProposal).toMatchObject({
      id: 'proposal-1',
      target: { kind: 'profile_branch', branchId: 'personal-branch' },
      targetProfileVersion: null,
      targetBranchUpdatedAt: 2_000,
      status: 'pending',
    });
  });

  it('rejects branch-targeted new subtype proposals without a branch revision snapshot', async () => {
    const d = saveDeps();

    await expect(saveConceptualizedCapture(
      candidate(),
      {
        profile,
        selectionSnapshot: { baseProfileId: 'coding', personalBranchIds: ['personal-branch'] },
        proposalTarget: { kind: 'profile_branch', branchId: 'personal-branch' },
      },
      {
        correctedTypeNodeId: 'pattern',
        newTypeLabel: 'React hook lifecycle',
        reason: 'Review this as a branch-local profile proposal.',
      },
      { deps: d.deps },
    )).rejects.toThrow(/current branch updatedAt snapshot/);

    expect(d.evidence).toEqual([]);
    expect(d.proposals).toEqual([]);
  });

  it('uses edited missing-concept draft meaning and preserves suggestion provenance on proposals', async () => {
    const d = saveDeps();

    await saveConceptualizedCapture(
      candidate({
        conceptualizeMissingConcept: {
          status: 'no_strong_match',
          confidence: 0.42,
          rationale: 'No existing item type is specific enough.',
          suggestedNewConcept: {
            label: 'Hook Snapshot',
            kind: 'subcategory',
            parentNodeRef: { scopeId: 'coding', nodeId: 'mechanism' },
            parentLabel: 'Mechanism',
            meaning: 'Captures one hook timing snapshot.',
            reason: 'The mechanism type is too broad for this capture.',
          },
        },
      }),
      {
        profile,
        selectionSnapshot: { baseProfileId: 'coding' },
        proposalTarget: { kind: 'base_profile', profileId: 'coding' },
      },
      {
        correctedTypeNodeId: 'pattern',
        newTypeLabel: 'Hook lifecycle',
        newTypeMeaning: 'Use when a capture explains how hook timing changes over renders.',
        reason: 'The useful bucket is lifecycle, not one snapshot.',
      },
      { deps: d.deps },
    );

    expect(d.proposals[0].patch.addOntologyNodes?.[0]).toMatchObject({
      id: 'hook_lifecycle',
      label: 'Hook lifecycle',
      parentId: 'pattern',
      meaning: 'Use when a capture explains how hook timing changes over renders.',
      useWhen: ['Use when a capture explains how hook timing changes over renders.'],
    });
    expect(d.proposals[0].reason).toContain('The useful bucket is lifecycle, not one snapshot.');
    expect(d.proposals[0].reason).toContain('Original suggested concept: Hook Snapshot under Mechanism.');
    expect(d.proposals[0].reason).toContain('Original suggested meaning: Captures one hook timing snapshot.');
    expect(d.proposals[0].reason).toContain('Original suggested reason: The mechanism type is too broad for this capture.');
    expect(d.proposals[0].reason).toContain('User-edited fields: label, parent, meaning, reason.');
  });

  it('uses missing-concept suggestion meaning when the user only copies the suggestion', async () => {
    const d = saveDeps();

    await saveConceptualizedCapture(
      candidate({
        conceptualizeMissingConcept: {
          status: 'no_strong_match',
          confidence: 0.42,
          rationale: 'No existing item type is specific enough.',
          suggestedNewConcept: {
            label: 'Hook Snapshot',
            kind: 'subcategory',
            parentNodeRef: { scopeId: 'coding', nodeId: 'mechanism' },
            parentLabel: 'Mechanism',
            meaning: 'Captures one hook timing snapshot.',
            reason: 'The mechanism type is too broad for this capture.',
          },
        },
      }),
      {
        profile,
        selectionSnapshot: { baseProfileId: 'coding' },
        proposalTarget: { kind: 'base_profile', profileId: 'coding' },
      },
      {
        correctedTypeNodeId: 'mechanism',
        newTypeLabel: 'Hook Snapshot',
        reason: 'The mechanism type is too broad for this capture.',
      },
      { deps: d.deps },
    );

    expect(d.proposals[0].patch.addOntologyNodes?.[0]).toMatchObject({
      id: 'hook_snapshot',
      label: 'Hook Snapshot',
      parentId: 'mechanism',
      meaning: 'Captures one hook timing snapshot.',
    });
    expect(d.proposals[0].reason).toContain('User-edited fields: none.');
  });

  it('snapshots the current profile version on base-targeted new subtype proposals', async () => {
    const d = saveDeps();

    await saveConceptualizedCapture(
      candidate(),
      {
        profile,
        selectionSnapshot: { baseProfileId: 'coding' },
        proposalTarget: { kind: 'base_profile', profileId: 'coding' },
      },
      {
        newTypeLabel: 'Mechanism lifecycle',
        reason: 'Create this in the base profile after review.',
      },
      { deps: d.deps },
    );

    expect(d.proposals[0]).toMatchObject({
      target: { kind: 'base_profile', profileId: 'coding' },
      targetProfileVersion: profile.version,
      riskScore: 70,
    });
  });

  it('rejects a new subtype label that collides with an existing non-item node id', () => {
    const relationshipNode: OntologyNode = {
      id: 'react_hook_lifecycle',
      label: 'React hook lifecycle',
      kind: 'relationshipType',
      parentId: null,
      meaning: 'Existing relationship namespace entry.',
      useWhen: [],
      doNotUseWhen: [],
      examples: [],
      relatedNodeIds: [],
      contrastNodeIds: [],
      status: 'active',
      createdBy: 'system',
      createdAt: 1,
      updatedAt: 1,
    };
    const profileWithCollision: DomainProfile<string> = {
      ...profile,
      ontology: {
        ...profile.ontology,
        nodes: [...profile.ontology.nodes, relationshipNode],
      },
    };

    expect(() =>
      resolveConceptualizeCorrection(
        candidate(),
        profileWithCollision,
        { newTypeLabel: 'React hook lifecycle' },
      ),
    ).toThrow(/already exists outside item types/);
  });

  it('rejects stale explicit parent ids when creating a new subtype proposal', () => {
    expect(() =>
      resolveConceptualizeCorrection(
        candidate(),
        profile,
        {
          correctedTypeNodeId: 'not_in_profile',
          newTypeLabel: 'React hook lifecycle',
        },
      ),
    ).toThrow(/Unknown parent type node id/);
  });

  it('uses a valid previous type id as the implicit parent for a new subtype proposal', () => {
    const result = resolveConceptualizeCorrection(
      candidate(),
      profile,
      {
        newTypeLabel: 'Mechanism lifecycle',
        reason: 'This narrows the existing mechanism type.',
      },
    );

    expect(result.correctedTypeNodeId).toBe('mechanism_lifecycle');
    expect(result.proposedNode).toMatchObject({
      id: 'mechanism_lifecycle',
      kind: 'subcategory',
      parentId: 'mechanism',
    });
  });

  it('creates a top-level proposal when only the previous type id is stale', () => {
    const result = resolveConceptualizeCorrection(
      candidate({
        conceptHint: {
          ...candidate().conceptHint!,
          proposedConceptType: 'stale_model_type',
        },
      }),
      profile,
      {
        newTypeLabel: 'React hook lifecycle',
        reason: 'The previous extracted type is no longer in this profile.',
      },
    );

    expect(result.correctedTypeNodeId).toBe('react_hook_lifecycle');
    expect(result.proposedNode).toMatchObject({
      id: 'react_hook_lifecycle',
      kind: 'category',
      parentId: null,
    });
  });

  it('rejects unknown existing type corrections unless they are a new subtype proposal', () => {
    expect(() =>
      resolveConceptualizeCorrection(
        candidate(),
        profile,
        { correctedTypeNodeId: 'not_in_profile' },
      ),
    ).toThrow(/Unknown type node id/);
  });
});
