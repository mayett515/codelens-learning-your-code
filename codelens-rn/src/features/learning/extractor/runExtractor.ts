import { enqueue } from '../../../ai/queue';
import { ExtractorOutputSchema, type ExtractorOutput } from './extractorSchema';

export class ExtractionFailedError extends Error {
  constructor(message = 'Extractor returned invalid output after 2 attempts') {
    super(message);
    this.name = 'ExtractionFailedError';
  }
}

export type ExtractorComplete = (prompt: string, input: string, signal?: AbortSignal) => Promise<string>;

const RETRY_INSTRUCTION = [
  '',
  'Your previous response was not valid JSON matching the required schema.',
  'Output valid JSON only.',
  'Do not include markdown fences.',
  'Do not include prose.',
].join('\n');

function parseJson(raw: string): unknown {
  return JSON.parse(raw.trim());
}

const defaultComplete: ExtractorComplete = async (prompt, input, signal) =>
  enqueue(
    'learning',
    [
      { role: 'system', content: prompt },
      { role: 'user', content: input },
    ],
    signal,
  );

export async function runExtractor(
  prompt: string,
  input: string,
  options?: {
    signal?: AbortSignal | undefined;
    complete?: ExtractorComplete | undefined;
  },
): Promise<ExtractorOutput> {
  let currentInput = input;
  const complete = options?.complete ?? defaultComplete;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await complete(prompt, currentInput, options?.signal);

    try {
      return ExtractorOutputSchema.parse(parseJson(raw));
    } catch (error) {
      lastError = error;
      if (attempt === 0) {
        currentInput += RETRY_INSTRUCTION;
        continue;
      }
    }
  }

  const reason = lastError instanceof Error ? `: ${lastError.message}` : '';
  throw new ExtractionFailedError(`Extractor returned invalid output after 2 attempts${reason}`);
}
