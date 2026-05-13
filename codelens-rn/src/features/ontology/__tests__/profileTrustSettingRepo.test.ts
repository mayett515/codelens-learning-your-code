import { describe, expect, it, vi } from 'vitest';
import type { DbOrTx } from '../../../db/client';

const { mockDb } = vi.hoisted(() => ({
  mockDb: {},
}));

vi.mock('../../../db/client', () => ({
  db: mockDb,
}));

import { upsertProfileTrustSetting } from '../data/profileTrustSettingRepo';
import type { ProfileTrustSetting } from '../types';

function branchTrustSetting(overrides: Partial<ProfileTrustSetting> = {}): ProfileTrustSetting {
  return {
    id: 'trust-new',
    baseProfileId: 'coding',
    target: { kind: 'profile_branch', branchId: 'react-branch', profileId: null },
    trustMode: 'trusted_low_risk_auto',
    autoApplyEnabled: true,
    maxAutoApplyRiskScore: 25,
    autoApplyProposalKinds: ['classification_patch'],
    createdAt: 10,
    updatedAt: 20,
    ...overrides,
  };
}

describe('profile trust setting repo', () => {
  it('preserves existing id and createdAt when upserting by scope key', async () => {
    let conflictConfig: { set?: Record<string, unknown> } | undefined;

    const executor = {
      insert: () => ({
        values: () => ({
          onConflictDoUpdate: (config: { set?: Record<string, unknown> }) => {
            conflictConfig = config;
            return Promise.resolve();
          },
        }),
      }),
    } as unknown as DbOrTx;

    await upsertProfileTrustSetting(branchTrustSetting(), executor);

    expect(conflictConfig?.set).toMatchObject({
      baseProfileId: 'coding',
      targetKind: 'profile_branch',
      targetProfileId: null,
      targetBranchId: 'react-branch',
      trustMode: 'trusted_low_risk_auto',
      autoApplyEnabled: true,
      maxAutoApplyRiskScore: 25,
      autoApplyProposalKindsJson: ['classification_patch'],
      updatedAt: 20,
    });
    expect(conflictConfig?.set).not.toHaveProperty('id');
    expect(conflictConfig?.set).not.toHaveProperty('createdAt');
  });
});
