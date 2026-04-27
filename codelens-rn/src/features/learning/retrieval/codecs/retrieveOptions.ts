import { z } from 'zod';
import { CaptureStateEnum } from '../../codecs/capture';
import { ConceptTypeEnum } from '../../codecs/concept';
import { isConceptId, isLearningCaptureId } from '../../types/ids';
import type { RetrieveOptions } from '../types/retrieval';

const RetrievedMemoryKindEnum = z.enum(['capture', 'concept']);
const MemoryIdCodec = z.string().refine((value) => isLearningCaptureId(value) || isConceptId(value));
const LearningCaptureIdCodec = z.string().refine(isLearningCaptureId);

export const RetrieveOptionsCodec = z.object({
  query: z.string(),
  limit: z.number().int().positive().max(50).optional(),
  filters: z.object({
    states: z.array(CaptureStateEnum).optional(),
    conceptTypes: z.array(ConceptTypeEnum).optional(),
    sessionIds: z.array(z.string()).optional(),
    languages: z.array(z.string()).optional(),
    minCreatedAt: z.number().int().optional(),
    maxCreatedAt: z.number().int().optional(),
    excludeIds: z.array(MemoryIdCodec).optional(),
    derivedChainRoot: LearningCaptureIdCodec.nullable().optional(),
    kinds: z.array(RetrievedMemoryKindEnum).optional(),
  }).optional(),
  tokenBudget: z.number().int().positive().optional(),
  vecK: z.number().int().positive().max(200).optional(),
  ftsK: z.number().int().positive().max(200).optional(),
  enableJitRehydration: z.boolean().optional(),
  bumpLastAccessed: z.boolean().optional(),
});

export function parseRetrieveOptions(input: RetrieveOptions): RetrieveOptions {
  return RetrieveOptionsCodec.parse(input) as RetrieveOptions;
}
