import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { colors, fontSize, spacing } from '@/src/ui/theme';
import { runForceLayout } from '../engine/layout';
import { useGraphForFocal } from '../hooks/useGraphData';
import { GraphCanvas } from './GraphCanvas';
import { GraphLegend } from './GraphLegend';
import { GraphModeBar } from './GraphModeBar';
import { NodePreviewTooltip } from './NodePreviewTooltip';
import type { ConceptId } from '@/src/features/learning';
import type { GraphMode, LayoutResult } from '../types';

interface GraphScreenProps {
  focalConceptId: ConceptId | null;
}

interface CanvasSize {
  width: number;
  height: number;
}

interface TooltipState {
  nodeIndex: number;
  screenX: number;
  screenY: number;
}

export function GraphScreen({ focalConceptId }: GraphScreenProps) {
  const [mode, setMode] = useState<GraphMode>('structure');
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width: 0, height: 0 });
  const [layout, setLayout] = useState<LayoutResult | null>(null);
  const [isLayingOut, setIsLayingOut] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const query = useGraphForFocal(focalConceptId);
  const nowMs = useMemo(() => Date.now(), [layout]);

  useEffect(() => {
    if (!query.data || canvasSize.width === 0 || canvasSize.height === 0) return;
    setIsLayingOut(true);
    const handle = requestAnimationFrame(() => {
      const layoutOptions = {
        width: canvasSize.width,
        height: canvasSize.height,
        ...(query.data.focalConceptId ? { focalConceptId: query.data.focalConceptId } : {}),
      };
      setLayout(runForceLayout(query.data.nodes, query.data.edges, layoutOptions));
      setIsLayingOut(false);
    });
    return () => cancelAnimationFrame(handle);
  }, [canvasSize.height, canvasSize.width, query.data]);

  useEffect(() => {
    setTooltip(null);
  }, [layout]);

  const presentTypeNodeIds = useMemo(() => {
    const ids = query.data?.nodes.map((node) => node.typeNodeId) ?? [];
    return [...new Set(ids)].sort();
  }, [query.data]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backBtn}>{'<'}</Text>
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>{focalConceptId ? 'Concept Graph' : 'Knowledge Graph'}</Text>
          <Text style={styles.subtitle}>{query.data?.isEgoView ? 'Focused view' : 'Full graph'}</Text>
        </View>
      </View>
      <View style={styles.modeRow}>
        <GraphModeBar currentMode={mode} onModeChange={setMode} />
      </View>
      <View
        style={styles.canvasHost}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          setCanvasSize({ width, height });
        }}
      >
        {query.isPending ? <CenteredText label="Loading graph..." /> : null}
        {query.isError ? (
          <ErrorState message={query.error instanceof Error ? query.error.message : 'Graph unavailable'} onRetry={() => query.refetch()} />
        ) : null}
        {query.data && query.data.nodes.length === 0 ? (
          <EmptyState />
        ) : null}
        {layout && canvasSize.width > 0 && canvasSize.height > 0 ? (
          <GraphCanvas
            layoutResult={layout}
            mode={mode}
            nowMs={nowMs}
            width={canvasSize.width}
            height={canvasSize.height}
            onNodeDoubleTap={(id) => router.push(graphHref(id))}
            onNodeLongPress={(nodeIndex, screenX, screenY) => setTooltip({ nodeIndex, screenX, screenY })}
            onCanvasMiss={() => setTooltip(null)}
          />
        ) : null}
        {isLayingOut ? (
          <View style={styles.layoutSpinner}>
            <ActivityIndicator color={colors.primaryLight} />
          </View>
        ) : null}
        {query.data && query.data.cappedAt ? (
          <View style={styles.capBanner}>
            <Text style={styles.capText}>Showing {query.data.cappedAt} of {query.data.totalConceptCount} - strongest first</Text>
          </View>
        ) : null}
        {tooltip && layout?.nodes[tooltip.nodeIndex] ? (
          <NodePreviewTooltip
            node={layout.nodes[tooltip.nodeIndex]}
            screenX={tooltip.screenX}
            screenY={tooltip.screenY}
            mode={mode}
            nowMs={nowMs}
            onDismiss={() => setTooltip(null)}
            onOpenDetail={(id) => router.push(graphHref(id))}
          />
        ) : null}
        <GraphLegend mode={mode} presentTypeNodeIds={presentTypeNodeIds} />
      </View>
    </SafeAreaView>
  );
}

function graphHref(conceptId: ConceptId): Href {
  return `/graph?conceptId=${encodeURIComponent(conceptId)}` as Href;
}

function CenteredText({ label }: { label: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.centerText}>{label}</Text>
    </View>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.centerTitle}>Graph unavailable</Text>
      <Text style={styles.centerText}>{message}</Text>
      <Pressable style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryText}>Try again</Text>
      </Pressable>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.center}>
      <Text style={styles.centerTitle}>No concepts yet</Text>
      <Text style={styles.centerText}>Concepts appear here once you promote captures.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backBtn: {
    color: colors.primary,
    fontSize: fontSize.xl,
    fontWeight: '800',
    paddingHorizontal: spacing.xs,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  modeRow: {
    padding: spacing.md,
  },
  canvasHost: {
    flex: 1,
    overflow: 'hidden',
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  centerTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  centerText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 44,
    marginTop: spacing.md,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
  },
  retryText: {
    color: colors.text,
    fontWeight: '800',
  },
  layoutSpinner: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },
  capBanner: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.surface,
    padding: spacing.sm,
  },
  capText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
});
