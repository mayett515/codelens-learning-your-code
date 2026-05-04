import { describe, expect, it } from 'vitest';
import { codingProfile } from '../../../ontology';
import {
  buildExtractorSystemPrompt,
  buildOntologyClassificationGuide,
} from '../extractorPrompt';

describe('extractor prompt profile seam', () => {
  it('renders active profile ontology descriptions into the classification guide', () => {
    const guide = buildOntologyClassificationGuide(codingProfile);

    expect(guide).toContain('mechanism: Mechanism');
    expect(guide).toContain('A cause-and-effect explanation');
    expect(guide).toContain('failure_mode: Failure Mode');
    expect(guide).toContain('Examples:');
  });

  it('builds the extractor prompt from profile labels and relevant concepts', () => {
    const prompt = buildExtractorSystemPrompt({
      profile: codingProfile,
      relevantConcepts: [],
    });

    expect(prompt).toContain(codingProfile.labels.bodyFieldLabel);
    expect(prompt).toContain(codingProfile.labels.contextFieldLabel);
    expect(prompt).toContain(codingProfile.labels.sourceFieldLabel);
    expect(prompt).toContain('mechanism: Mechanism');
    expect(prompt).not.toContain('mechanism / mental_model / pattern');
  });
});
