import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fontSize, spacing } from '../../../ui/theme';
import {
  changeProfileSelectionBase,
  createProfileSelectionDraftModel,
  moveProfileSelectionBranch,
  removeProfileSelectionBranch,
  setProfileSelectionBranchSelected,
} from '../profileSelectionDraft';
import { DEFAULT_RUNTIME_PROFILE_BASE_PROFILE_ID } from '../runtimeProfileActivation';
import {
  useCreateEmptyProfileBranch,
  useOntologyProfileSummaries,
  useProfileBranchesForParent,
  useProjectProfileSelection,
  useSaveProjectProfileSelection,
} from '../hooks/useProfileSelection';
import type {
  ProfileBranch,
  ProfileBranchKind,
  ProfileSelection,
} from '../types';
import type {
  ProfileSelectionBranchOption,
  ProfileSelectionCheckerTargetState,
  ProfileSelectionDraftError,
} from '../profileSelectionDraft';

const BRANCH_KIND_ORDER: readonly ProfileBranchKind[] = ['project', 'learning', 'personal'];

const BRANCH_KIND_LABELS: Readonly<Record<ProfileBranchKind, string>> = {
  project: 'Project',
  learning: 'Learning',
  personal: 'Personal',
};

export interface ProfileSelectionPanelCheckerTarget {
  baseProfileId: string;
  targetBranchId: string | null;
  label: string;
  canRunChecker: boolean;
  state: ProfileSelectionCheckerTargetState['kind'];
}

export interface ProfileSelectionPanelProps {
  projectId?: string | null | undefined;
  disabled?: boolean | undefined;
  initialCheckerTargetBranchId?: string | null | undefined;
  onCheckerTargetChange?: ((target: ProfileSelectionPanelCheckerTarget) => void) | undefined;
  onSelectionInteraction?: (() => void) | undefined;
}

