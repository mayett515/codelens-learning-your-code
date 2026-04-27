import { getRawDb } from '../../../../db/client';
import { enqueueEmbed } from '../../../../ai/embed';
import { getEmbedConfig } from '../../../../ai/scopes';
import { conceptSignature } from '../../lib/hash';
import { l2Normalize } from '../../lib/l2';
import { buildCaptureEmbeddingText } from '../../extractor/buildCaptureEmbeddingText';
import { getCaptureById } from '../../data/captureRepo';
import { getLearningConceptById } from '../../data/conceptRepo';
import { buildLearningConceptEmbeddingText } from '../../promotion/services/conceptEmbedding';
import { float32ToBlob, hasVector } from '../data/embeddingsVecRepo';
import type { ConceptId, LearningCaptureId } from '../../types/ids';
import type { RetrievedMemoryKind } from '../types/retrieval';

export async function ensureEmbedded(ref: {
  kind: RetrievedMemoryKind;
  id: LearningCaptureId | ConceptId;
}): Promise<void> {
  const tier = await readEmbeddingTier(ref);
  if (tier === 'hot' && await hasVector(ref.id)) return;

  const text = await buildEmbeddingTextFor(ref);
  const config = getEmbedConfig();
  const raw = await enqueueEmbed(text, config.provider, config.model);
  const vector = l2Normalize(raw);
  const now = Date.now();

  await getRawDb().transaction(async (tx) => {
    await tx.execute(
      `INSERT OR REPLACE INTO embeddings_meta (concept_id, model, api, signature, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [ref.id, config.model, config.provider, conceptSignature(text), new Date(now).toISOString()],
    );
    await tx.execute('DELETE FROM embeddings_vec WHERE concept_id = ?', [ref.id]);
    await tx.execute(
      'INSERT INTO embeddings_vec (concept_id, embedding) VALUES (?, ?)',
      [ref.id, float32ToBlob(vector)],
    );
    if (ref.kind === 'capture') {
      await tx.execute(
        `UPDATE learning_captures
         SET embedding_tier = 'hot', embedding_status = 'ready', last_accessed_at = ?
         WHERE id = ?`,
        [now, ref.id],
      );
    } else {
      await tx.execute(
        `UPDATE concepts SET embedding_tier = 'hot', last_accessed_at = ? WHERE id = ?`,
        [now, ref.id],
      );
    }
  });
}

async function readEmbeddingTier(ref: { kind: RetrievedMemoryKind; id: string }): Promise<'hot' | 'cold'> {
  const table = ref.kind === 'capture' ? 'learning_captures' : 'concepts';
  const result = await getRawDb().execute(`SELECT embedding_tier FROM ${table} WHERE id = ? LIMIT 1`, [ref.id]);
  return result.rows[0]?.embedding_tier === 'hot' ? 'hot' : 'cold';
}

async function buildEmbeddingTextFor(ref: {
  kind: RetrievedMemoryKind;
  id: LearningCaptureId | ConceptId;
}): Promise<string> {
  if (ref.kind === 'capture') {
    const capture = await getCaptureById(ref.id as LearningCaptureId);
    if (!capture) throw new Error(`Cannot embed missing capture: ${ref.id}`);
    return buildCaptureEmbeddingText({
      title: capture.title,
      whatClicked: capture.whatClicked,
      whyItMattered: capture.whyItMattered,
      rawSnippet: capture.rawSnippet,
      snippetLang: capture.snippetLang,
      snippetSourcePath: capture.snippetSource?.path ?? null,
      snippetStartLine: capture.snippetSource?.startLine ?? null,
      snippetEndLine: capture.snippetSource?.endLine ?? null,
      chatMessageId: capture.chatMessageId,
      sessionId: capture.sessionId,
      derivedFromCaptureId: capture.derivedFromCaptureId,
      isNewLanguageForExistingConcept: false,
      linkedConceptName: null,
      linkedConceptLanguages: null,
      linkedConceptId: capture.linkedConceptId,
      extractionConfidence: capture.extractionConfidence,
      matchSimilarity: null,
      conceptHint: capture.conceptHint,
      keywords: capture.keywords,
    });
  }

  const concept = await getLearningConceptById(ref.id as ConceptId);
  if (!concept) throw new Error(`Cannot embed missing concept: ${ref.id}`);
  return buildLearningConceptEmbeddingText(concept);
}
