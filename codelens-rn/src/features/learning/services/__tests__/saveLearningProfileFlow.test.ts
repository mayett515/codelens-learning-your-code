import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DbOrTx } from '../../../../db/client';
import { chatId, messageId, type ChatMessage } from '../../../../domain/types';
import { codingProfile, photographyProfile, createProfileRegistry, createStaticProfileSource, type DomainProfile } from '../../../ontology';
import { useSaveLearningStore } from '../../state/save-learning';
import { getCaptureById } from '../../data/captureRepo';
import { learningCaptures } from '../../data/schema';
import { unsafeLearningCaptureId } from '../../types/ids';
import { resolveConceptualizeProfileContext, type ResolveConceptualizeProfileContextDeps } from '../conceptualizeProfileContext';
import { prepareSaveCandidates } from '../prepareSaveCandidates';
import { saveConceptualizedCaptureWithResult } from '../saveConceptualizedCapture';
import { saveCapture } from '../saveCapture';
import { CONCEPTUALIZE_PROMPT_OUTPUT_VERSION } from '../conceptualizePromptBuilder';

vi.mock('../../../../db/client', () => ({ db: {} }));
vi.mock('../../../../ai/queue', () => ({ enqueue: vi.fn() }));
vi.mock('../../../../ai/embed', () => ({ enqueueEmbed: vi.fn() }));
vi.mock('../../../../ai/scopes', () => ({ getEmbedConfig: vi.fn() }));
vi.mock('../conceptMatchPreCheck', () => ({ conceptMatchPreCheck: vi.fn() }));

const message: ChatMessage = {
  id: messageId('photo-message'),
  role: 'assistant',
  content: 'Place the subject off-centre to balance the frame.',
  createdAt: '2026-11-09T12:00:00Z',
};
const photoComposition = photographyProfile.ontology.nodes.find((node) => node.id === 'composition');
if (!photoComposition) throw new Error('Photography fixture must have composition');
// Deliberately seed the same node ID in an independent coding base.
const codingWithCollision: DomainProfile = {
  ...codingProfile,
  ontology: {
    ...codingProfile.ontology,
    nodes: [...codingProfile.ontology.nodes, { ...photoComposition, meaning: 'Combining software functions into a program.' }],
    itemTypeNodeIds: [...codingProfile.ontology.itemTypeNodeIds, 'composition'],
  },
};
const contextDeps: ResolveConceptualizeProfileContextDeps = {
  loadRegistry: async () => createProfileRegistry<string>({
    sources: [createStaticProfileSource<string>({ id: 'test-bases', profiles: [codingWithCollision, photographyProfile] })],
  }),
  getSelectionByProjectId: async () => undefined,
  getBranchesByIds: async () => [],
  listBranchesForParent: async () => [],
  loadUserFitFacts: async () => ({ correctionEvidence: [], proposalEvents: [] }),
};

afterEach(() => useSaveLearningStore.getState().reset());

