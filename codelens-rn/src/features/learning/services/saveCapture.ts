import { enqueueEmbed } from '../../../ai/embed';
import { getEmbedConfig } from '../../../ai/scopes';
import { db, type DbOrTx } from '../../../db/client';
import { newLearningCaptureId, type LearningCaptureId } from '../types/ids';
import { appendConceptLanguage } from '../data/conceptRepo';
import { ensureLearningSessionForCapture } from '../data/learning-sessions';
import {
  incrementCaptureEmbeddingRetry,
  insertCapture,
  setCaptureEmbeddingStatus,
} from '../data/captureRepo';
import { buildCaptureEmbeddingText } from '../extractor/buildCaptureEmbeddingText';
import type { LearningCapture } from '../types/learning';
import type { SaveModalCandidateData } from '../types/saveModal';

interface EmbeddingQueue {
  enqueue(input: {
    captureId: LearningCaptureId;
    text: string;
    onSuccess: () => Promise<void>;
    onFailure: () => Promise<void>;
  }): void;
}

interface SaveCaptureDeps {
  database: {
    transaction<T>(fn: (tx: DbOrTx) => Promise<T>): Promise<T>;
  };
  insert: (capture: LearningCapture, executor: DbOrTx) => Promise<void>;
  appendLanguage: (id: NonNullable<SaveModalCandidateData['linkedConceptId']>, language: string, executor: DbOrTx) => Promise<void>;
  ensureSession: (input: {
    sessionId: string;
    sourceChatId: string;
    conceptId: NonNullable<SaveModalCandidateData['linkedConceptId']> | null;
    title: string;
    rawSnippet: string;
    createdAt: number;
  }, executor: DbOrTx) => Promise<void>;
  embeddingQueue: EmbeddingQueue;
  schedulePromotionRecompute: () => Promise<void>;
  now: () => number;
  newId: () => LearningCaptureId;
}

const defaultEmbeddingQueue: EmbeddingQueue = {
  enqueue(input) {
    const run = async (): Promise<void> => {
      try {
        const embedConfig = getEmbedConfig();
        await enqueueEmbed(input.text, embedConfig.provider, embedConfig.model);
        await input.onSuccess();
      } catch (error) {
        console.warn('[learning] capture embedding failed after save', error);
        await input.onFailure();
      }
    };

    run().catch((error) => {
      console.warn('[learning] capture embedding failure handling failed', error);
    });
  },
};

const defaultDeps: SaveCaptureDeps = {
  database: db,
  insert: insertCapture,
  appendLanguage: appendConceptLanguage,
  ensureSession: ensureLearningSessionForCapture,
  embeddingQueue: defaultEmbeddingQueue,
  schedulePromotionRecompute: async () => {
    const { maybeRecomputeSuggestions } = await import('../promotion/services/maybeRecomputeSuggestions');
    await maybeRecomputeSuggestions('post_save');
  },
  now: Date.now,
  newId: newLearningCaptureId,
};

export async function saveCapture(
  candidate: SaveModalCandidateData,
  deps: Partial<SaveCaptureDeps> = {},
  options: { saveAsProposedNew?: boolean } = {},
): Promise<LearningCaptureId> {
  const resolvedDeps = { ...defaultDeps, ...deps };
  const captureId = resolvedDeps.newId();
  const now = resolvedDeps.now();

  await resolvedDeps.database.transaction(async (tx) => {
    const confidence = candidate.extractionConfidence ?? 0;
    const similarity = candidate.matchSimilarity ?? 0;
    const linkingAllowed = similarity >= 0.65 || confidence >= 0.70;

    const linkedConceptId = candidate.linkedConceptId && linkingAllowed
      ? candidate.linkedConceptId
      : null;
    const state = linkedConceptId ? 'linked' : options.saveAsProposedNew ? 'proposed_new' : 'unresolved';

    if (linkedConceptId && candidate.isNewLanguageForExistingConcept && candidate.snippetLang) {
      await resolvedDeps.appendLanguage(linkedConceptId, candidate.snippetLang, tx);
    }

    if (candidate.sessionId) {
      await resolvedDeps.ensureSession(
        {
          sessionId: candidate.sessionId,
          sourceChatId: candidate.sessionId,
          conceptId: linkedConceptId,
          title: `Captured from ${candidate.sessionId}`,
          rawSnippet: candidate.rawSnippet.slice(0, 800),
          createdAt: now,
        },
        tx,
      );
    }

    await resolvedDeps.insert(
      {
        id: captureId,
        title: candidate.title,
        whatClicked: candidate.whatClicked,
        whyItMattered: candidate.whyItMattered,
        rawSnippet: candidate.rawSnippet.slice(0, 800),
        snippetLang: candidate.snippetLang,
        snippetSource: candidate.snippetSourcePath
          ? {
              path: candidate.snippetSourcePath,
              startLine: candidate.snippetStartLine ?? 1,
              endLine: candidate.snippetEndLine ?? candidate.snippetStartLine ?? 1,
            }
          : null,
        chatMessageId: candidate.chatMessageId,
        sessionId: candidate.sessionId,
        state,
        linkedConceptId,
        editableUntil: now + 24 * 60 * 60 * 1000,
        extractionConfidence: candidate.extractionConfidence,
        derivedFromCaptureId: candidate.derivedFromCaptureId,
        embeddingStatus: 'pending',
        embeddingRetryCount: 0,
        conceptHint: candidate.conceptHint,
        keywords: candidate.keywords,
        createdAt: now,
        updatedAt: now,
      },
      tx,
    );
  });

  resolvedDeps.embeddingQueue.enqueue({
    captureId,
    text: buildCaptureEmbeddingText(candidate),
    onSuccess: async () => {
      await setCaptureEmbeddingStatus(captureId, 'ready', resolvedDeps.now());
      await resolvedDeps.schedulePromotionRecompute();
    },
    onFailure: () => incrementCaptureEmbeddingRetry(captureId, resolvedDeps.now()),
  });

  return captureId;
}
