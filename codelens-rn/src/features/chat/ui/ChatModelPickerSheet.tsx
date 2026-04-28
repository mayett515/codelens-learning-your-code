import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../../../ui/theme';
import {
  getAvailableChatModels,
  getChatModelById,
  type ChatModelId,
  type ChatModelOption,
} from '../modelCatalog/catalog';
import { useSetChatModelOverride } from '../hooks/useSetChatModelOverride';
import type { ChatId } from '../../../domain/types';

interface ChatModelPickerSheetProps {
  visible: boolean;
  chatId: ChatId | null | undefined;
  currentModelId: string | null | undefined;
  onClose: () => void;
}

export function ChatModelPickerSheet({
  visible,
  chatId,
  currentModelId,
  onClose,
}: ChatModelPickerSheetProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const setModel = useSetChatModelOverride(chatId);
  const options = getAvailableChatModels();
  const currentModel = getChatModelById(currentModelId ?? null);
  const hasUnavailableModel = Boolean(currentModelId && !currentModel);
  const disabled = setModel.isPending || !chatId;

  async function selectModel(modelId: ChatModelId | null): Promise<void> {
    await setModel.mutateAsync(modelId);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Choose a model</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>
          {hasUnavailableModel ? (
            <Text style={styles.unavailable}>
              Current model is unavailable in this app version. Pick another model to switch away.
            </Text>
          ) : null}
          <ScrollView contentContainerStyle={styles.content}>
            <ModelRow
              title="Use default"
              subtitle="Use existing default model behavior"
              active={!currentModelId}
              disabled={disabled}
              onPress={() => void selectModel(null)}
            />
            {options.map((option) => (
              <ModelRow
                key={option.id}
                option={option}
                title={option.displayName}
                subtitle={option.providerLabel ?? option.provider}
                active={currentModelId === option.id}
                expanded={expandedId === option.id}
                disabled={disabled}
                onToggleExpanded={() =>
                  setExpandedId((current) => (current === option.id ? null : option.id))
                }
                onPress={() => void selectModel(option.id)}
              />
            ))}
          </ScrollView>
          {setModel.error ? (
            <Text style={styles.error}>
              {setModel.error instanceof Error ? setModel.error.message : 'Could not update model'}
            </Text>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ModelRow(props: {
  option?: ChatModelOption | undefined;
  title: string;
  subtitle: string;
  active: boolean;
  expanded?: boolean | undefined;
  disabled?: boolean | undefined;
  onPress: () => void;
  onToggleExpanded?: (() => void) | undefined;
}) {
  return (
    <Pressable
      style={[styles.row, props.active && styles.rowActive, props.disabled && styles.disabled]}
      onPress={props.onPress}
      disabled={props.disabled}
    >
      <View style={styles.rowHeader}>
        <View style={styles.rowCopy}>
          <Text style={[styles.rowTitle, props.active && styles.rowTitleActive]} numberOfLines={1}>
            {props.title}
          </Text>
          <Text style={styles.rowSubtitle} numberOfLines={1}>
            {props.subtitle}
          </Text>
        </View>
        {props.option ? (
          <Text style={[styles.badge, props.option.pricingTier === 'paid' && styles.badgePaid]}>
            {props.option.pricingTier.toUpperCase()}
          </Text>
        ) : null}
      </View>
      {props.option ? (
        <View style={styles.descriptionRow}>
          <Text style={styles.description} numberOfLines={props.expanded ? undefined : 1}>
            {props.option.description}
          </Text>
          {props.onToggleExpanded ? (
            <Pressable onPress={props.onToggleExpanded} hitSlop={8}>
              <Text style={styles.more}>{props.expanded ? 'Less' : 'More'}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    maxHeight: '78%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  close: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  unavailable: {
    color: colors.yellow,
    fontSize: fontSize.sm,
  },
  content: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  row: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  rowActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(96, 139, 219, 0.16)',
  },
  disabled: {
    opacity: 0.6,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowCopy: {
    flex: 1,
  },
  rowTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  rowTitleActive: {
    color: colors.primary,
  },
  rowSubtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  badge: {
    color: colors.green,
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: 6,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    fontSize: 10,
    fontWeight: '800',
  },
  badgePaid: {
    color: colors.yellow,
    borderColor: colors.yellow,
  },
  descriptionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  description: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  more: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  error: {
    color: colors.red,
    fontSize: fontSize.sm,
  },
});
