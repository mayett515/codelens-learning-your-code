import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../../../ui/theme';
import { buildPreviewBody } from '../services/sliceCodeContext';
import type { ChatCodeContext } from '../promptComposition/types';

interface Props {
  codeContext: ChatCodeContext;
  truncated?: boolean | undefined;
  onAdjust: () => void;
  onRemove: () => void;
}

export function SelectedCodePreview({ codeContext, truncated, onAdjust, onRemove }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const body = buildPreviewBody(codeContext.text);
  const rangeLabel = formatRange(codeContext);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.chipsRow}>
          {codeContext.language ? (
            <View style={styles.chip}>
              <Text style={styles.chipText}>{codeContext.language}</Text>
            </View>
          ) : null}
          {rangeLabel ? (
            <Text style={styles.rangeText} numberOfLines={1}>{rangeLabel}</Text>
          ) : null}
          {truncated ? (
            <Text style={styles.truncatedNote}>(truncated)</Text>
          ) : null}
        </View>
        <View style={styles.actionsRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={collapsed ? 'Expand preview' : 'Collapse preview'}
            onPress={() => setCollapsed((v) => !v)}
            hitSlop={8}
            style={styles.actionBtn}
          >
            <Text style={styles.actionText}>{collapsed ? 'Show' : 'Hide'}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Adjust selection"
            onPress={onAdjust}
            hitSlop={8}
            style={styles.actionBtn}
          >
            <Text style={styles.actionText}>Adjust</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remove selected code"
            onPress={onRemove}
            hitSlop={8}
            style={styles.removeBtn}
          >
            <Text style={styles.removeText}>x</Text>
          </Pressable>
        </View>
      </View>
      {!collapsed ? (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.bodyScroll}
          >
            <View>
              {body.lines.map((line, idx) => (
                <Text key={idx} style={styles.bodyLine} numberOfLines={1}>
                  {line.length > 0 ? line : ' '}
                </Text>
              ))}
            </View>
          </ScrollView>
          {body.hiddenLineCount > 0 ? (
            <Text style={styles.moreLines}>... {body.hiddenLineCount} more lines</Text>
          ) : null}
        </>
      ) : null}
      <Text style={styles.subtitle}>Will be sent with your next message</Text>
    </View>
  );
}

function formatRange(ctx: ChatCodeContext): string {
  const path = ctx.filePath;
  const start = ctx.startLine;
  const end = ctx.endLine;
  if (path && start != null && end != null) {
    return `${path}:${start}-${end}`;
  }
  if (path) return path;
  if (start != null && end != null) return `lines ${start}-${end}`;
  return '';
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  chipsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 4,
    paddingHorizontal: spacing.xs + 1,
    paddingVertical: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  rangeText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    flexShrink: 1,
  },
  truncatedNote: {
    color: colors.yellow,
    fontSize: 11,
    fontStyle: 'italic',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 4,
    backgroundColor: colors.surfaceLight,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  actionText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  removeBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceLight,
  },
  removeText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  bodyScroll: {
    paddingVertical: spacing.xs,
  },
  bodyLine: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontFamily: 'monospace',
  },
  moreLines: {
    color: colors.textSecondary,
    fontSize: 11,
    fontStyle: 'italic',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontStyle: 'italic',
  },
});
