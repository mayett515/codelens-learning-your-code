import { describe, expect, it, vi } from 'vitest';
import type { DbOrTx } from '../../../../db/client';
import { codingProfile } from '../../../ontology';
import type { DomainProfile, OntologyCorrectionEvidence, ProfileChangeProposal } from '../../../ontology';
import { unsafeLearningCaptureId } from '../../types/ids';
import type { SaveModalCandidateData } from '../../types/saveModal';
import {
  resolveConceptualizeCorrection,
  saveConceptualizedCapture,
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
        rawProposedTypeNodeId: 'hallucinated_runtime_kind',
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
    });
  });

  it('does not write no-op correction evidence', async () => {
    const d = saveDeps();

    await saveConceptualizedCapture(
      candidate(),
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

  it('preserves proposed-new save mode while creating a branch-targeted ontology proposal for a new subtype', async () => {
    const d = saveDeps();

    await saveConceptualizedCapture(
      candidate(),
      {
        profile,
        selectionSnapshot: { baseProfileId: 'coding', personalBranchIds: ['personal-branch'] },
        proposalTarget: { kind: 'profile_branch', branchId: 'personal-branch' },
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
