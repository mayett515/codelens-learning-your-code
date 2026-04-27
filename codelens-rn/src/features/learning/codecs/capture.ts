import { z } from 'zod';
import { learningCaptures } from '../data/schema';
import { ConceptTypeEnum } from './concept';
import { isConceptId, isLearningCaptureId, unsafeConceptId, unsafeLearningCaptureId } from '../types/ids';
import type { ConceptHint, LearningCapture } from '../types/learning';

export const CaptureStateEnum = z.enum(['unresolved', 'linked', 'proposed_new']);
export const EmbeddingStatusEnum = z.enum(['pending', 'ready', 'failed']);

export const KeywordsCodec = z.array(z.string()).default([]);
export const ConceptHintCodec = z.object({
  proposedName: z.string(),
  proposedNormalizedKey: z.string(),
  proposedConceptType: ConceptTypeEnum,
  extractionConfidence: z.number().min(0).max(1),
  linkedConceptId: z.custom<import('../types/ids').ConceptId>(isConceptId).nullable(),
  linkedConceptName: z.string().nullable(),
  linkedConceptLanguages: z.array(z.string()).nullable(),
  isNewLanguageForExistingConcept: z.boolean(),
}).nullable();

type LearningCaptureRow = Omit<typeof learningCaptures.$inferSelect, 'embeddingTier' | 'lastAccessedAt'> &
  Partial<Pick<typeof learningCaptures.$inferSelect, 'embeddingTier' | 'lastAccessedAt'>>;

function parseJson(raw: unknown, columnName: string): unknown {
  if (typeof raw === 'string') return JSON.parse(raw);
  if (raw === undefined) {
    throw new Error(`Missing JSON column ${columnName}`);
  }
  return raw;
}

export function parseConceptHint(raw: unknown): ConceptHint | null {
  return ConceptHintCodec.parse(raw === null ? null : parseJson(raw, 'concept_hint_json'));
}

export function parseKeywords(raw: unknown): string[] {
  return KeywordsCodec.parse(parseJson(raw, 'keywords_json'));
}

export function captureRowToDomain(row: LearningCaptureRow): LearningCapture {
  const snippetSource = row.snippetSourcePath === null
    ? null
    : {
        path: row.snippetSourcePath,
        startLine: z.number().int().positive().parse(row.snippetStartLine),
        endLine: z.number().int().positive().parse(row.snippetEndLine),
      };

  return {
    id: unsafeLearningCaptureId(row.id),
    title: row.title,
    whatClicked: row.whatClicked,
    whyItMattered: row.whyItMattered,
    rawSnippet: row.rawSnippet,
    snippetLang: row.snippetLang,
    snippetSource,
    chatMessageId: row.chatMessageId,
    sessionId: row.sessionId,
    state: CaptureStateEnum.parse(row.state),
    linkedConceptId: row.linkedConceptId === null ? null : unsafeConceptId(row.linkedConceptId),
    editableUntil: row.editableUntil,
    extractionConfidence: row.extractionConfidence,
    derivedFromCaptureId: row.derivedFromCaptureId === null
      ? null
      : unsafeLearningCaptureId(row.derivedFromCaptureId),
    embeddingStatus: EmbeddingStatusEnum.parse(row.embeddingStatus),
    embeddingRetryCount: row.embeddingRetryCount,
    conceptHint: parseConceptHint(row.conceptHint),
    keywords: parseKeywords(row.keywords),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function validateCaptureForWrite(capture: LearningCapture): LearningCapture {
  if (!isLearningCaptureId(capture.id)) throw new Error(`Invalid capture id: ${capture.id}`);
  if (capture.linkedConceptId !== null && !isConceptId(capture.linkedConceptId)) {
    throw new Error(`Invalid linked concept id: ${capture.linkedConceptId}`);
  }
  if (capture.derivedFromCaptureId !== null && !isLearningCaptureId(capture.derivedFromCaptureId)) {
    throw new Error(`Invalid derived capture id: ${capture.derivedFromCaptureId}`);
  }
  ConceptHintCodec.parse(capture.conceptHint);
  KeywordsCodec.parse(capture.keywords);
  return capture;
}
