import { describe, expect, it } from 'vitest';
import { parseProfileProposalEventDetails, validateProfileProposalEvent } from '../codecs/profileProposalEvent';
import type { ProfileProposalEvent } from '../types';

function validEvent(overrides: Partial<ProfileProposalEvent> = {}): ProfileProposalEvent {
  return {
    id: 'event-1',
    proposalId: 'proposal-1',
    action: 'applied',
    actorKind: 'user',
    actorId: null,
    baseProfileId: 'coding',
    proposalKind: 'ontology_node_patch',
    target: {
      kind: 'profile_branch',
      branchId: 'branch-1',
    },
    statusBefore: 'pending',
    statusAfter: 'accepted',
    proposalUpdatedAtBefore: 2,
    proposalUpdatedAtAfter: 3,
    branchUpdatedAtBefore: 2,
    branchUpdatedAtAfter: 3,
    reason: null,
    details: {
      operationKind: 'apply_profile_patch_to_branch_overlay',
    },
    createdAt: 3,
    ...overrides,
  };
}

describe('profile proposal event codec', () => {

  it('allows asked-why events without a status transition', () => {
    expect(() => validateProfileProposalEvent(validEvent({
      action: 'asked_why',
      statusBefore: 'pending',
      statusAfter: 'pending',
      branchUpdatedAtBefore: null,
      branchUpdatedAtAfter: null,
      details: {
        question: 'Why not classify this as a React hook?',
      },
    }))).not.toThrow();
  });

  it('rejects decision events without a status transition', () => {
    expect(() => validateProfileProposalEvent(validEvent({
      statusBefore: 'pending',
      statusAfter: 'pending',
    }))).toThrow(/must record a status transition/);
  });

  it('rejects action/status mismatches', () => {
    expect(() => validateProfileProposalEvent(validEvent({
      action: 'rejected',
      statusAfter: 'accepted',
    }))).toThrow(/Rejected proposal events must transition to rejected status/);

    expect(() => validateProfileProposalEvent(validEvent({
      action: 'superseded',
      statusAfter: 'rejected',
    }))).toThrow(/Superseded proposal events must transition to superseded status/);
  });

  it('rejects target shapes that mix base-profile and branch targets', () => {
    expect(() => validateProfileProposalEvent(validEvent({
      target: {
        kind: 'base_profile',
        profileId: 'coding',
        branchId: 'branch-1',
      },
    }))).toThrow(/Base-profile proposal events require profileId/);
  });

  it('parses details JSON and rejects malformed details', () => {
    expect(parseProfileProposalEventDetails('{"reason":"user rejected"}')).toEqual({
      reason: 'user rejected',
    });
    expect(() => parseProfileProposalEventDetails('not json')).toThrow(/Invalid JSON in details_json/);
  });
});
