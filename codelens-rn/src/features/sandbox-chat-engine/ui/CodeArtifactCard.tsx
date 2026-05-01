import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { SandboxCodeArtifact, SandboxInspectorTarget } from '../types';
import { findLayerForLine } from '../engine';
import { colors, fontSize, spacing } from '@/src/ui/theme';

export function CodeArtifactCard({
  artifact,
  target,
  onLayerPress,
}: {
  artifact: SandboxCodeArtifact;
  target: SandboxInspectorTarget | null;
  onLayerPress: (layerId: string) => void;
}) {
  const lines = artifact.code.split('\n');

  return (
    <View style={styles.codeCard}>
      <View style={styles.codeHeader}>
        <Text style={styles.codeTitle}>{artifact.title}</Text>
        <Text style={styles.languageBadge}>{artifact.language}</Text>
      </View>

      <View style={styles.layerRail}>
        {artifact.layers.map((layer) => {
          const active =
            target?.type === 'layer' &&
            target.artifactId === artifact.id &&
            target.layerId === layer.id;
          return (
            <Pressable
              key={layer.id}
              style={[styles.layerButton, active && styles.activeLayerButton]}
              onPress={() => onLayerPress(layer.id)}
            >
              <Text style={[styles.layerButtonText, active && styles.activeText]}>
                {layer.title}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.codeBlock}>
        {lines.map((line, index) => {
          const lineNumber = index + 1;
          const layer = findLayerForLine(artifact, lineNumber);
          const active =
            layer &&
            target?.type === 'layer' &&
            target.artifactId === artifact.id &&
            target.layerId === layer.id;

          return (
            <Pressable
              key={`${artifact.id}-${lineNumber}`}
              style={[styles.codeLine, active && styles.activeCodeLine]}
              onPress={() => {
                if (layer) {
                  onLayerPress(layer.id);
                }
              }}
            >
              <Text style={styles.lineNumber}>{lineNumber}</Text>
              <Text style={styles.codeText}>{line || ' '}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  codeCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  codeHeader: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  codeTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
    flex: 1,
  },
  languageBadge: {
    color: colors.blue,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  layerRail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  layerButton: {
    minHeight: 32,
    justifyContent: 'center',
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceLight,
  },
  activeLayerButton: {
    backgroundColor: '#20395f',
  },
  layerButtonText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  activeText: {
    color: colors.text,
  },
  codeBlock: {
    paddingVertical: spacing.sm,
  },
  codeLine: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  activeCodeLine: {
    backgroundColor: 'rgba(96, 139, 219, 0.18)',
  },
  lineNumber: {
    width: 28,
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: 'monospace',
    textAlign: 'right',
    marginRight: spacing.sm,
  },
  codeText: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    fontFamily: 'monospace',
  },
});