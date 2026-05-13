import { asc, eq } from 'drizzle-orm';
import { db, type DbOrTx } from '../../../db/client';
import { profileTrustSettings } from './schema';
import {
  profileTrustSettingScopeKey,
  profileTrustSettingToRow,
  rowToProfileTrustSetting,
} from '../codecs/profileTrustSetting';
import type { ProfileChangeProposalTarget, ProfileTrustSetting } from '../types';

export async function insertProfileTrustSetting(
  setting: ProfileTrustSetting,
  executor: DbOrTx = db,
): Promise<void> {
  await executor.insert(profileTrustSettings).values(profileTrustSettingToRow(setting));
}

export async function upsertProfileTrustSetting(
  setting: ProfileTrustSetting,
  executor: DbOrTx = db,
): Promise<void> {
  const row = profileTrustSettingToRow(setting);
  await executor
    .insert(profileTrustSettings)
    .values(row)
    .onConflictDoUpdate({
      target: profileTrustSettings.scopeKey,
      set: {
        baseProfileId: row.baseProfileId,
        targetKind: row.targetKind,
        targetProfileId: row.targetProfileId,
        targetBranchId: row.targetBranchId,
        trustMode: row.trustMode,
        autoApplyEnabled: row.autoApplyEnabled,
        maxAutoApplyRiskScore: row.maxAutoApplyRiskScore,
        autoApplyProposalKindsJson: row.autoApplyProposalKindsJson,
        updatedAt: row.updatedAt,
      },
    });
}

export async function getProfileTrustSettingById(
  id: string,
  executor: DbOrTx = db,
): Promise<ProfileTrustSetting | undefined> {
  const rows = await executor
    .select()
    .from(profileTrustSettings)
    .where(eq(profileTrustSettings.id, id));
  return rows[0] ? rowToProfileTrustSetting(rows[0]) : undefined;
}

export async function getProfileTrustSettingForTarget(
  input: {
    baseProfileId: string;
    target: ProfileChangeProposalTarget;
  },
  executor: DbOrTx = db,
): Promise<ProfileTrustSetting | undefined> {
  const rows = await executor
    .select()
    .from(profileTrustSettings)
    .where(eq(profileTrustSettings.scopeKey, profileTrustSettingScopeKey(input)));
  return rows[0] ? rowToProfileTrustSetting(rows[0]) : undefined;
}

export async function listProfileTrustSettingsForBaseProfile(
  baseProfileId: string,
  executor: DbOrTx = db,
): Promise<ProfileTrustSetting[]> {
  const rows = await executor
    .select()
    .from(profileTrustSettings)
    .where(eq(profileTrustSettings.baseProfileId, baseProfileId))
    .orderBy(asc(profileTrustSettings.targetKind), asc(profileTrustSettings.updatedAt), asc(profileTrustSettings.id));
  return rows.map(rowToProfileTrustSetting);
}

export async function deleteProfileTrustSetting(
  id: string,
  executor: DbOrTx = db,
): Promise<void> {
  await executor.delete(profileTrustSettings).where(eq(profileTrustSettings.id, id));
}
