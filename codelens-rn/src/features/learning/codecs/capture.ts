import { z } from 'zod';
import { learningCaptures } from '../data/schema';
import { ConceptTypeEnum } from './concept';
import { isConceptId, isLearningCaptureId, unsafeConceptId, unsafeLearningCaptureId } from '../types/ids';
import type { ConceptHint, LearningCapture } from '../types/learning';

export const CaptureStateEnum = z.enum(['unresolved', 'linked', 'proposed_new']);
export const EmbeddingStatusEnum = z.enum(['pending', 'ready', 'failed']);

export interface CaptureClassificationJson {
  profileId: 'coding';
  proposedTypeNodeId: string;
  proposedName: string;
  proposedNormalizedKey: string;
  extractionConfidence: number;
  linkedConceptId: string | null;
  linkedConceptName: string | null;
  linkedConceptLanguages: string[] | null;
  isNewLanguageForExistingConcept: boolean;
}

export function buildCaptureClassificationJson(hint: ConceptHint): CaptureClassificationJson {
  return {
    profileId: 'coding',
    proposedTypeNodeId: hint.proposedConceptType,
    proposedName: hint.proposedName,
    proposedNormalizedKey: hint.proposedNormalizedKey,
    extractionConfidence: hint.extractionConfidence,
    linkedConceptId: hint.linkedConceptId,
    linkedConceptName: hint.linkedConceptName,
    linkedConceptLanguages: hint.linkedConceptLanguages,
    isNewLanguageForExistingConcept: hint.isNewLanguageForExistingConcept,
  };
}

export function parseClassificationJsonToConceptHint(raw: unknown): ConceptHint | null {
  if (raw === null || raw === undefined) return null;
  let obj: unknown;
  if (typeof raw === 'string') {
    try { obj = JSON.parse(raw); } catch { return null; }
  } else {
    obj = raw;
  }
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return null;
  const r = obj as Record<string, unknown>;
  if (r.profileId !== 'coding') return null;
  if (!('proposedTypeNodeId' in r)) return null;
  const mapped = {
    proposedName: r.proposedName,
    proposedNormalizedKey: r.proposedNormalizedKey,
    proposedConceptType: r.proposedTypeNodeId,
    extractionConfidence: r.extractionConfidence,
    linkedConceptId: r.linkedConceptId ?? null,
    linkedConceptName: r.linkedConceptName ?? null,
    linkedConceptLanguages: r.linkedConceptLanguages ?? null,
    isNewLanguageForExistingConcept: r.isNewLanguageForExistingConcept ?? false,
  };
  try {
    return ConceptHintCodec.parse(mapped);
  } catch {
    return null;
  }
}

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

type LearningCaptureRow = Omit<typeof learningCaptures.$inferSelect, 'embeddingTier' | 'lastAccessedAt' | 'profileId' | 'classificationJson'> &
  Partial<Pick<typeof learningCaptures.$inferSelect, 'embeddingTier' | 'lastAccessedAt' | 'profileId' | 'classificationJson'>>;

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
    conceptHint: parseConceptHint(row.conceptHint) ?? parseClassificationJsonToConceptHint(row.classificationJson ?? null),
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
