import { describe, expect, it } from 'vitest';
import { computeClusters } from '../clustering/computeClusters';
import { clusterFingerprint } from '../clustering/fingerprint';
import { unsafeLearningCaptureId } from '../../types/ids';
import type { LearningCapture } from '../../types/learning';

function capture(index: number, overrides: Partial<LearningCapture> = {}): LearningCapture {
  return {
    id: unsafeLearningCaptureId(`lc_${String(index).padStart(21, 'a')}`),
    title: `Capture ${index}`,
    whatClicked: 'clicked',
    whyItMattered: null,
    rawSnippet: 'const x = 1',
    snippetLang: 'typescript',
    snippetSource: null,
    chatMessageId: null,
    sessionId: index % 2 === 0 ? 'session-a' : 'session-b',
    state: 'unresolved',
    linkedConceptId: null,
    editableUntil: 1,
    extractionConfidence: 0.8,
    derivedFromCaptureId: null,
    embeddingStatus: 'ready',
    embeddingRetryCount: 0,
    conceptHint: {
      proposedName: 'Closure',
      proposedNormalizedKey: 'closure',
      proposedConceptType: 'mechanism',
      extractionConfidence: 0.8,
      linkedConceptId: null,
      linkedConceptName: null,
      linkedConceptLanguages: null,
      isNewLanguageForExistingConcept: false,
    },
    keywords: ['closure', 'scope'],
    createdAt: index,
    updatedAt: index,
    ...overrides,
  };
}

describe('Stage 5 clustering', () => {
  it('uses deterministic SHA-256 fingerprints over sorted capture ids', async () => {
    const first = unsafeLearningCaptureId('lc_bbbbbbbbbbbbbbbbbbbbb');
    const second = unsafeLearningCaptureId('lc_aaaaaaaaaaaaaaaaaaaaa');

    await expect(clusterFingerprint([first, second])).resolves.toHaveLength(64);
    await expect(clusterFingerprint([first, second])).resolves.toBe(await clusterFingerprint([second, first]));
  });

  it('requires size, sessions, shared keywords, ready embeddings, and unresolved/proposed state', async () => {
    const eligible = [
      capture(1),
      capture(2),
      capture(3),
      capture(4, { state: 'linked', linkedConceptId: 'c_aaaaaaaaaaaaaaaaaaaaa' as never }),
      capture(5, { embeddingStatus: 'pending' }),
    ];

    const clusters = await computeClusters({
      findEligibleCaptures: async () =>
        eligible.filter(
          (item) =>
            (item.state === 'unresolved' || item.state === 'proposed_new') &&
            item.linkedConceptId === null &&
            item.embeddingStatus === 'ready',
        ),
      topMatches: async (item, ids) =>
        ids
          .filter((id) => id !== item.id)
          .map((id) => ({ id, cosine: 0.82 })),
      dismissals: async () => [],
    });

    expect(clusters).toHaveLength(1);
    expect(clusters[0].captureIds).toHaveLength(3);
    expect(clusters[0].sessionCount).toBe(2);
    expect(clusters[0].sharedKeywords).toContain('closure');
  });

  it('hides soft-dismissed clusters until they grow enough', async () => {
    const captures = [capture(1), capture(2), capture(3)];
    const fingerprint = await clusterFingerprint(captures.map((item) => item.id));
    const clusters = await computeClusters({
      findEligibleCaptures: async () => captures,
      topMatches: async (item, ids) =>
        ids.filter((id) => id !== item.id).map((id) => ({ id, cosine: 0.82 })),
      dismissals: async () => [{
        fingerprint,
        dismissedAt: Date.now(),
        captureIds: captures.map((item) => item.id),
        captureCount: 3,
        isPermanent: false,
        proposedNormalizedKey: 'closure',
      }],
    });

    expect(clusters).toEqual([]);
  });

  it('uses proposed normalized key for soft-dismissal resurfacing', async () => {
    const dismissedCaptures = [capture(1), capture(2), capture(3)];
    const grownCaptures = [...dismissedCaptures, capture(4)];
    const oldFingerprint = await clusterFingerprint(dismissedCaptures.map((item) => item.id));
    const clusters = await computeClusters({
      findEligibleCaptures: async () => grownCaptures,
      topMatches: async (item, ids) =>
        ids.filter((id) => id !== item.id).map((id) => ({ id, cosine: 0.82 })),
      dismissals: async () => [{
        fingerprint: oldFingerprint,
        dismissedAt: Date.now(),
        captureIds: dismissedCaptures.map((item) => item.id),
        captureCount: 3,
        isPermanent: false,
        proposedNormalizedKey: 'closure',
      }],
    });

    expect(clusters).toEqual([]);
  });

  it('resurfaces a soft dismissal after growth by two captures', async () => {
    const dismissedCaptures = [capture(1), capture(2), capture(3)];
    const grownCaptures = [...dismissedCaptures, capture(4), capture(5)];
    const oldFingerprint = await clusterFingerprint(dismissedCaptures.map((item) => item.id));
    const clusters = await computeClusters({
      findEligibleCaptures: async () => grownCaptures,
      topMatches: async (item, ids) =>
        ids.filter((id) => id !== item.id).map((id) => ({ id, cosine: 0.82 })),
      dismissals: async () => [{
        fingerprint: oldFingerprint,
        dismissedAt: Date.now(),
        captureIds: dismissedCaptures.map((item) => item.id),
        captureCount: 3,
        isPermanent: false,
        proposedNormalizedKey: 'closure',
      }],
    });

    expect(clusters).toHaveLength(1);
    expect(clusters[0].captureIds).toHaveLength(5);
  });
});
