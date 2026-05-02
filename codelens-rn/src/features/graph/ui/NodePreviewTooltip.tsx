import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '@/src/ui/theme';
import type { ConceptId } from '@/src/features/learning';
import type { GraphMode, GraphNode } from '../types';

interface NodePreviewTooltipProps {
  node: GraphNode;
  screenX: number;
  screenY: number;
  mode: GraphMode;
  nowMs: number;
  onDismiss: () => void;
  onOpenDetail: (conceptId: ConceptId) => void;
}

export function NodePreviewTooltip({
  node,
  screenX,
  screenY,
  mode,
  nowMs,
  onDismiss,
  onOpenDetail,
}: NodePreviewTooltipProps) {
  return (
    <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss}>
      <View style={[styles.container, { left: clamp(screenX, 12, 180), top: Math.max(12, screenY - 88) }]}>
        <Text style={styles.name} numberOfLines={2}>{node.name}</Text>
        <Text style={styles.meta}>{node.conceptType.replace(/_/g, ' ')}</Text>
        <Text style={styles.text}>{descriptionForMode(node, mode, nowMs)}</Text>
        <Pressable style={styles.action} onPress={() => onOpenDetail(node.id)}>
          <Text style={styles.actionText}>View detail</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

function descriptionForMode(node: GraphNode, mode: GraphMode, nowMs: number): string {
  if (mode === 'recency') {
    if (node.lastAccessedAt === null) return 'Never accessed via Dot Connector';
    const days = Math.max(0, Math.round((nowMs - node.lastAccessedAt) / 86_400_000));
    return `Last accessed ${days} day${days === 1 ? '' : 's'} ago`;
  }
  if (mode === 'strength') {
    return `Familiarity ${Math.round(node.familiarityScore * 100)}% - Importance ${Math.round(node.importanceScore * 100)}%`;
  }
  return `Strength ${Math.round(node.strength * 100)}%`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 190,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  name: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '800',
  },
  meta: {
    color: colors.primaryLight,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    textTransform: 'capitalize',
  },
  text: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  action: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  actionText: {
    color: colors.primaryLight,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
});
