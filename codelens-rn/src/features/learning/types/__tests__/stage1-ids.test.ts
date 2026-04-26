import { describe, expect, it } from 'vitest';
import {
  isConceptId,
  isLearningCaptureId,
  newConceptId,
  newLearningCaptureId,
  unsafeConceptId,
  unsafeLearningCaptureId,
} from '../ids';

describe('Stage 1 branded IDs', () => {
  it('generates locked capture and concept prefixes with nanoid length', () => {
    const captureId = newLearningCaptureId();
    const conceptId = newConceptId();

    expect(captureId).toMatch(/^lc_[A-Za-z0-9_-]{21}$/);
    expect(conceptId).toMatch(/^c_[A-Za-z0-9_-]{21}$/);
    expect(isLearningCaptureId(captureId)).toBe(true);
    expect(isConceptId(conceptId)).toBe(true);
  });

  it('throws loudly for malformed IDs at boundaries', () => {
    expect(() => unsafeLearningCaptureId('lc_short')).toThrow();
    expect(() => unsafeConceptId('concept_123')).toThrow();
  });
});
