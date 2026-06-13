import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../db/client', () => ({
  db: {},
}));

vi.mock('../../../ai/queue', () => ({
  enqueue: vi.fn(),
}));

import {
  ManualCheckerRunServiceError,
  type CheckerModelInvocation,
  type RunManualOntologyCheckerInput,
  type RunManualOntologyCheckerResult,
} from '../data/checkerRunService';
import {
  completeManualCheckerPrompt,
  runManualOntologyCheckerForReview,
} from '../hooks/manualCheckerReviewAdapter';

function makeInvocation(): CheckerModelInvocation {
  return {
    prompt: {
      instructionShell: 'checker instructions',
      dataPayloadJson: '{"pack":true}',
    },
    pack: {},
  } as unknown as CheckerModelInvocation;
}

function makeResult(): RunManualOntologyCheckerResult {
  return {
    pack: null,
    validation: null,
    prompt: null,
    output: null,
    proposals: [],
    explanation: {
      summary: 'Checker finished.',
      relationshipOrBoundaryObservations: [],
      skippedFindings: [],
    },
    selectionTrace: [],
  };
}

describe('manual checker review hook helpers', () => {
  it('passes the checker prompt through the completion port with AbortSignal support and parses JSON', async () => {
    const signal = new AbortController().signal;
    const complete = vi.fn(async () => '{"schemaVersion":"checker-output-v1","findings":[]}');

    await expect(completeManualCheckerPrompt(makeInvocation(), {
      complete,
      signal,
    })).resolves.toEqual({
      schemaVersion: 'checker-output-v1',
      findings: [],
    });

    expect(complete).toHaveBeenCalledWith(
      'checker instructions',
      'KORDEX_CHECKER_CONTEXT_PAYLOAD_JSON:\n\n{"pack":true}',
      signal,
    );
  });

  it('turns invalid JSON into the checker-output service error instead of returning partial prose', async () => {
    const error = await captureRejection(completeManualCheckerPrompt(makeInvocation(), {
      complete: vi.fn(async () => 'not json'),
    }));

    expect(error).toBeInstanceOf(ManualCheckerRunServiceError);
    expect((error as ManualCheckerRunServiceError).code).toBe('checker_output_invalid');
  });

  it('injects the model adapter into the manual checker service with current time and target branch', async () => {
    const signal = new AbortController().signal;
    const complete = vi.fn(async () => '{"ok":true}');
    const runChecker = vi.fn(async (input: RunManualOntologyCheckerInput) => {
      const raw = await input.deps?.runCheckerModel?.(makeInvocation());
      expect(raw).toEqual({ ok: true });
      return makeResult();
    });

    await expect(runManualOntologyCheckerForReview({
      baseProfileId: 'coding',
      targetBranchId: 'react-project',
      signal,
    }, {
      now: () => 42,
      complete,
      runChecker,
    })).resolves.toMatchObject({
      explanation: { summary: 'Checker finished.' },
    });

    expect(runChecker).toHaveBeenCalledWith(expect.objectContaining({
      baseProfileId: 'coding',
      targetBranchId: 'react-project',
      now: 42,
    }));
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('does not add a checker-level retry loop around failed completions', async () => {
    const completionError = new Error('completion failed');
    const complete = vi.fn(async () => {
      throw completionError;
    });
    const runChecker = vi.fn(async (input: RunManualOntologyCheckerInput) => {
      await input.deps?.runCheckerModel?.(makeInvocation());
      return makeResult();
    });

    await expect(runManualOntologyCheckerForReview({
      baseProfileId: 'coding',
      targetBranchId: 'react-project',
    }, {
      complete,
      runChecker,
    })).rejects.toBe(completionError);

    expect(complete).toHaveBeenCalledTimes(1);
  });
});

async function captureRejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('Expected promise to reject');
}
