import { z } from 'zod';
import type { profileTrustSettings } from '../data/schema';
import type {
  ProfileChangeProposalKind,
  ProfileChangeProposalTarget,
  ProfileTrustSetting,
} from '../types';

const TrustModeSchema = z.enum([
  'manual_only',
  'suggest_first',
  'trusted_low_risk_auto',
  'adaptive',
]);

const TargetKindSchema = z.enum(['base_profile', 'profile_branch']);

const ProposalKindSchema = z.enum([
  'classification_patch',
  'ontology_node_patch',
  'relationship_patch',
  'branch_merge',
  'manual_draft',
]);

const AutoApplyProposalKindSchema = z.enum([
  'classification_patch',
  'ontology_node_patch',
  'relationship_patch',
]);

const ProfileTrustTargetSchema = z
  .object({
    kind: TargetKindSchema,
    profileId: z.string().min(1).nullable().optional(),
    branchId: z.string().min(1).nullable().optional(),
  })
  .strict();

const ProfileTrustSettingSchema = z
  .object({
    id: z.string().min(1),
    baseProfileId: z.string().min(1),
    target: ProfileTrustTargetSchema,
    trustMode: TrustModeSchema,
    autoApplyEnabled: z.boolean(),
    maxAutoApplyRiskScore: z.number().min(0).max(100),
    autoApplyProposalKinds: z.array(ProposalKindSchema),
    createdAt: z.number().int().nonnegative(),
    updatedAt: z.number().int().nonnegative(),
  })
  .strict()
  .superRefine((setting, ctx) => {
    validateTarget(setting.baseProfileId, setting.target, ctx);

    const autoKinds = setting.autoApplyProposalKinds;
    const hasAutoKinds = autoKinds.length > 0;
    const supportsAutoApply =
      setting.trustMode === 'trusted_low_risk_auto' ||
      setting.trustMode === 'adaptive';

    for (let index = 0; index < autoKinds.length; index += 1) {
      const result = AutoApplyProposalKindSchema.safeParse(autoKinds[index]);
      if (!result.success) {
        ctx.addIssue({
          code: 'custom',
          message: 'Only classification, ontology-node, and relationship proposals can be auto-applied',
          path: ['autoApplyProposalKinds', index],
        });
      }
    }

    if (setting.target.kind === 'base_profile' && setting.autoApplyEnabled) {
      ctx.addIssue({
        code: 'custom',
        message: 'Base-profile trust settings must not enable auto-apply',
        path: ['autoApplyEnabled'],
      });
    }

    if (!setting.autoApplyEnabled) {
      if (setting.maxAutoApplyRiskScore !== 0) {
        ctx.addIssue({
          code: 'custom',
          message: 'Disabled auto-apply settings must use maxAutoApplyRiskScore 0',
          path: ['maxAutoApplyRiskScore'],
        });
      }
      if (hasAutoKinds) {
        ctx.addIssue({
          code: 'custom',
          message: 'Disabled auto-apply settings must not list auto-apply proposal kinds',
          path: ['autoApplyProposalKinds'],
        });
      }
      return;
    }

    if (!supportsAutoApply) {
      ctx.addIssue({
        code: 'custom',
        message: 'Only trusted_low_risk_auto or adaptive trust modes can enable auto-apply',
        path: ['trustMode'],
      });
    }

    if (setting.maxAutoApplyRiskScore <= 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'Enabled auto-apply settings require a positive risk threshold',
        path: ['maxAutoApplyRiskScore'],
      });
    }

    if (setting.trustMode === 'trusted_low_risk_auto' && setting.maxAutoApplyRiskScore > 25) {
      ctx.addIssue({
        code: 'custom',
        message: 'trusted_low_risk_auto cannot exceed risk score 25',
        path: ['maxAutoApplyRiskScore'],
      });
    }

    if (setting.trustMode === 'adaptive' && setting.maxAutoApplyRiskScore > 50) {
      ctx.addIssue({
        code: 'custom',
        message: 'adaptive auto-apply cannot exceed risk score 50',
        path: ['maxAutoApplyRiskScore'],
      });
    }

    if (!hasAutoKinds) {
      ctx.addIssue({
        code: 'custom',
        message: 'Enabled auto-apply settings require at least one proposal kind',
        path: ['autoApplyProposalKinds'],
      });
    }
  });

function parseJsonColumn(raw: unknown, columnName: string): unknown {
  if (typeof raw !== 'string') return raw;

  try {
    return JSON.parse(raw);
  } catch (cause) {
    throw new Error(`Invalid JSON in ${columnName}`, { cause });
  }
}

function validateTarget(
  baseProfileId: string,
  target: ProfileChangeProposalTarget,
  ctx: z.RefinementCtx,
): void {
  if (target.kind === 'base_profile') {
    if (target.profileId !== baseProfileId || target.branchId != null) {
      ctx.addIssue({
        code: 'custom',
        message: 'Base-profile trust settings must target the same base profile and no branch',
        path: ['target'],
      });
    }
    return;
  }

  if (!target.branchId || target.profileId != null) {
    ctx.addIssue({
      code: 'custom',
      message: 'Profile-branch trust settings require branchId and no profileId',
      path: ['target'],
    });
  }
}

export function parseAutoApplyProposalKinds(raw: unknown): ProfileChangeProposalKind[] {
  return z.array(ProposalKindSchema).parse(
    parseJsonColumn(raw, 'auto_apply_proposal_kinds_json'),
  ) as ProfileChangeProposalKind[];
}

export function profileTrustSettingScopeKey(input: {
  baseProfileId: string;
  target: ProfileChangeProposalTarget;
}): string {
  if (input.target.kind === 'base_profile') {
    return `base_profile:${input.baseProfileId}`;
  }
  return `profile_branch:${input.baseProfileId}:${input.target.branchId ?? ''}`;
}

export function validateProfileTrustSetting(raw: unknown): ProfileTrustSetting {
  return ProfileTrustSettingSchema.parse(raw) as ProfileTrustSetting;
}

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

export function makeSuggestFirstProfileTrustSetting(input: {
  id: string;
  baseProfileId: string;
  target: ProfileChangeProposalTarget;
  now: number;
}): ProfileTrustSetting {
  return {
    id: input.id,
    baseProfileId: input.baseProfileId,
    target: input.target,
    trustMode: 'suggest_first',
    autoApplyEnabled: false,
    maxAutoApplyRiskScore: 0,
    autoApplyProposalKinds: [],
    createdAt: input.now,
    updatedAt: input.now,
  };
}
