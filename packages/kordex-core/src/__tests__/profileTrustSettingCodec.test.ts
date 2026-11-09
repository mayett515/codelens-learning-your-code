import { describe, expect, it } from 'vitest';
import { makeSuggestFirstProfileTrustSetting, parseAutoApplyProposalKinds, profileTrustSettingScopeKey, validateProfileTrustSetting } from '../codecs/profileTrustSetting';
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

  it('builds default suggest-first settings for a target', () => {
    expect(makeSuggestFirstProfileTrustSetting({
      id: 'trust-1',
      baseProfileId: 'coding',
      target: { kind: 'base_profile', profileId: 'coding' },
      now: 10,
    })).toEqual({
      id: 'trust-1',
      baseProfileId: 'coding',
      target: { kind: 'base_profile', profileId: 'coding' },
      trustMode: 'suggest_first',
      autoApplyEnabled: false,
      maxAutoApplyRiskScore: 0,
      autoApplyProposalKinds: [],
      createdAt: 10,
      updatedAt: 10,
    });
  });

  it('computes stable scope keys from base profile and target', () => {
    expect(profileTrustSettingScopeKey({
      baseProfileId: 'coding',
      target: { kind: 'base_profile', profileId: 'coding' },
    })).toBe('base_profile:coding');
    expect(profileTrustSettingScopeKey({
      baseProfileId: 'coding',
      target: { kind: 'profile_branch', branchId: 'react' },
    })).toBe('profile_branch:coding:react');
  });

  it('rejects auto-apply on base profile targets', () => {
    expect(() => validateProfileTrustSetting(baseSetting({
      trustMode: 'adaptive',
      autoApplyEnabled: true,
      maxAutoApplyRiskScore: 25,
      autoApplyProposalKinds: ['classification_patch'],
    }))).toThrow(/Base-profile trust settings must not enable auto-apply/);
  });

  it('rejects auto-apply in manual or suggest-first modes', () => {
    expect(() => validateProfileTrustSetting(branchAutoSetting({
      trustMode: 'suggest_first',
    }))).toThrow(/Only trusted_low_risk_auto or adaptive trust modes can enable auto-apply/);
  });

  it('rejects high-risk thresholds for trusted low-risk mode', () => {
    expect(() => validateProfileTrustSetting(branchAutoSetting({
      maxAutoApplyRiskScore: 35,
    }))).toThrow(/trusted_low_risk_auto cannot exceed risk score 25/);
  });

  it('rejects branch merge and manual draft proposal kinds for auto-apply', () => {
    expect(() => validateProfileTrustSetting(branchAutoSetting({
      autoApplyProposalKinds: ['branch_merge'],
    }))).toThrow(/Only classification, ontology-node, and relationship proposals can be auto-applied/);
  });

  it('parses auto-apply proposal kinds JSON from backup rows', () => {
    expect(parseAutoApplyProposalKinds('["classification_patch"]')).toEqual(['classification_patch']);
  });
});
