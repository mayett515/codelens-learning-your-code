import type { LearningConcept } from '../types/learning';

export const BASE_APP_SYSTEM_PROMPT = `You are the AI assistant inside CodeLens - a mobile app for learning code by reading real repositories on your phone.
The user is in the middle of reading code and has selected a passage they want to remember.
Your job is to capture what just clicked for them.
Keep answers structured. Follow the output format exactly.`;

export const EXTRACTOR_INSTRUCTIONS = `The user selected the following code or text while reading a repository.
Your job: extract 1 to 3 distinct capture candidates from this selection.

A capture = one moment of understanding. One thing that clicked.
Do not generate multiple captures for the same insight with different wording.
Only generate multiple captures if the selection genuinely contains multiple distinct insights.

For each capture, extract:
- title: short label (5-10 words)
- whatClicked: the insight in the user's own language - what they understood
- whyItMattered: why this is useful or important (null if not clear from the text)
- rawSnippet: the most relevant fragment quoted directly - never paraphrase
- conceptHint: the concept this maps to (reasoning stays internal - see rules below)

Internal concept_type reasoning (NEVER shown in UI - classification is for system use only):
  Ask yourself:
  - What kind of understanding is this?
    mechanism / mental_model / pattern / architecture_principle / language_feature /
    api_idiom / data_structure / algorithmic_idea / performance_principle /
    debugging_heuristic / failure_mode / testing_principle
  - What is the abstract coding idea at the core, independent of language?
  - Does this match one of the existing concepts provided?
    If yes: set linkedConceptId.
    If this is a new language/runtime/framework for the existing concept: set isNewLanguageForExistingConcept = true.
    If no match: set linkedConceptId = null.
  - Concept name must never include language suffix. "Closure" not "Closure (JS)".
  - Pick exactly ONE concept_type. No compound types.

Output valid JSON only. No prose before or after the JSON.`;

export interface RelevantConcept {
  concept: LearningConcept;
  similarity: number;
}

export function buildConceptContext(concepts: RelevantConcept[]): string {
  if (concepts.length === 0) return '';

  const list = concepts
    .map(({ concept, similarity }) =>
      [
        `id: ${concept.id}`,
        `name: ${concept.name}`,
        `core: ${concept.coreConcept ?? '-'}`,
        `type: ${concept.conceptType}`,
        `languages: ${concept.languageOrRuntime.join(', ') || 'none yet'}`,
        `similarity: ${similarity.toFixed(3)}`,
      ].join(' | '),
    )
    .join('\n');

  return [
    'Existing concepts the user has already saved that may be related:',
    list,
    'If this capture is a new encounter of one of these, use its id as linkedConceptId.',
    'Do not create language-suffixed concept names.',
  ].join('\n');
}

export function buildExtractorSystemPrompt(concepts: RelevantConcept[]): string {
  return [BASE_APP_SYSTEM_PROMPT, EXTRACTOR_INSTRUCTIONS, buildConceptContext(concepts)]
    .filter(Boolean)
    .join('\n\n---\n\n');
}
