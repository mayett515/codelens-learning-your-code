import { z } from 'zod';
import { CaptureStateEnum, EmbeddingStatusEnum } from '../../codecs/capture';
import { ConceptTypeEnum, LanguageOrRuntimeCodec, RepresentativeCaptureIdsCodec, SurfaceFeaturesCodec } from '../../codecs/concept';
import { isConceptId, isLearningCaptureId } from '../../types/ids';
import type { RetrievedCapturePayload, RetrievedConceptPayload } from '../types/retrieval';

const LearningCaptureIdCodec = z.string().refine(isLearningCaptureId);
const ConceptIdCodec = z.string().refine(isConceptId);

export const RetrievedCapturePayloadCodec = z.object({
  id: LearningCaptureIdCodec,
  title: z.string(),
  whatClicked: z.string(),
  whyItMattered: z.string().nullable(),
  rawSnippet: z.string(),
  snippetLang: z.string().nullable(),
  snippetSourcePath: z.string().nullable(),
  snippetStartLine: z.number().int().positive().nullable(),
  snippetEndLine: z.number().int().positive().nullable(),
  state: CaptureStateEnum,
  linkedConceptId: ConceptIdCodec.nullable(),
  linkedConceptName: z.string().nullable(),
  sessionId: z.string().nullable(),
  createdAt: z.number().int(),
  lastAccessedAt: z.number().int().nullable(),
  embeddingStatus: EmbeddingStatusEnum,
});

export const RetrievedConceptPayloadCodec = z.object({
  id: ConceptIdCodec,
  name: z.string(),
  conceptType: ConceptTypeEnum,
  canonicalSummary: z.string().nullable(),
  coreConcept: z.string().nullable(),
  languageOrRuntime: LanguageOrRuntimeCodec,
  surfaceFeatures: SurfaceFeaturesCodec,
  familiarityScore: z.number().min(0).max(1),
  importanceScore: z.number().min(0).max(1),
  strength: z.number().min(0).max(1),
  representativeCaptureIds: RepresentativeCaptureIdsCodec,
  createdAt: z.number().int(),
  lastAccessedAt: z.number().int().nullable(),
});

export function parseRetrievedCapturePayload(input: unknown): RetrievedCapturePayload {
  return RetrievedCapturePayloadCodec.parse(input) as RetrievedCapturePayload;
}

export function parseRetrievedConceptPayload(input: unknown): RetrievedConceptPayload {
  return RetrievedConceptPayloadCodec.parse(input) as RetrievedConceptPayload;
}
