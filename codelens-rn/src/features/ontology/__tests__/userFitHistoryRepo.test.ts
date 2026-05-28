import { describe, expect, it, vi } from 'vitest';
import type { DbOrTx } from '../../../db/client';
import type { ontologyCorrectionEvidence, profileProposalEvents } from '../data/schema';

const { mockDb } = vi.hoisted(() => ({
  mockDb: {},
}));

vi.mock('../../../db/client', () => ({
  db: mockDb,
}));

import {
  DEFAULT_USER_FIT_CORRECTION_EVIDENCE_LIMIT,
  DEFAULT_USER_FIT_PROPOSAL_EVENT_LIMIT,
  loadUserFitProjectionFacts,
} from '../data/userFitHistoryRepo';

type CorrectionRow = typeof ontologyCorrectionEvidence.$inferSelect;
type ProposalEventRow = typeof profileProposalEvents.$inferSelect;

interface SelectCall {
  orderByCount: number;
  limit: number;
}

function makeCorrectionRow(overrides: Partial<CorrectionRow> = {}): CorrectionRow {
  return {
    id: 'ev-1',
    profileId: 'coding',
    activeSelectionSnapshotJson: {
      baseProfileId: 'coding',
      projectBranchIds: ['react-project'],
    },
    subjectKind: 'capture',
    subjectId: 'capture-1',
    field: 'typeNodeId',
    previousTypeNodeId: 'star_trails',
    correctedTypeNodeId: 'long_exposure',
    rawProposedTypeNodeId: null,
    nearMissCandidatesJson: [
      {
        scopeId: 'base:coding|project:react-project|learning:-|personal:-',
        nodeId: 'long_exposure',
        rank: 2,
        score: 0.69,
      },
    ],
    reason: null,
    source: 'user',
    createdAt: 200,
    ...overrides,
  };
}

function makeProposalEventRow(overrides: Partial<ProposalEventRow> = {}): ProposalEventRow {
  return {
    id: 'event-1',
    proposalId: 'proposal-1',
    action: 'applied',
    actorKind: 'user',
    actorId: null,
    baseProfileId: 'coding',
    proposalKind: 'classification_patch',
    targetKind: 'profile_branch',
    targetProfileId: null,
    targetBranchId: 'react-project',
    statusBefore: 'pending',
    statusAfter: 'accepted',
    proposalUpdatedAtBefore: 100,
    proposalUpdatedAtAfter: 200,
    branchUpdatedAtBefore: null,
    branchUpdatedAtAfter: null,
    reason: null,
    detailsJson: null,
    createdAt: 210,
    ...overrides,
  };
}

function makeExecutor(
  correctionRows: CorrectionRow[],
  proposalRows: ProposalEventRow[],
  calls: SelectCall[],
): DbOrTx {
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: (...orderByColumns: unknown[]) => ({
            limit: (limit: number) => {
              const callIndex = calls.length;
              calls.push({
                orderByCount: orderByColumns.length,
                limit,
              });
              return Promise.resolve(callIndex === 0 ? correctionRows : proposalRows);
            },
          }),
        }),
      }),
    }),
  } as unknown as DbOrTx;
}

describe('loadUserFitProjectionFacts', () => {
  it('loads bounded recent correction and proposal facts without projecting them', async () => {
    const calls: SelectCall[] = [];
    const executor = makeExecutor(
      [makeCorrectionRow()],
      [makeProposalEventRow()],
      calls,
    );

    const facts = await loadUserFitProjectionFacts({ baseProfileId: 'coding' }, executor);

    expect(calls).toEqual([
      {
        orderByCount: 2,
        limit: DEFAULT_USER_FIT_CORRECTION_EVIDENCE_LIMIT,
      },
      {
        orderByCount: 2,
        limit: DEFAULT_USER_FIT_PROPOSAL_EVENT_LIMIT,
      },
    ]);
    expect(facts.correctionEvidence).toEqual([
      expect.objectContaining({
        id: 'ev-1',
        profileId: 'coding',
        correctedTypeNodeId: 'long_exposure',
        nearMissCandidates: [
          {
            scopeId: 'base:coding|project:react-project|learning:-|personal:-',
            nodeId: 'long_exposure',
            rank: 2,
            score: 0.69,
          },
        ],
      }),
    ]);
    expect(facts.proposalEvents).toEqual([
      expect.objectContaining({
        id: 'event-1',
        baseProfileId: 'coding',
        action: 'applied',
        target: expect.objectContaining({
          kind: 'profile_branch',
          branchId: 'react-project',
        }),
      }),
    ]);
  });

  it('normalizes caller limits before applying them to the DB queries', async () => {
    const calls: SelectCall[] = [];
    const executor = makeExecutor([], [], calls);

    await loadUserFitProjectionFacts({
      baseProfileId: 'coding',
      correctionEvidenceLimit: 2.9,
      proposalEventLimit: -1,
    }, executor);

    expect(calls.map((call) => call.limit)).toEqual([2, 0]);
  });
});