export function ProfileSelectionPanel({
  projectId,
  disabled = false,
  initialCheckerTargetBranchId,
  onCheckerTargetChange,
  onSelectionInteraction,
}: ProfileSelectionPanelProps) {
  const normalizedProjectId = projectId?.trim() ?? '';
  const { data: baseProfiles = [], isLoading: baseProfilesLoading } = useOntologyProfileSummaries();
  const { data: selectionRow, isLoading: selectionLoading } = useProjectProfileSelection(normalizedProjectId);
  const defaultBaseProfileId = chooseDefaultBaseProfileId(baseProfiles);
  const [draftSelection, setDraftSelection] = useState<ProfileSelection>(() => ({
    baseProfileId: defaultBaseProfileId,
  }));
  const [createdBranches, setCreatedBranches] = useState<ProfileBranch[]>([]);
  const [newBranchKind, setNewBranchKind] = useState<ProfileBranchKind>('project');
  const [newBranchName, setNewBranchName] = useState('');
  const [checkerTargetBranchId, setCheckerTargetBranchId] = useState<string | null>(
    initialCheckerTargetBranchId?.trim() || null,
  );
  const [message, setMessage] = useState<{ tone: 'notice' | 'error'; text: string } | null>(null);
  const { data: persistedBranches = [], isLoading: branchesLoading } =
    useProfileBranchesForParent(draftSelection.baseProfileId);
  const saveSelectionMutation = useSaveProjectProfileSelection();
  const createBranchMutation = useCreateEmptyProfileBranch();
  const busy = disabled || saveSelectionMutation.isPending || createBranchMutation.isPending;

  useEffect(() => {
    // Query refetches can hand back new object identities; only persisted
    // selection revisions should replace an unsaved local draft.
    const fallbackSelection = { baseProfileId: defaultBaseProfileId };
    setDraftSelection(selectionRow?.selection ?? fallbackSelection);
  }, [
    defaultBaseProfileId,
    selectionRow?.id,
    selectionRow?.updatedAt,
  ]);

  useEffect(() => {
    setCheckerTargetBranchId(initialCheckerTargetBranchId?.trim() || null);
  }, [initialCheckerTargetBranchId]);

  const availableBranches = useMemo(() => {
    const seen = new Set(persistedBranches.map((branch) => branch.id));
    return [
      ...persistedBranches,
      ...createdBranches.filter((branch) =>
        branch.parentProfileId === draftSelection.baseProfileId && !seen.has(branch.id)),
    ];
  }, [createdBranches, draftSelection.baseProfileId, persistedBranches]);

  const model = useMemo(() => createProfileSelectionDraftModel({
    projectId: normalizedProjectId,
    selection: draftSelection,
    availableBaseProfiles: baseProfiles,
    availableBranches,
    checkerTargetBranchId,
  }), [
    availableBranches,
    baseProfiles,
    checkerTargetBranchId,
    draftSelection,
    normalizedProjectId,
  ]);

  const checkerTarget = useMemo(() =>
    panelCheckerTargetForModel(model.selection.baseProfileId, model.checkerTarget),
  [model.checkerTarget, model.selection.baseProfileId]);

  useEffect(() => {
    onCheckerTargetChange?.(checkerTarget);
  }, [checkerTarget, onCheckerTargetChange]);

  const selectBase = useCallback((baseProfileId: string) => {
    onSelectionInteraction?.();
    setMessage(null);
    setCheckerTargetBranchId(null);
    setDraftSelection((current) => changeProfileSelectionBase(current, baseProfileId));
  }, [onSelectionInteraction]);

  const toggleBranch = useCallback((option: ProfileSelectionBranchOption) => {
    onSelectionInteraction?.();
    setMessage(null);
    const selected = !option.selected;
    if (!selected && checkerTargetBranchId === option.id) {
      setCheckerTargetBranchId(null);
    }
    setDraftSelection((current) => setProfileSelectionBranchSelected({
      selection: current,
      branchKind: option.branchKind,
      branchId: option.id,
      selected,
    }));
  }, [checkerTargetBranchId, onSelectionInteraction]);

  const moveBranch = useCallback((
    option: ProfileSelectionBranchOption,
    direction: 'up' | 'down',
  ) => {
    onSelectionInteraction?.();
    setMessage(null);
    setDraftSelection((current) => moveProfileSelectionBranch({
      selection: current,
      branchKind: option.branchKind,
      branchId: option.id,
      direction,
    }));
  }, [onSelectionInteraction]);

  const removeInvalidBranch = useCallback((branchId: string) => {
    onSelectionInteraction?.();
    setMessage(null);
    if (checkerTargetBranchId === branchId) {
      setCheckerTargetBranchId(null);
    }
    setDraftSelection((current) => removeProfileSelectionBranch(current, branchId));
  }, [checkerTargetBranchId, onSelectionInteraction]);

  const selectCheckerTarget = useCallback((branchId: string | null) => {
    onSelectionInteraction?.();
    setCheckerTargetBranchId(branchId);
  }, [onSelectionInteraction]);

  const saveSelection = useCallback(async () => {
    setMessage(null);
    try {
      await saveSelectionMutation.mutateAsync({
        projectId: model.projectId,
        selection: model.selection,
      });
      setMessage({ tone: 'notice', text: 'Saved profile selection.' });
    } catch (error) {
      setMessage({ tone: 'error', text: formatPanelError(error) });
    }
  }, [model.projectId, model.selection, saveSelectionMutation]);

  const createBranch = useCallback(async () => {
    onSelectionInteraction?.();
    setMessage(null);
    try {
      const branch = await createBranchMutation.mutateAsync({
        parentProfileId: model.selection.baseProfileId,
        branchKind: newBranchKind,
        name: newBranchName,
      });
      setCreatedBranches((current) => [...current.filter((item) => item.id !== branch.id), branch]);
      setDraftSelection((current) => setProfileSelectionBranchSelected({
        selection: current,
        branchKind: branch.branchKind,
        branchId: branch.id,
        selected: true,
      }));
      setNewBranchName('');
      setMessage({ tone: 'notice', text: `Created ${branch.name}.` });
    } catch (error) {
      setMessage({ tone: 'error', text: formatPanelError(error) });
    }
  }, [createBranchMutation, model.selection.baseProfileId, newBranchKind, newBranchName, onSelectionInteraction]);

  const loading = baseProfilesLoading || selectionLoading || branchesLoading;
  const errors = uniqueErrors(model.errors);
  const canCreateBranch = !busy &&
    model.baseOptions.some((option) => option.selected) &&
    newBranchName.trim().length > 0;
  const canSave = !busy && model.canSaveSelection;

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Profile selection</Text>
          <Text style={styles.subtitle}>{model.projectId || 'Project id required'}</Text>
        </View>
        {loading ? <ActivityIndicator color={colors.primaryLight} /> : null}
      </View>

      <Text style={styles.sectionLabel}>Base profile</Text>
      <View style={styles.optionGrid}>
        {model.baseOptions.map((option) => (
          <Pressable
            key={option.id}
            style={[styles.optionButton, option.selected && styles.optionButtonSelected, busy && styles.disabled]}
            onPress={() => selectBase(option.id)}
            disabled={busy}
          >
            <Text style={styles.optionTitle}>{option.label}</Text>
            <Text style={styles.optionMeta}>{option.id}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>
          {model.selectedBranchCount === 1
            ? '1 selected branch'
            : `${model.selectedBranchCount} selected branches`}
        </Text>
        <Text style={styles.summaryText}>{checkerTarget.label}</Text>
      </View>

      <Text style={styles.sectionLabel}>Branches</Text>
      {BRANCH_KIND_ORDER.map((kind) => (
        <BranchKindSection
          key={kind}
          kind={kind}
          options={model.branchGroups[kind]}
          disabled={busy}
          onToggle={toggleBranch}
          onMove={moveBranch}
        />
      ))}

      {errors.length > 0 ? (
        <View style={styles.errorBox}>
          {errors.map((error) => (
            <View key={errorKey(error)} style={styles.errorRow}>
              <Text style={styles.errorText}>{error.message}</Text>
              {error.branchId ? (
                <Pressable
                  style={[styles.smallButton, busy && styles.disabled]}
                  onPress={() => removeInvalidBranch(error.branchId!)}
                  disabled={busy}
                >
                  <Text style={styles.smallButtonText}>Remove</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.sectionLabel}>Checker target</Text>
      <CheckerTargetPicker
        target={model.checkerTarget}
        disabled={busy}
        onSelect={selectCheckerTarget}
      />

      <Text style={styles.sectionLabel}>Create empty branch</Text>
      <View style={styles.kindTabs}>
        {BRANCH_KIND_ORDER.map((kind) => (
          <Pressable
            key={kind}
            style={[styles.kindTab, newBranchKind === kind && styles.kindTabSelected, busy && styles.disabled]}
            onPress={() => setNewBranchKind(kind)}
            disabled={busy}
          >
            <Text style={styles.kindTabText}>{BRANCH_KIND_LABELS[kind]}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.createRow}>
        <TextInput
          style={styles.input}
          value={newBranchName}
          editable={!busy}
          onChangeText={setNewBranchName}
          placeholder="Branch name"
          placeholderTextColor={colors.textSecondary}
        />
        <Pressable
          style={[styles.secondaryAction, !canCreateBranch && styles.disabled]}
          onPress={() => void createBranch()}
          disabled={!canCreateBranch}
        >
          <Text style={styles.secondaryActionText}>
            {createBranchMutation.isPending ? 'Creating...' : 'Create'}
          </Text>
        </Pressable>
      </View>

      {message ? (
        <Text style={message.tone === 'error' ? styles.errorText : styles.noticeText}>
          {message.text}
        </Text>
      ) : null}

      <Pressable
        style={[styles.primaryAction, !canSave && styles.disabled]}
        onPress={() => void saveSelection()}
        disabled={!canSave}
      >
        <Text style={styles.primaryActionText}>
          {saveSelectionMutation.isPending ? 'Saving...' : 'Save selection'}
        </Text>
      </Pressable>
    </View>
  );
}

function BranchKindSection({
  kind,
  options,
  disabled,
  onToggle,
  onMove,
}: {
  kind: ProfileBranchKind;
  options: readonly ProfileSelectionBranchOption[];
  disabled: boolean;
  onToggle: (option: ProfileSelectionBranchOption) => void;
  onMove: (option: ProfileSelectionBranchOption, direction: 'up' | 'down') => void;
}) {
  return (
    <View style={styles.branchSection}>
      <Text style={styles.branchSectionTitle}>{BRANCH_KIND_LABELS[kind]}</Text>
      {options.length === 0 ? (
        <Text style={styles.emptyText}>No {kind} branches.</Text>
      ) : options.map((option) => (
        <View key={option.id} style={[styles.branchRow, option.selected && styles.branchRowSelected]}>
          <Pressable
            style={styles.branchMain}
            onPress={() => onToggle(option)}
            disabled={disabled}
          >
            <Text style={styles.branchName}>{option.name}</Text>
            <Text style={styles.branchMeta}>{option.selected ? 'Selected' : option.id}</Text>
          </Pressable>
          {option.selected ? (
            <View style={styles.branchOrderControls}>
              <Pressable
                style={[styles.iconButton, (disabled || option.selectedOrder === 0) && styles.disabled]}
                onPress={() => onMove(option, 'up')}
                disabled={disabled || option.selectedOrder === 0}
              >
                <Text style={styles.iconButtonText}>^</Text>
              </Pressable>
              <Pressable
                style={[styles.iconButton, disabled && styles.disabled]}
                onPress={() => onMove(option, 'down')}
                disabled={disabled}
              >
                <Text style={styles.iconButtonText}>v</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function CheckerTargetPicker({
  target,
  disabled,
  onSelect,
}: {
  target: ProfileSelectionCheckerTargetState;
  disabled: boolean;
  onSelect: (branchId: string | null) => void;
}) {
  if (target.kind === 'none_selected') {
    return <Text style={styles.emptyText}>Select a branch before running the checker.</Text>;
  }

  if (target.kind === 'invalid_selection') {
    return <Text style={styles.errorText}>Checker target branch is not selected.</Text>;
  }

  return (
    <View style={styles.optionGrid}>
      {target.options.map((option) => {
        const selected = target.selectedBranchId === option.branchId;
        return (
          <Pressable
            key={option.branchId}
            style={[styles.optionButton, selected && styles.optionButtonSelected, disabled && styles.disabled]}
            onPress={() => onSelect(option.branchId)}
            disabled={disabled}
          >
            <Text style={styles.optionTitle}>{option.label}</Text>
            <Text style={styles.optionMeta}>{BRANCH_KIND_LABELS[option.branchKind]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function chooseDefaultBaseProfileId(baseProfiles: readonly { id: string }[]): string {
  if (baseProfiles.some((profile) => profile.id === DEFAULT_RUNTIME_PROFILE_BASE_PROFILE_ID)) {
    return DEFAULT_RUNTIME_PROFILE_BASE_PROFILE_ID;
  }
  return baseProfiles[0]?.id ?? DEFAULT_RUNTIME_PROFILE_BASE_PROFILE_ID;
}

function panelCheckerTargetForModel(
  baseProfileId: string,
  target: ProfileSelectionCheckerTargetState,
): ProfileSelectionPanelCheckerTarget {
  const option = target.selectedBranchId
    ? target.options.find((candidate) => candidate.branchId === target.selectedBranchId)
    : undefined;
  const label = option
    ? `Branch ${option.label}`
    : target.kind === 'requires_choice'
      ? 'Choose checker target'
      : 'No selected branch';

  return {
    baseProfileId,
    targetBranchId: target.selectedBranchId,
    label,
    canRunChecker: target.canRunChecker,
    state: target.kind,
  };
}

function uniqueErrors(errors: readonly ProfileSelectionDraftError[]): ProfileSelectionDraftError[] {
  const seen = new Set<string>();
  const result: ProfileSelectionDraftError[] = [];
  for (const error of errors) {
    const key = errorKey(error);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(error);
  }
  return result;
}

function errorKey(error: ProfileSelectionDraftError): string {
  return `${error.code}:${error.branchId ?? ''}:${error.expectedKind ?? ''}:${error.actualKind ?? ''}`;
}

function formatPanelError(error: unknown): string {
  if (error && typeof error === 'object' && typeof (error as { code?: unknown }).code === 'string') {
    switch ((error as { code: string }).code) {
      case 'project_id_required':
        return 'A project id is required before this selection can be saved.';
      case 'branch_name_required':
        return 'Enter a branch name before creating it.';
    }
  }
  return error instanceof Error ? error.message : 'Profile selection update failed.';
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  sectionLabel: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  optionGrid: {
    gap: spacing.sm,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
    backgroundColor: colors.background,
  },
  optionButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceLight,
  },
  optionTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  optionMeta: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  summaryText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  branchSection: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  branchSectionTitle: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '800',
    padding: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  branchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  branchRowSelected: {
    backgroundColor: colors.surfaceLight,
  },
  branchMain: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  branchName: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  branchMeta: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  branchOrderControls: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingRight: spacing.sm,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  iconButtonText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '800',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    padding: spacing.sm,
  },
  errorBox: {
    borderWidth: 1,
    borderColor: colors.red,
    borderRadius: 8,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  errorRow: {
    gap: spacing.xs,
  },
  errorText: {
    color: colors.red,
    fontSize: fontSize.sm,
  },
  noticeText: {
    color: colors.green,
    fontSize: fontSize.sm,
  },
  smallButton: {
    alignSelf: 'flex-start',
    minHeight: 34,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  smallButtonText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  kindTabs: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  kindTab: {
    flex: 1,
    minHeight: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kindTabSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceLight,
  },
  kindTabText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  createRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    color: colors.text,
    backgroundColor: colors.background,
    fontSize: fontSize.md,
  },
  primaryAction: {
    minHeight: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    marginTop: spacing.sm,
  },
  primaryActionText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '800',
  },
  secondaryAction: {
    minHeight: 44,
    minWidth: 96,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  secondaryActionText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.5,
  },
});
