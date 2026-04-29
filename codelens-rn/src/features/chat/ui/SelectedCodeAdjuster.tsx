import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../../../ui/theme';
import {
  expandRange,
  sliceCodeFromLines,
} from '../services/sliceCodeContext';

interface Props {
  fileLines: string[];
  startLine: number;
  endLine: number;
  onConfirm: (next: { startLine: number; endLine: number; text: string; truncated: boolean }) => void;
  onCancel: () => void;
}

export function SelectedCodeAdjuster({
  fileLines,
  startLine,
  endLine,
  onConfirm,
  onCancel,
}: Props) {
  const totalLines = fileLines.length;
  const [draftRange, setDraftRange] = useState({ startLine, endLine });

  useEffect(() => {
    setDraftRange({ startLine, endLine });
  }, [startLine, endLine]);

  const slice = useMemo(
    () => sliceCodeFromLines({
      fileLines,
      startLine: draftRange.startLine,
      endLine: draftRange.endLine,
    }),
    [draftRange.endLine, draftRange.startLine, fileLines],
  );
  const contextRange = useMemo(
    () => expandRange({
      startLine: slice.startLine,
      endLine: slice.endLine,
      fileLineCount: totalLines,
      before: 2,
      after: 2,
    }),
    [slice.endLine, slice.startLine, totalLines],
  );
  const contextSlice = useMemo(
    () => sliceCodeFromLines({
      fileLines,
      startLine: contextRange.startLine,
      endLine: contextRange.endLine,
    }),
    [contextRange.endLine, contextRange.startLine, fileLines],
  );
  const previewLines = useMemo(
    () => contextSlice.text.split('\n').slice(0, 8),
    [contextSlice.text],
  );
  const hiddenLineCount = Math.max(
    0,
    contextSlice.endLine - contextSlice.startLine + 1 - previewLines.length,
  );

  const expandTop = () => {
    setDraftRange((current) => ({
      ...current,
      startLine: Math.max(1, current.startLine - 2),
    }));
  };

  const shrinkTop = () => {
    setDraftRange((current) => ({
      ...current,
      startLine: Math.min(current.endLine, current.startLine + 1),
    }));
  };

  const expandBottom = () => {
    setDraftRange((current) => ({
      ...current,
      endLine: Math.min(totalLines, current.endLine + 2),
    }));
  };

  const shrinkBottom = () => {
    setDraftRange((current) => ({
      ...current,
      endLine: Math.max(current.startLine, current.endLine - 1),
    }));
  };

  function emitConfirm(nextStart: number, nextEnd: number) {
    const sliced = sliceCodeFromLines({
      fileLines,
      startLine: nextStart,
      endLine: nextEnd,
    });
    onConfirm({
      startLine: sliced.startLine,
      endLine: sliced.endLine,
      text: sliced.text,
      truncated: sliced.truncated,
    });
  }

  const willTruncate = slice.truncated || contextSlice.truncated;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Adjust selection</Text>
        <Text style={styles.range}>
          lines {slice.startLine}-{slice.endLine}
        </Text>
        {willTruncate ? (
          <Text style={styles.truncated}>(truncated)</Text>
        ) : null}
      </View>

      <View style={styles.row}>
        <Text style={styles.rowLabel}>Top</Text>
        <Pressable
          style={styles.adjustBtn}
          accessibilityLabel="Expand selection upward by 2 lines"
          onPress={expandTop}
          disabled={draftRange.startLine <= 1}
        >
          <Text style={styles.adjustText}>+2 above</Text>
        </Pressable>
        <Pressable
          style={styles.adjustBtn}
          accessibilityLabel="Shrink selection from the top by 1 line"
          onPress={shrinkTop}
          disabled={draftRange.startLine >= draftRange.endLine}
        >
          <Text style={styles.adjustText}>-1 from top</Text>
        </Pressable>
      </View>

      <View style={styles.row}>
        <Text style={styles.rowLabel}>Bottom</Text>
        <Pressable
          style={styles.adjustBtn}
          accessibilityLabel="Expand selection downward by 2 lines"
          onPress={expandBottom}
          disabled={draftRange.endLine >= totalLines}
        >
          <Text style={styles.adjustText}>+2 below</Text>
        </Pressable>
        <Pressable
          style={styles.adjustBtn}
          accessibilityLabel="Shrink selection from the bottom by 1 line"
          onPress={shrinkBottom}
          disabled={draftRange.endLine <= draftRange.startLine}
        >
          <Text style={styles.adjustText}>-1 from bottom</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.previewScroll}
      >
        <View>
          {previewLines.map((line, idx) => (
            <Text key={idx} style={styles.previewLine} numberOfLines={1}>
              {line.length > 0 ? line : ' '}
            </Text>
          ))}
        </View>
      </ScrollView>
      {hiddenLineCount > 0 ? (
        <Text style={styles.hiddenNote}>... {hiddenLineCount} more lines</Text>
      ) : null}

      <View style={styles.footer}>
        <Pressable
          style={styles.cancelBtn}
          accessibilityLabel="Cancel adjust"
          onPress={onCancel}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={styles.confirmBtn}
          accessibilityLabel="Confirm adjusted selection"
          onPress={() => emitConfirm(draftRange.startLine, draftRange.endLine)}
        >
          <Text style={styles.confirmText}>Use this selection</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceLight,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  range: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  truncated: {
    color: colors.yellow,
    fontSize: 11,
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rowLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    width: 56,
  },
  adjustBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 4,
    backgroundColor: colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  adjustText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  previewScroll: {
    paddingVertical: spacing.xs,
  },
  previewLine: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontFamily: 'monospace',
  },
  hiddenNote: {
    color: colors.textSecondary,
    fontSize: 11,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
    marginTop: spacing.xs,
  },
  cancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: 6,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  cancelText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  confirmBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  confirmText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});
