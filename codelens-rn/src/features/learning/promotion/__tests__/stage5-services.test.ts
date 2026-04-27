import { describe, expect, it, vi } from 'vitest';
import { unsafeConceptId, unsafeLearningCaptureId } from '../../types/ids';
import { buildConceptFromCluster } from '../services/buildConceptFromCluster';
import { pickRepresentativeCaptureIds } from '../services/representativeCaptureIds';
import { promoteToConcept } from '../services/promoteToConcept';
import { linkCapturesToExistingConcept } from '../services/linkCapturesToExistingConcept';
import { EmptyPromotionError, NormalizedKeyConflictError } from '../types/promotion';
import type { DbOrTx } from '../../../../db/client';
import type { LearningCapture, LearningConcept } from '../../types/learning';

vi.mock('../../../../db/client', () => ({
  db: {
    transaction: vi.fn(),
  },
}));

const conceptId = unsafeConceptId('c_123456789012345678901');
const captureId1 = unsafeLearningCaptureId('lc_111111111111111111111');
const captureId2 = unsafeLearningCaptureId('lc_222222222222222222222');
const captureId3 = unsafeLearningCaptureId('lc_333333333333333333333');

function capture(id: typeof captureId1, confidence: number, createdAt: number): LearningCapture {
  return {
    id,
    title: 'Closure',
    whatClicked: 'clicked',
    whyItMattered: null,
    rawSnippet: 'const x = 1',
    snippetLang: 'typescript',
    snippetSource: null,
    chatMessageId: null,
    sessionId: 'session-a',
    state: 'unresolved',
    linkedConceptId: null,
    editableUntil: 1,
    extractionConfidence: confidence,
    derivedFromCaptureId: null,
    embeddingStatus: 'ready',
    embeddingRetryCount: 0,
    conceptHint: null,
    keywords: ['closure', 'scope'],
    createdAt,
    updatedAt: createdAt,
  };
}

function concept(overrides: Partial<LearningConcept> = {}): LearningConcept {
  return {
    id: conceptId,
    name: 'Closure',
    normalizedKey: 'closure',
    canonicalSummary: null,
    conceptType: 'mechanism',
    coreConcept: null,
    architecturalPattern: null,
    programmingParadigm: null,
    languageOrRuntime: ['javascript'],
    surfaceFeatures: ['scope'],
    prerequisites: [],
    relatedConcepts: [],
    contrastConcepts: [],
    representativeCaptureIds: [],
    familiarityScore: 0.9,
    importanceScore: 0.9,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe('Stage 5 promotion services', () => {
  it('picks representative captures by confidence, created_at, then id', () => {
    expect(pickRepresentativeCaptureIds([
      capture(captureId1, 0.7, 3),
      capture(captureId2, 0.9, 1),
      capture(captureId3, 0.9, 2),
    ])).toEqual([captureId3, captureId2, captureId1]);
  });

  it('builds promoted concepts with baseline scores and preserved evidence ids', () => {
    const built = buildConceptFromCluster(
      {
        fingerprint: null,
        name: 'Closure',
        conceptType: 'mechanism',
        includedCaptureIds: [captureId1],
        source: 'cluster',
      },
      conceptId,
      [capture(captureId1, 0.8, 1)],
      100,
    );

    expect(built).toMatchObject({
      familiarityScore: 0.3,
      importanceScore: 0.5,
      normalizedKey: 'closure',
      representativeCaptureIds: [captureId1],
      surfaceFeatures: ['closure', 'scope'],
    });
  });

  it('surfaces normalized key conflicts before inserting', async () => {
    await expect(promoteToConcept(
      {
        fingerprint: null,
        name: 'Closure',
        conceptType: 'mechanism',
        includedCaptureIds: [captureId1],
        source: 'cluster',
      },
      {
        findConceptByNormalizedKey: async () => concept(),
      },
    )).rejects.toBeInstanceOf(NormalizedKeyConflictError);
  });

  it('creates concept and links captures atomically before embedding', async () => {
    const inserted: LearningConcept[] = [];
    const linked: string[] = [];
    const enqueued: LearningConcept[] = [];
    const tx = {} as DbOrTx;

    const result = await promoteToConcept(
      {
        fingerprint: 'fp',
        name: 'Closure',
        conceptType: 'mechanism',
        includedCaptureIds: [captureId1],
        source: 'cluster',
      },
      {
        database: { transaction: async (fn) => fn(tx) },
        getCaptures: async () => [capture(captureId1, 0.8, 1)],
        findConceptByNormalizedKey: async () => undefined,
        insertConcept: async (item) => { inserted.push(item); },
        linkCapture: async (id) => { linked.push(id); },
        removeSuggestion: vi.fn(async () => undefined),
        embeddingQueue: { enqueue: (item) => enqueued.push(item) },
        now: () => 100,
        newId: () => conceptId,
        recompute: vi.fn(async () => undefined),
      },
    );

    expect(result.conceptId).toBe(conceptId);
    expect(inserted[0].familiarityScore).toBe(0.3);
    expect(linked).toEqual([captureId1]);
    expect(enqueued).toHaveLength(1);
  });

  it('requires at least one capture', async () => {
    await expect(promoteToConcept({
      fingerprint: null,
      name: 'Closure',
      conceptType: 'mechanism',
      includedCaptureIds: [],
      source: 'cluster',
    })).rejects.toBeInstanceOf(EmptyPromotionError);
  });

  it('link-existing path leaves target scores untouched and appends metadata', async () => {
    const target = concept();
    const appendLanguage = vi.fn(async () => undefined);
    const appendSurfaceFeatures = vi.fn(async () => undefined);

    await linkCapturesToExistingConcept(
      {
        fingerprint: null,
        targetConceptId: conceptId,
        includedCaptureIds: [captureId1],
        sharedKeywords: ['closure'],
      },
      {
        database: { transaction: async (fn) => fn({} as DbOrTx) },
        getTargetConcept: async () => target,
        getCaptures: async () => [capture(captureId1, 0.8, 1)],
        linkCapture: vi.fn(async () => undefined),
        appendLanguage,
        appendSurfaceFeatures,
        removeSuggestion: vi.fn(async () => undefined),
        embeddingQueue: { enqueue: vi.fn() },
        now: () => 100,
        recompute: vi.fn(async () => undefined),
      },
    );

    expect(target.familiarityScore).toBe(0.9);
    expect(target.importanceScore).toBe(0.9);
    expect(appendLanguage).toHaveBeenCalledWith(conceptId, 'typescript', expect.anything());
    expect(appendSurfaceFeatures).toHaveBeenCalledWith(conceptId, ['closure'], expect.anything());
  });
});
