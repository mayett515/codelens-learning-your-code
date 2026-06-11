import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../db/client', () => ({
  db: {},
}));

import { refreshProfileChangeProposal } from '../hooks/useRefreshProfileChangeProposal';

describe('refreshProfileChangeProposal', () => {
  it('calls the refresh service with user actor metadata and current time', async () => {
    const result = {
      proposal: { id: 'proposal-2', status: 'pending' },
      supersededProposal: { id: 'proposal-1', status: 'superseded' },
    };
    const refresh = vi.fn(async () => result as never);

    await expect(refreshProfileChangeProposal({
      proposalId: 'proposal-1',
      reason: 'Target changed while reviewing.',
    }, {
      now: () => 42,
      refresh,
    })).resolves.toBe(result);

    expect(refresh).toHaveBeenCalledWith({
      proposalId: 'proposal-1',
      now: 42,
      actorKind: 'user',
      reason: 'Target changed while reviewing.',
    });
  });

  it('propagates refresh service errors without converting them to success', async () => {
    const error = new Error('refresh failed');
    const refresh = vi.fn(async () => {
      throw error;
    });

    await expect(refreshProfileChangeProposal({
      proposalId: 'proposal-1',
    }, {
      now: () => 42,
      refresh,
    })).rejects.toBe(error);
  });
});
