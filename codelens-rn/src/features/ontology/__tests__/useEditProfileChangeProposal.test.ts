import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../db/client', () => ({
  db: {},
}));

import { editProfileChangeProposal } from '../hooks/useEditProfileChangeProposal';

describe('editProfileChangeProposal', () => {
  it('calls the edit service with user actor metadata and current time', async () => {
    const result = {
      proposal: { id: 'proposal-2', status: 'pending' },
      supersededProposal: { id: 'proposal-1', status: 'superseded' },
    };
    const edit = vi.fn(async () => result as never);
    const draft = {
      patch: {
        addItemTypeNodeIds: ['exposure_planning'],
      },
      reason: 'User narrowed the draft.',
    };

    await expect(editProfileChangeProposal({
      proposalId: 'proposal-1',
      draft,
      supersedeReason: 'Edited from the proposal review surface.',
    }, {
      now: () => 42,
      edit,
    })).resolves.toBe(result);

    expect(edit).toHaveBeenCalledWith({
      proposalId: 'proposal-1',
      draft,
      now: 42,
      actorKind: 'user',
      supersedeReason: 'Edited from the proposal review surface.',
    });
  });

  it('propagates edit service errors without converting them to success', async () => {
    const error = new Error('edit failed');
    const edit = vi.fn(async () => {
      throw error;
    });

    await expect(editProfileChangeProposal({
      proposalId: 'proposal-1',
      draft: {
        patch: {
          addItemTypeNodeIds: ['exposure_planning'],
        },
      },
    }, {
      now: () => 42,
      edit,
    })).rejects.toBe(error);
  });
});
