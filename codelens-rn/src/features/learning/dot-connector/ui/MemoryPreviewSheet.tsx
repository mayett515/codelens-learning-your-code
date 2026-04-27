import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../../../../ui/theme';
import { ConceptCardCompact } from '../../ui/cards/ConceptCardCompact';
import { CaptureChip } from '../../ui/cards/CaptureChip';
import { sortPreviewMemories } from '../services/previewOrdering';
import type { MemoryPreviewState } from '../types/dotConnector';

interface MemoryPreviewSheetProps extends MemoryPreviewState {
  visible: boolean;
  removedMemoryIds: string[];
  onRemoveMemory: (id: string) => void;
  onUseThese: () => void;
  onDisableTurn: () => void;
  onClose: () => void;
}

export function MemoryPreviewSheet(props: MemoryPreviewSheetProps) {
  const visibleMemories = sortPreviewMemories(props.memories)
    .filter((memory) => !props.removedMemoryIds.includes(String(memory.id)));

  return (
    <Modal visible={props.visible} animationType="slide" transparent onRequestClose={props.onClose}>
      <Pressable style={styles.backdrop} onPress={props.onClose} />
      <View style={styles.sheet}>
        <Text style={styles.title}>Memories for this turn: {props.injection.includedCount} of {props.maxItems}</Text>
        {props.diagnostics?.status === 'partial' && props.diagnostics.partialReason ? (
          <Text style={styles.notice}>{props.diagnostics.partialReason}</Text>
        ) : null}
        <ScrollView style={styles.list}>
          {visibleMemories.map((memory) => (
            <View key={`${memory.kind}:${memory.id}`} style={styles.memoryRow}>
              {memory.kind === 'concept' ? (
                <ConceptCardCompact
                  conceptId={memory.payload.id}
                  name={memory.payload.name}
                  conceptType={memory.payload.conceptType}
                  strength={memory.payload.strength}
                  languageOrRuntime={memory.payload.languageOrRuntime}
                  canonicalSummary={memory.payload.canonicalSummary}
                  onPress={() => undefined}
                />
              ) : (
                <CaptureChip
                  label={memory.payload.title}
                  sublabel={memory.payload.whatClicked}
                />
              )}
              <Pressable style={styles.removeButton} onPress={() => props.onRemoveMemory(String(memory.id))}>
                <Text style={styles.removeText}>Remove</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Inject {props.injection.includedCount}, approx {props.injection.totalTokensApprox} tokens
          </Text>
          <View style={styles.footerActions}>
            <Pressable style={styles.secondaryButton} onPress={props.onDisableTurn}>
              <Text style={styles.secondaryText}>Do not inject this turn</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={props.onUseThese}>
              <Text style={styles.primaryText}>Use these</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    maxHeight: '72%',
    backgroundColor: colors.background,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
  notice: {
    color: colors.yellow,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  list: {
    marginTop: spacing.md,
  },
  memoryRow: {
    marginBottom: spacing.md,
  },
  removeButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    minHeight: 36,
    justifyContent: 'center',
  },
  removeText: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  footerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  primaryButton: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
  },
  primaryText: {
    color: colors.text,
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  secondaryText: {
    color: colors.textSecondary,
    fontWeight: '700',
  },
});
