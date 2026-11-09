import { describe, expect, it } from 'vitest';
import { profileProposalEventToRow, rowToProfileProposalEvent } from '../codecs/profileProposalEvent';
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
  it('validates and maps an applied branch-local event to a DB row', () => {
    expect(profileProposalEventToRow(validEvent())).toEqual({
      id: 'event-1',
      proposalId: 'proposal-1',
      action: 'applied',
      actorKind: 'user',
      actorId: null,
      baseProfileId: 'coding',
      proposalKind: 'ontology_node_patch',
      targetKind: 'profile_branch',
      targetProfileId: null,
      targetBranchId: 'branch-1',
      statusBefore: 'pending',
      statusAfter: 'accepted',
      proposalUpdatedAtBefore: 2,
      proposalUpdatedAtAfter: 3,
      branchUpdatedAtBefore: 2,
      branchUpdatedAtAfter: 3,
      reason: null,
      detailsJson: {
        operationKind: 'apply_profile_patch_to_branch_overlay',
      },
      createdAt: 3,
    });
  });

  it('parses JSON-backed row fields into the domain event shape', () => {
    const event = rowToProfileProposalEvent({
      id: 'event-1',
      proposalId: 'proposal-1',
      action: 'applied',
      actorKind: 'user',
      actorId: null,
      baseProfileId: 'coding',
      proposalKind: 'ontology_node_patch',
      targetKind: 'profile_branch',
      targetProfileId: null,
      targetBranchId: 'branch-1',
      statusBefore: 'pending',
      statusAfter: 'accepted',
      proposalUpdatedAtBefore: 2,
      proposalUpdatedAtAfter: 3,
      branchUpdatedAtBefore: 2,
      branchUpdatedAtAfter: 3,
      reason: null,
      detailsJson: '{"operationKind":"apply_profile_patch_to_branch_overlay"}',
      createdAt: 3,
    } as unknown as Parameters<typeof rowToProfileProposalEvent>[0]);

    expect(event).toEqual({
      ...validEvent(),
      target: {
        kind: 'profile_branch',
        profileId: null,
        branchId: 'branch-1',
      },
    });
  });

  it('allows superseded events with replacement details', () => {
    const row = profileProposalEventToRow(validEvent({
      action: 'superseded',
      statusBefore: 'pending',
      statusAfter: 'superseded',
      branchUpdatedAtBefore: null,
      branchUpdatedAtAfter: null,
      details: {
        supersededByProposalId: 'proposal-2',
      },
    }));

    expect(row.action).toBe('superseded');
    expect(row.statusAfter).toBe('superseded');
    expect(row.detailsJson).toEqual({
      supersededByProposalId: 'proposal-2',
    });
  });
});
