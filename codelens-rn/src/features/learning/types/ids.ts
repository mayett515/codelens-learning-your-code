import { nanoid } from 'nanoid';

export type LearningCaptureId = string & { readonly __brand: 'LearningCaptureId' };
export type ConceptId = string & { readonly __brand: 'ConceptId' };

const makeId = <T extends string>(prefix: string): T => `${prefix}_${nanoid(21)}` as T;

export const newLearningCaptureId = (): LearningCaptureId =>
  makeId<LearningCaptureId>('lc');

export const newConceptId = (): ConceptId =>
  makeId<ConceptId>('c');

export const isLearningCaptureId = (value: unknown): value is LearningCaptureId =>
  typeof value === 'string' && /^lc_[A-Za-z0-9_-]{21}$/.test(value);

export const isConceptId = (value: unknown): value is ConceptId =>
  typeof value === 'string' && /^c_[A-Za-z0-9_-]{21}$/.test(value);

export const unsafeLearningCaptureId = (value: string): LearningCaptureId => {
  if (!isLearningCaptureId(value)) {
    throw new Error(`Invalid LearningCaptureId: ${value}`);
  }
  return value;
};

export const unsafeConceptId = (value: string): ConceptId => {
  if (!isConceptId(value)) {
    throw new Error(`Invalid ConceptId: ${value}`);
  }
  return value;
};
