import { z } from 'zod';
import { ConceptTypeEnum } from '../codecs/concept';
import { isConceptId, type ConceptId } from '../types/ids';

export const CaptureHintSchema = z.object({
  proposedName: z.string().min(1),
  proposedNormalizedKey: z.string().min(1),
  proposedConceptType: ConceptTypeEnum,
  extractionConfidence: z.number().min(0).max(1),
  linkedConceptId: z.custom<ConceptId>(isConceptId).nullable(),
  linkedConceptName: z.string().nullable(),
  linkedConceptLanguages: z.array(z.string()).nullable(),
  isNewLanguageForExistingConcept: z.boolean(),
});

export const CaptureExtractorCandidateSchema = z.object({
  title: z.string().min(1).max(120),
  whatClicked: z.string().min(1).max(500),
  whyItMattered: z.string().max(700).nullable(),
  rawSnippet: z.string().min(1).max(800),
  keywords: z.array(z.string().min(1).max(40)).max(8).default([]),
  conceptHint: CaptureHintSchema.nullable(),
});

export const ExtractorOutputSchema = z.object({
  candidates: z.array(CaptureExtractorCandidateSchema).min(1).max(3),
});

export type CaptureHint = z.infer<typeof CaptureHintSchema>;
export type CaptureExtractorCandidate = z.infer<typeof CaptureExtractorCandidateSchema>;
export type ExtractorOutput = z.infer<typeof ExtractorOutputSchema>;
