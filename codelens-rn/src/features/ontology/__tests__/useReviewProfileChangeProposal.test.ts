import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../db/client', () => ({
  db: {},
}));

import { supersedeProfileChangeProposal } from '../hooks/useReviewProfileChangeProposal';

describe('supersedeProfileChangeProposal', () => {
  it('calls the lifecycle service with user actor metadata and current time', async () => {
    const result = { id: 'proposal-1', status: 'superseded' };
    const supersede = vi.fn(async () => result as never);

    await expect(supersedeProfileChangeProposal({
      proposalId: 'proposal-1',
      supersededByProposalId: 'proposal-2',
      reason: 'Edited into a narrower proposal.',
    }, {
      now: () => 42,
      supersede,
    })).resolves.toBe(result);

    expect(supersede).toHaveBeenCalledWith({
      proposalId: 'proposal-1',
      supersededByProposalId: 'proposal-2',
      now: 42,
      actorKind: 'user',
      reason: 'Edited into a narrower proposal.',
    });
  });
});
