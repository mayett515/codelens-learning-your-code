import { getActiveDomainProfile, type DomainProfile, type OntologyNode } from '../../ontology';
import type { LearningConcept } from '../types/learning';

export const BASE_APP_SYSTEM_PROMPT = `${getActiveDomainProfile().extraction.assistantRole}
The user is in the middle of reading code and has selected a passage they want to remember.
Your job is to capture what just clicked for them.
Keep answers structured. Follow the output format exactly.`;

export const EXTRACTOR_INSTRUCTIONS = buildExtractorInstructions(getActiveDomainProfile());

export function buildExtractorInstructions(profile: DomainProfile): string {
  return `The user selected the following code or text while reading a repository.
Your job: extract 1 to 3 distinct capture candidates from this selection.

A capture = one moment of understanding. One thing that clicked.
Do not generate multiple captures for the same insight with different wording.
Only generate multiple captures if the selection genuinely contains multiple distinct insights.

For each capture, extract:
- title: short label (5-10 words)
- whatClicked: ${profile.labels.bodyFieldLabel} - the insight in the user's own language
- whyItMattered: ${profile.labels.contextFieldLabel} - why this is useful or important (null if not clear from the text)
- rawSnippet: ${profile.labels.sourceFieldLabel} - the most relevant fragment quoted directly - never paraphrase
- keywords: 2 to 6 short normalized keywords for clustering later. Use lowercase, no punctuation, no language-only tokens unless the language is the core idea.
- conceptHint: the concept this maps to (reasoning stays internal - see rules below)

Internal concept_type reasoning (NEVER shown in UI - classification is for system use only):
  Ask yourself:
  - What kind of understanding is this?
${buildOntologyClassificationGuide(profile)}
  - What is the abstract coding idea at the core, independent of language?
  - Does this match one of the existing concepts provided?
    If yes: set linkedConceptId.
    If this is a new language/runtime/framework for the existing concept: set isNewLanguageForExistingConcept = true.
    If no match: set linkedConceptId = null.
  - Concept name must never include language suffix. "Closure" not "Closure (JS)".
  - Pick exactly ONE concept_type. No compound types.

Output valid JSON only. No prose before or after the JSON.`;
}

export interface RelevantConcept {
  concept: LearningConcept;
  similarity: number;
}

export interface BuildExtractorSystemPromptInput {
  profile?: DomainProfile | undefined;
  relevantConcepts: RelevantConcept[];
}

export function buildOntologyClassificationGuide(profile: DomainProfile): string {
  const nodesById = new Map(profile.ontology.nodes.map((node) => [node.id, node]));
  return profile.ontology.itemTypeNodeIds
    .map((id) => {
      const node = nodesById.get(id);
      return node ? renderOntologyNodeForPrompt(node) : `    - ${id}`;
    })
    .join('\n');
}

function renderOntologyNodeForPrompt(node: OntologyNode): string {
  const lines = [
    `    - ${node.id}: ${node.label} - ${node.meaning}`,
    ...node.useWhen.map((rule) => `      Use when: ${rule}`),
    ...node.doNotUseWhen.map((rule) => {
      const suffix = rule.preferNodeId ? ` Prefer ${rule.preferNodeId}.` : '';
      return `      Do not use when: ${rule.text}${suffix}`;
    }),
  ];

  if (node.examples.length > 0) {
    lines.push(`      Examples: ${node.examples.join('; ')}`);
  }

  return lines.join('\n');
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

export function buildExtractorSystemPrompt(concepts: RelevantConcept[]): string;
export function buildExtractorSystemPrompt(input: BuildExtractorSystemPromptInput): string;
export function buildExtractorSystemPrompt(input: RelevantConcept[] | BuildExtractorSystemPromptInput): string {
  const profile = Array.isArray(input) ? getActiveDomainProfile() : input.profile ?? getActiveDomainProfile();
  const relevantConcepts = Array.isArray(input) ? input : input.relevantConcepts;
  return [BASE_APP_SYSTEM_PROMPT, buildExtractorInstructions(profile), buildConceptContext(relevantConcepts)]
    .filter(Boolean)
    .join('\n\n---\n\n');
}