describe('learning save profile transport in Node', () => {
  it('carries photography from store open to real save/repository mapping despite colliding node IDs', async () => {
    const photoNode = photographyProfile.ontology.nodes.find((node) => node.id === 'composition');
    const codingNode = codingWithCollision.ontology.nodes.find((node) => node.id === 'composition');
    expect(photoNode).toBeDefined();
    expect(codingNode).toBeDefined();
    expect(photoNode?.meaning).not.toBe(codingNode?.meaning);

    // Start at the store API with the concept context known to the route.
    // Neither the route nor the modal is rendered by this test.
    useSaveLearningStore.getState().open(message, chatId('photo-chat'), 'photography');
    const source = useSaveLearningStore.getState().source;
    if (!source) throw new Error('Store did not retain the save source');
    const context = await resolveConceptualizeProfileContext({
      profileId: source.profileId,
      projectId: source.projectId,
      deps: contextDeps,
    });
    const candidates = await prepareSaveCandidates(source, {
      conceptualizeContext: context,
      preCheck: async () => [],
      complete: async () => JSON.stringify({ candidates: [{
        title: 'Frame composition', whatClicked: message.content, whyItMattered: null,
        rawSnippet: message.content, keywords: ['composition'],
        conceptHint: {
          proposedName: 'Composition', proposedNormalizedKey: 'composition',
          proposedConceptType: 'composition', extractionConfidence: 0.8,
          linkedConceptId: null, linkedConceptName: null, linkedConceptLanguages: null,
          isNewLanguageForExistingConcept: false,
        },
      }] }),
      conceptualizeComplete: async () => JSON.stringify({
        schemaVersion: CONCEPTUALIZE_PROMPT_OUTPUT_VERSION,
        classification: {
          primaryNodeRef: {
            scopeId: context.profile.id,
            nodeId: context.profile.ontology.itemTypeNodeIds.includes('composition')
              ? 'composition' : context.profile.promotion.defaultTypeNodeId,
          },
          noStrongMatch: false, suggestedNewConcept: null, confidence: 0.9,
          rationale: 'Composition within the supplied domain.',
        },
        diagnostics: { candidateRefs: [] },
      }),
    });
    useSaveLearningStore.getState().setCandidates(candidates);
    const candidate = useSaveLearningStore.getState().candidates[0];
    if (!candidate) throw new Error('Expected one capture candidate');

    // Only the SQL transport is replaced. Actual save, insert mapping, write
    // validation and read codec run; this is not SQLite or a rollback test.
    const rows: (typeof learningCaptures.$inferInsert)[] = [];
    const sqlTransport = {
      insert: () => ({ values: async (row: typeof learningCaptures.$inferInsert) => { rows.push(structuredClone(row)); } }),
      select: () => ({ from: () => ({ where: async () => rows }) }),
    } as unknown as DbOrTx;
    const save = vi.fn<typeof saveCapture>((value, _deps, options) => saveCapture(value, {
      database: { transaction: async (run) => run(sqlTransport) },
      ensureSession: async () => {},
      embeddingQueue: { enqueue: () => {} },
      now: () => 1_800_000_000_000,
      newId: () => unsafeLearningCaptureId('lc_123456789012345678901'),
    }, options));
    const result = await saveConceptualizedCaptureWithResult(candidate, context, undefined, { deps: { save } });
    const decoded = await getCaptureById(result.captureId, sqlTransport);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.profileId).toBe('photography');
    expect(source.profileId).toBe('photography');
    expect(context.profile.ontology.nodes.find((node) => node.id === 'composition')?.meaning).toBe(photoNode?.meaning);
    expect(save.mock.calls[0]?.[0].profileId).toBe('photography');
    expect(decoded).toMatchObject({ profileId: 'photography', conceptHint: { proposedConceptType: 'composition' } });
    expect(result.profileProposal).toBeNull();
  });

  it('does not carry a previous explicit profile into a later unscoped chat', async () => {
    useSaveLearningStore.getState().open(message, chatId('photo-chat'), 'photography');
    useSaveLearningStore.getState().close();
    useSaveLearningStore.getState().open(message, chatId('unscoped-chat'));
    const context = await resolveConceptualizeProfileContext({
      profileId: useSaveLearningStore.getState().source?.profileId,
      deps: contextDeps,
    });
    expect(context.profile.id).toBe('coding');
  });

  it('rejects an explicit profile absent from the registry instead of defaulting to coding', async () => {
    useSaveLearningStore.getState().openFromSource({ selectedText: message.content, profileId: 'missing-profile' });
    await expect(resolveConceptualizeProfileContext({
      profileId: useSaveLearningStore.getState().source?.profileId,
      deps: contextDeps,
    })).rejects.toThrow();
  });

  it('rejects a blank explicit profile rather than interpreting it as missing context', async () => {
    await expect(resolveConceptualizeProfileContext({ profileId: ' ', deps: contextDeps })).rejects.toThrow();
  });

  it('refuses to prepare a known photography source with the coding default', async () => {
    await expect(prepareSaveCandidates({ selectedText: message.content, profileId: 'photography' }, {
      preCheck: async () => [],
      complete: async () => JSON.stringify({ candidates: [{
        title: 'Frame', whatClicked: message.content, whyItMattered: null,
        rawSnippet: message.content, keywords: [], conceptHint: null,
      }] }),
    })).rejects.toThrow(/does not match/);
  });

  it('uses the explicit base when a project has no saved selection', async () => {
    const context = await resolveConceptualizeProfileContext({
      projectId: 'new-project', profileId: 'photography', deps: contextDeps,
    });
    expect(context.baseProfile.id).toBe('photography');
  });

  it.each(['photography', 'coding'])('checks explicit photography against project selection %s', async (baseProfileId) => {
    const resolving = resolveConceptualizeProfileContext({
      projectId: 'selected-project', profileId: 'photography',
      deps: {
        ...contextDeps,
        getSelectionByProjectId: async () => ({
          id: 'selection', projectId: 'selected-project',
          selection: { baseProfileId }, createdAt: 1, updatedAt: 1,
        }),
      },
    });
    if (baseProfileId === 'coding') {
      await expect(resolving).rejects.toThrow(/does not match/);
    } else {
      expect((await resolving).selectionSnapshot.baseProfileId).toBe('photography');
    }
  });
});
