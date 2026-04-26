import { describe, expect, it, vi } from 'vitest';
import { saveCapture } from '../saveCapture';
import type { DbOrTx } from '../../../../db/client';
import { unsafeConceptId, unsafeLearningCaptureId } from '../../types/ids';
import type { LearningCapture } from '../../types/learning';
import type { SaveModalCandidateData } from '../../types/saveModal';

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

const conceptId = unsafeConceptId('c_123456789012345678901');
const captureId = unsafeLearningCaptureId('lc_123456789012345678901');

function candidate(overrides: Partial<SaveModalCandidateData> = {}): SaveModalCandidateData {
  return {
    title: 'Closure keeps outer state',
    whatClicked: 'The returned function can still read the outer variable.',
    whyItMattered: null,
    rawSnippet: 'const value = 1; return () => value;',
    snippetLang: 'typescript',
    snippetSourcePath: 'src/example.ts',
    snippetStartLine: 1,
    snippetEndLine: 2,
    chatMessageId: null,
    sessionId: null,
    derivedFromCaptureId: null,
    isNewLanguageForExistingConcept: false,
    linkedConceptName: null,
    linkedConceptLanguages: null,
    linkedConceptId: null,
    extractionConfidence: null,
    matchSimilarity: null,
    conceptHint: null,
    ...overrides,
  };
}

function deps() {
  const inserted: LearningCapture[] = [];
  const enqueued: Array<{ onSuccess: () => Promise<void>; onFailure: () => Promise<void> }> = [];
  const tx = { tx: true } as unknown as DbOrTx;

  return {
    inserted,
    enqueued,
    appendLanguage: vi.fn(async () => undefined),
    ensureSession: vi.fn(async () => undefined),
    insert: vi.fn(async (capture: LearningCapture) => {
      inserted.push(capture);
    }),
    database: {
      transaction: async <T>(fn: (executor: DbOrTx) => Promise<T>): Promise<T> => fn(tx),
    },
    embeddingQueue: {
      enqueue: vi.fn((job: { onSuccess: () => Promise<void>; onFailure: () => Promise<void> }) => {
        enqueued.push(job);
      }),
    },
    now: () => 1_800_000_000_000,
    newId: () => captureId,
  };
}

describe('Stage 2 saveCapture', () => {
  it('persists unresolved when no concept is linked', async () => {
    const d = deps();
    await saveCapture(candidate(), d);

    expect(d.inserted[0]).toMatchObject({
      id: captureId,
      state: 'unresolved',
      linkedConceptId: null,
      embeddingStatus: 'pending',
      editableUntil: 1_800_086_400_000,
    });
    expect(d.enqueued).toHaveLength(1);
  });

  it('blocks weak concept links but still saves the capture', async () => {
    const d = deps();
    await saveCapture(
      candidate({
        linkedConceptId: conceptId,
        extractionConfidence: 0.5,
        matchSimilarity: 0.5,
      }),
      d,
    );

    expect(d.inserted[0].state).toBe('unresolved');
    expect(d.inserted[0].linkedConceptId).toBeNull();
  });

  it('links when similarity is strong enough', async () => {
    const d = deps();
    await saveCapture(candidate({ linkedConceptId: conceptId, matchSimilarity: 0.65 }), d);

    expect(d.inserted[0].state).toBe('linked');
    expect(d.inserted[0].linkedConceptId).toBe(conceptId);
  });

  it('links when extraction confidence is strong enough', async () => {
    const d = deps();
    await saveCapture(candidate({ linkedConceptId: conceptId, extractionConfidence: 0.7 }), d);

    expect(d.inserted[0].state).toBe('linked');
    expect(d.inserted[0].linkedConceptId).toBe(conceptId);
  });

  it('appends language for cross-language existing concept matches', async () => {
    const d = deps();
    await saveCapture(
      candidate({
        linkedConceptId: conceptId,
        extractionConfidence: 0.8,
        isNewLanguageForExistingConcept: true,
        snippetLang: 'typescript',
      }),
      d,
    );

    expect(d.appendLanguage).toHaveBeenCalledWith(conceptId, 'typescript', expect.anything());
  });

  it('ensures a learning session row when the capture has a session id', async () => {
    const d = deps();
    await saveCapture(candidate({ sessionId: 'chat_session_1' }), d);

    expect(d.ensureSession).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'chat_session_1',
        sourceChatId: 'chat_session_1',
        conceptId: null,
        rawSnippet: 'const value = 1; return () => value;',
      }),
      expect.anything(),
    );
  });

  it('writes derivedFromCaptureId', async () => {
    const d = deps();
    const parentId = unsafeLearningCaptureId('lc_abcdefghijklmnopqrstu');
    await saveCapture(candidate({ derivedFromCaptureId: parentId }), d);

    expect(d.inserted[0].derivedFromCaptureId).toBe(parentId);
  });

  it('does not enqueue embedding when the DB write fails', async () => {
    const d = deps();
    d.insert.mockRejectedValueOnce(new Error('db failed'));

    await expect(saveCapture(candidate(), d)).rejects.toThrow('db failed');
    expect(d.embeddingQueue.enqueue).not.toHaveBeenCalled();
  });

  it('saving one candidate does not mutate another candidate', async () => {
    const d = deps();
    const first = candidate({ title: 'First' });
    const second = candidate({ title: 'Second' });

    await saveCapture(first, d);

    expect(second.title).toBe('Second');
    expect(d.inserted[0].title).toBe('First');
  });
});
