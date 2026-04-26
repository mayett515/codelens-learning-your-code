import { describe, expect, it, vi } from 'vitest';
import { ExtractorOutputSchema } from '../extractorSchema';
import { ExtractionFailedError, runExtractor } from '../runExtractor';

vi.mock('../../../../ai/queue', () => ({
  enqueue: vi.fn(),
}));

const validCandidate = {
  title: 'Closure keeps outer state',
  whatClicked: 'The returned function can still read the outer variable.',
  whyItMattered: 'It explains callbacks that remember setup state.',
  rawSnippet: 'const value = 1; return () => value;',
  conceptHint: {
    proposedName: 'Closure',
    proposedNormalizedKey: 'closure',
    proposedConceptType: 'mechanism',
    extractionConfidence: 0.9,
    linkedConceptId: null,
    linkedConceptName: null,
    linkedConceptLanguages: null,
    isNewLanguageForExistingConcept: false,
  },
};

describe('Stage 2 extractor schema', () => {
  it('accepts valid capture candidates', () => {
    expect(ExtractorOutputSchema.parse({ candidates: [validCandidate] }).candidates).toHaveLength(1);
  });

  it('rejects prose output before schema parsing', async () => {
    await expect(
      runExtractor('prompt', 'input', {
        complete: async () => 'Here is the JSON: {"candidates":[]}',
      }),
    ).rejects.toBeInstanceOf(ExtractionFailedError);
  });

  it('rejects more than 3 candidates', () => {
    expect(() =>
      ExtractorOutputSchema.parse({
        candidates: [validCandidate, validCandidate, validCandidate, validCandidate],
      }),
    ).toThrow();
  });

  it('rejects rawSnippet over 800 chars', () => {
    expect(() =>
      ExtractorOutputSchema.parse({
        candidates: [{ ...validCandidate, rawSnippet: 'x'.repeat(801) }],
      }),
    ).toThrow();
  });

  it('retries once after invalid JSON', async () => {
    let calls = 0;
    const result = await runExtractor('prompt', 'input', {
      complete: async () => {
        calls++;
        return calls === 1
          ? 'not json'
          : JSON.stringify({ candidates: [validCandidate] });
      },
    });

    expect(calls).toBe(2);
    expect(result.candidates[0].title).toBe(validCandidate.title);
  });

  it('throws after the second invalid response', async () => {
    let calls = 0;
    await expect(
      runExtractor('prompt', 'input', {
        complete: async () => {
          calls++;
          return '{ bad json';
        },
      }),
    ).rejects.toBeInstanceOf(ExtractionFailedError);
    expect(calls).toBe(2);
  });
});
