import { z } from 'zod';
import { enqueue } from '../../../ai/queue';

const ConceptTaxonomySchema = z.object({
  domain: z.string().optional(),
  subdomain: z.string().optional(),
  pattern: z.string().optional(),
  language: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

const ExtractedConceptSchema = z.object({
  name: z.string(),
  summary: z.string(),
  taxonomy: ConceptTaxonomySchema,
});

const ExtractionResultSchema = z.object({
  title: z.string(),
  concepts: z.array(ExtractedConceptSchema).min(1),
});

export type ExtractedConcept = z.infer<typeof ExtractedConceptSchema>;
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

const EXTRACTION_SYSTEM = `You extract programming concepts from code and chat snippets. Respond ONLY with valid JSON — no markdown, no explanation.

Schema:
{
  "title": "short descriptive title for this learning session",
  "concepts": [
    {
      "name": "Concept Name",
      "summary": "1-2 sentence explanation of what this concept is and why it matters",
      "taxonomy": {
        "domain": "broad area, e.g. 'Web Development', 'Systems Programming'",
        "subdomain": "narrower area, e.g. 'React Hooks', 'Memory Management'",
        "pattern": "design pattern if applicable, e.g. 'Observer', 'Factory'",
        "language": "programming language if specific, e.g. 'TypeScript', 'Rust'",
        "tags": ["tag1", "tag2"]
      }
    }
  ]
}

Rules:
- Extract 1-5 distinct, concrete, learnable concepts
- Each concept should be a single idea a developer can study and apply
- Summaries should be specific and technical, not vague
- Taxonomy fields are optional — only include what's clearly applicable
- Tags should be lowercase, specific terms`;

const MAX_PARSE_RETRIES = 2;

export async function extractConcepts(
  snippet: string,
  signal?: AbortSignal,
): Promise<ExtractionResult> {
  let lastError: Error | null = null;
  const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
    { role: 'system', content: EXTRACTION_SYSTEM },
    { role: 'user', content: snippet },
  ];

  for (let attempt = 0; attempt <= MAX_PARSE_RETRIES; attempt++) {
    const raw = await enqueue('learning', messages, signal);

    try {
      const cleaned = raw
        .replace(/^```(?:json)?\s*/m, '')
        .replace(/```\s*$/m, '')
        .trim();

      const parsed: unknown = JSON.parse(cleaned);
      return ExtractionResultSchema.parse(parsed);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));

      if (attempt < MAX_PARSE_RETRIES) {
        messages.push(
          { role: 'assistant', content: raw },
          {
            role: 'user',
            content: `Your response failed validation: ${lastError.message}\nPlease respond with corrected JSON only.`,
          },
        );
        continue;
      }
    }
  }

  throw lastError ?? new Error('Extraction failed');
}
