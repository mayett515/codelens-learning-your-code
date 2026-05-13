import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { colors, fontSize, spacing } from '@/src/ui/theme';
import { getActiveDomainProfile, getOntologyNodeLabel } from '@/src/features/ontology';
import { CONCEPT_TYPE_COLORS } from '../engine/visualEncoding';
import type { ConceptType } from '@/src/features/learning';
import type { GraphMode } from '../types';

interface GraphLegendProps {
  mode: GraphMode;
  presentTypeNodeIds: ConceptType[];
}

export function GraphLegend({ mode, presentTypeNodeIds }: GraphLegendProps) {
  const profile = getActiveDomainProfile();
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.container}>
      <Pressable onPress={() => setExpanded((value) => !value)} style={styles.header}>
        <Text style={styles.title}>{profile.graph.legendHelperLabels.title}</Text>
        <Text style={styles.toggle}>{expanded ? '-' : '+'}</Text>
      </Pressable>
      {expanded ? <LegendBody mode={mode} presentTypeNodeIds={presentTypeNodeIds} /> : null}
    </View>
  );
}

function LegendBody({
  mode,
  presentTypeNodeIds,
}: {
  mode: GraphMode;
  presentTypeNodeIds: ConceptType[];
}) {
  const profile = getActiveDomainProfile();

  if (mode === 'structure') {
    const relLabels = profile.graph.relationshipLabels;
    return (
      <View style={styles.body}>
        {presentTypeNodeIds.map((typeNodeId) => (
          <View key={typeNodeId} style={styles.row}>
            <View style={[styles.swatch, { backgroundColor: CONCEPT_TYPE_COLORS[typeNodeId] ?? CONCEPT_TYPE_COLORS['mechanism'] }]} />
            <Text style={styles.text}>{getOntologyNodeLabel(typeNodeId)}</Text>
          </View>
        ))}
        <Text style={styles.text}>Solid: {relLabels['prerequisite']}</Text>
        <Text style={styles.text}>Dashed: {relLabels['related']}</Text>
        <Text style={styles.text}>Dotted: {relLabels['contrast']}</Text>
      </View>
    );
  }

  if (mode === 'recency') {
    return (
      <View style={styles.body}>
        <Text style={styles.text}>{profile.graph.legendHelperLabels.recencyRecent}</Text>
        <Text style={styles.text}>{profile.graph.legendHelperLabels.recencyModerate}</Text>
        <Text style={styles.text}>{profile.graph.legendHelperLabels.recencyOld}</Text>
        <Text style={styles.text}>{profile.graph.legendHelperLabels.recencyStale}</Text>
      </View>
    );
  }

  return (
    <View style={styles.body}>
      <Text style={styles.text}>{profile.graph.legendHelperLabels.strengthGradient}</Text>
      <Text style={styles.text}>{profile.graph.legendHelperLabels.strengthSize}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  header: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  toggle: {
    color: colors.primaryLight,
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
  body: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  text: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textTransform: 'capitalize',
  },
});
