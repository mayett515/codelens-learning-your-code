import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../db/client', () => ({
  db: {},
}));

import { switchProfileChangeProposalTarget } from '../hooks/useSwitchProfileChangeProposalTarget';

describe('switchProfileChangeProposalTarget', () => {
  it('calls the target-switch service with user actor metadata and current time', async () => {
    const result = {
      proposal: { id: 'proposal-2', status: 'pending' },
      supersededProposal: { id: 'proposal-1', status: 'superseded' },
    };
    const switchTarget = vi.fn(async () => result as never);

    await expect(switchProfileChangeProposalTarget({
      proposalId: 'proposal-1',
      reason: 'Move this branch proposal to core review.',
    }, {
      now: () => 42,
      switchTarget,
    })).resolves.toBe(result);

    expect(switchTarget).toHaveBeenCalledWith({
      proposalId: 'proposal-1',
      now: 42,
      actorKind: 'user',
      reason: 'Move this branch proposal to core review.',
    });
  });

  it('propagates target-switch service errors without converting them to success', async () => {
    const error = new Error('switch failed');
    const switchTarget = vi.fn(async () => {
      throw error;
    });

    await expect(switchProfileChangeProposalTarget({
      proposalId: 'proposal-1',
    }, {
      now: () => 42,
      switchTarget,
    })).rejects.toBe(error);
  });
});
