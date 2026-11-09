import type { profileTrustSettings } from '../data/schema';
import type { ProfileTrustSetting } from '../types';
import { parseAutoApplyProposalKinds, profileTrustSettingScopeKey, validateProfileTrustSetting } from '@kordex/core/codecs/profileTrustSetting';

export * from '@kordex/core/codecs/profileTrustSetting';


export function rowToProfileTrustSetting(
  row: typeof profileTrustSettings.$inferSelect,
): ProfileTrustSetting {
  return validateProfileTrustSetting({
    id: row.id,
    baseProfileId: row.baseProfileId,
    target: {
      kind: row.targetKind,
      profileId: row.targetProfileId,
      branchId: row.targetBranchId,
    },
    trustMode: row.trustMode,
    autoApplyEnabled: row.autoApplyEnabled,
    maxAutoApplyRiskScore: row.maxAutoApplyRiskScore,
    autoApplyProposalKinds: parseAutoApplyProposalKinds(row.autoApplyProposalKindsJson),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}


export function profileTrustSettingToRow(
  setting: ProfileTrustSetting,
): typeof profileTrustSettings.$inferInsert {
  const parsed = validateProfileTrustSetting(setting);
  return {
    id: parsed.id,
    scopeKey: profileTrustSettingScopeKey(parsed),
    baseProfileId: parsed.baseProfileId,
    targetKind: parsed.target.kind,
    targetProfileId: parsed.target.kind === 'base_profile' ? parsed.target.profileId ?? null : null,
    targetBranchId: parsed.target.kind === 'profile_branch' ? parsed.target.branchId ?? null : null,
    trustMode: parsed.trustMode,
    autoApplyEnabled: parsed.autoApplyEnabled,
    maxAutoApplyRiskScore: parsed.maxAutoApplyRiskScore,
    autoApplyProposalKindsJson: [...parsed.autoApplyProposalKinds],
    createdAt: parsed.createdAt,
    updatedAt: parsed.updatedAt,
  };
}
