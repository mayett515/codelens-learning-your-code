import { enqueue } from '../../../ai/queue';
import {
  ManualCheckerRunServiceError,
  runManualOntologyChecker,
  type CheckerModelInvocation,
  type RunManualOntologyCheckerResult,
} from '../data/checkerRunService';

export type ManualCheckerComplete = (
  prompt: string,
  input: string,
  signal?: AbortSignal | undefined,
) => Promise<string>;

type RunManualOntologyCheckerService = (
  input: Parameters<typeof runManualOntologyChecker>[0],
) => ReturnType<typeof runManualOntologyChecker>;

interface RunManualOntologyCheckerForReviewDeps {
  now?: (() => number) | undefined;
  complete?: ManualCheckerComplete | undefined;
  runChecker?: RunManualOntologyCheckerService | undefined;
}

export interface RunManualOntologyCheckerForReviewInput {
  baseProfileId: string;
  targetBranchId?: string | null | undefined;
  signal?: AbortSignal | undefined;
}

const defaultComplete: ManualCheckerComplete = async (prompt, input, signal) =>
  enqueue(
    'learning',
    [
      { role: 'system', content: prompt },
      { role: 'user', content: input },
    ],
    signal,
  );

export async function completeManualCheckerPrompt(
  invocation: CheckerModelInvocation,
  options: {
    complete?: ManualCheckerComplete | undefined;
    signal?: AbortSignal | undefined;
  } = {},
): Promise<unknown> {
  const complete = options.complete ?? defaultComplete;
  const raw = await complete(
    invocation.prompt.instructionShell,
    buildCheckerPromptInput(invocation.prompt.dataPayloadJson),
    options.signal,
  );
  return parseCheckerJson(raw);
}

export async function runManualOntologyCheckerForReview(
  input: RunManualOntologyCheckerForReviewInput,
  deps: RunManualOntologyCheckerForReviewDeps = {},
): Promise<RunManualOntologyCheckerResult> {
  const runChecker = deps.runChecker ?? runManualOntologyChecker;
  return runChecker({
    baseProfileId: input.baseProfileId,
    targetBranchId: input.targetBranchId ?? null,
    now: deps.now?.() ?? Date.now(),
    deps: {
      runCheckerModel: (invocation) =>
        completeManualCheckerPrompt(invocation, {
          complete: deps.complete,
          signal: input.signal,
        }),
    },
  });
}

function buildCheckerPromptInput(dataPayloadJson: string): string {
  return [
    'KORDEX_CHECKER_CONTEXT_PAYLOAD_JSON:',
    dataPayloadJson,
  ].join('\n\n');
}

function parseCheckerJson(raw: string): unknown {
  try {
    return JSON.parse(raw.trim());
  } catch (error) {
    throw new ManualCheckerRunServiceError(
      'checker_output_invalid',
      'Checker model returned invalid JSON.',
      error,
    );
  }
}
