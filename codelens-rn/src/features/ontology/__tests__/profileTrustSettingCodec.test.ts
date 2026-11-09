import { describe, expect, it } from 'vitest';
import { profileTrustSettingToRow, rowToProfileTrustSetting } from '../codecs/profileTrustSetting';
import type { ProfileTrustSetting } from '../types';

function baseSetting(overrides: Partial<ProfileTrustSetting> = {}): ProfileTrustSetting {
  return {
    id: 'trust-1',
    baseProfileId: 'coding',
    target: { kind: 'base_profile', profileId: 'coding', branchId: null },
    trustMode: 'suggest_first',
    autoApplyEnabled: false,
    maxAutoApplyRiskScore: 0,
    autoApplyProposalKinds: [],
    createdAt: 1,
    updatedAt: 2,
    ...overrides,
  };
}

function branchAutoSetting(overrides: Partial<ProfileTrustSetting> = {}): ProfileTrustSetting {
  return {
    id: 'trust-2',
    baseProfileId: 'coding',
    target: { kind: 'profile_branch', branchId: 'personal-1', profileId: null },
    trustMode: 'trusted_low_risk_auto',
    autoApplyEnabled: true,
    maxAutoApplyRiskScore: 25,
    autoApplyProposalKinds: ['classification_patch', 'relationship_patch'],
    createdAt: 1,
    updatedAt: 2,
    ...overrides,
  };
}

describe('profile trust setting codec', () => {
  it('maps a suggest-first base profile setting to a DB row', () => {
    expect(profileTrustSettingToRow(baseSetting())).toEqual({
      id: 'trust-1',
      scopeKey: 'base_profile:coding',
      baseProfileId: 'coding',
      targetKind: 'base_profile',
      targetProfileId: 'coding',
      targetBranchId: null,
      trustMode: 'suggest_first',
      autoApplyEnabled: false,
      maxAutoApplyRiskScore: 0,
      autoApplyProposalKindsJson: [],
      createdAt: 1,
      updatedAt: 2,
    });
  });

  it('round-trips a trusted branch-local setting from a DB row', () => {
    const setting = rowToProfileTrustSetting({
      id: 'trust-2',
      scopeKey: 'profile_branch:coding:personal-1',
      baseProfileId: 'coding',
      targetKind: 'profile_branch',
      targetProfileId: null,
      targetBranchId: 'personal-1',
      trustMode: 'trusted_low_risk_auto',
      autoApplyEnabled: true,
      maxAutoApplyRiskScore: 25,
      autoApplyProposalKindsJson: JSON.stringify(['classification_patch', 'relationship_patch']),
      createdAt: 1,
      updatedAt: 2,
    } as unknown as Parameters<typeof rowToProfileTrustSetting>[0]);

    expect(setting).toEqual(branchAutoSetting());
  });
});
