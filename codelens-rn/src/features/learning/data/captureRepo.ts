import { asc, desc, eq, sql } from 'drizzle-orm';
import { db, type DbOrTx } from '../../../db/client';
import { learningCaptures } from './schema';
import { captureRowToDomain, validateCaptureForWrite } from '../codecs/capture';
import type { LearningCapture } from '../types/learning';
import type { ConceptId, LearningCaptureId } from '../types/ids';

export async function insertCapture(
  capture: LearningCapture,
  executor: DbOrTx = db,
): Promise<void> {
  const validCapture = validateCaptureForWrite(capture);
  await executor.insert(learningCaptures).values({
    id: validCapture.id,
    title: validCapture.title,
    whatClicked: validCapture.whatClicked,
    whyItMattered: validCapture.whyItMattered,
    rawSnippet: validCapture.rawSnippet,
    snippetLang: validCapture.snippetLang,
    snippetSourcePath: validCapture.snippetSource?.path ?? null,
    snippetStartLine: validCapture.snippetSource?.startLine ?? null,
    snippetEndLine: validCapture.snippetSource?.endLine ?? null,
    chatMessageId: validCapture.chatMessageId,
    sessionId: validCapture.sessionId,
    state: validCapture.state,
    linkedConceptId: validCapture.linkedConceptId,
    editableUntil: validCapture.editableUntil,
    extractionConfidence: validCapture.extractionConfidence,
    derivedFromCaptureId: validCapture.derivedFromCaptureId,
    embeddingStatus: validCapture.embeddingStatus,
    embeddingRetryCount: validCapture.embeddingRetryCount,
    conceptHint: validCapture.conceptHint,
    keywords: validCapture.keywords,
    createdAt: validCapture.createdAt,
    updatedAt: validCapture.updatedAt,
  });
}

export async function getCaptureById(
  id: LearningCaptureId,
  executor: DbOrTx = db,
): Promise<LearningCapture | undefined> {
  const rows = await executor.select().from(learningCaptures).where(eq(learningCaptures.id, id));
  return rows[0] ? captureRowToDomain(rows[0]) : undefined;
}

export async function getRecentCaptures(
  limit: number,
  executor: DbOrTx = db,
): Promise<LearningCapture[]> {
  const rows = await executor
    .select()
    .from(learningCaptures)
    .orderBy(desc(learningCaptures.createdAt), asc(learningCaptures.id))
    .limit(limit);
  return rows.map(captureRowToDomain);
}

export async function getCapturesByConceptId(
  conceptId: ConceptId,
  executor: DbOrTx = db,
): Promise<LearningCapture[]> {
  const rows = await executor
    .select()
    .from(learningCaptures)
    .where(eq(learningCaptures.linkedConceptId, conceptId))
    .orderBy(desc(learningCaptures.createdAt), asc(learningCaptures.id));
  return rows.map(captureRowToDomain);
}

export async function getCapturesBySessionId(
  sessionId: string,
  executor: DbOrTx = db,
): Promise<LearningCapture[]> {
  const rows = await executor
    .select()
    .from(learningCaptures)
    .where(eq(learningCaptures.sessionId, sessionId))
    .orderBy(desc(learningCaptures.createdAt), asc(learningCaptures.id));
  return rows.map(captureRowToDomain);
}

export async function setCaptureEmbeddingStatus(
  id: LearningCaptureId,
  status: 'pending' | 'ready' | 'failed',
  updatedAt: number,
  executor: DbOrTx = db,
): Promise<void> {
  await executor
    .update(learningCaptures)
    .set({ embeddingStatus: status, updatedAt })
    .where(eq(learningCaptures.id, id));
}

export async function incrementCaptureEmbeddingRetry(
  id: LearningCaptureId,
  updatedAt: number,
  executor: DbOrTx = db,
): Promise<void> {
  await executor
    .update(learningCaptures)
    .set({
      embeddingStatus: 'failed',
      embeddingRetryCount: sql`${learningCaptures.embeddingRetryCount} + 1`,
      updatedAt,
    })
    .where(eq(learningCaptures.id, id));
}
