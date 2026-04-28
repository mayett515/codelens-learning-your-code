import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSize, spacing } from '@/src/ui/theme';
import {
  buildSandboxPromptContract,
  findLayerForLine,
  getPrimaryInspectorTarget,
  resolveInspectorTarget,
  sandboxMessages,
} from '@/src/features/sandbox-chat-engine';
import type {
  SandboxChatMessage,
  SandboxCodeArtifact,
  SandboxInspectorTarget,
  SandboxModelOutput,
  SandboxTerm,
} from '@/src/features/sandbox-chat-engine';

export function SandboxChatEngineScreen() {
  const assistantOutput = sandboxMessages.find((message) => message.parsed)
    ?.parsed;
  const [selectedOutput] = useState<SandboxModelOutput | null>(
    assistantOutput ?? null,
  );
  const [target, setTarget] = useState<SandboxInspectorTarget | null>(
    assistantOutput ? getPrimaryInspectorTarget(assistantOutput) : null,
  );

  const inspector = useMemo(() => {
    if (!selectedOutput || !target) {
      return null;
    }
    return resolveInspectorTarget(selectedOutput, target);
  }, [selectedOutput, target]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>sandboxtexttesting</Text>
          <Text style={styles.title}>Chat Engine Lab</Text>
        </View>
        <View style={styles.contractPill}>
          <Text style={styles.contractPillText}>Expo web</Text>
        </View>
      </View>

      <View style={styles.shell}>
        <ScrollView style={styles.chatPane} contentContainerStyle={styles.paneContent}>
          <SectionTitle label="Chat" />
          {sandboxMessages.map((message) => (
            <ChatMessageBubble
              key={message.id}
              message={message}
              onTermPress={(id) => setTarget({ type: 'term', id })}
            />
          ))}
        </ScrollView>

        <ScrollView style={styles.codePane} contentContainerStyle={styles.paneContent}>
          <SectionTitle label="Code Under The Hood" />
          {selectedOutput?.codeArtifacts.map((artifact) => (
            <CodeArtifactCard
              key={artifact.id}
              artifact={artifact}
              target={target}
              onLayerPress={(layerId) =>
                setTarget({ type: 'layer', artifactId: artifact.id, layerId })
              }
            />
          ))}

          <SectionTitle label="Calculations" />
          <View style={styles.calcGrid}>
            {selectedOutput?.calculations.map((calculation) => (
              <Pressable
                key={calculation.id}
                style={[
                  styles.calcCard,
                  target?.type === 'calculation' &&
                    target.id === calculation.id &&
                    styles.activeCard,
                ]}
                onPress={() =>
                  setTarget({ type: 'calculation', id: calculation.id })
                }
              >
                <Text style={styles.calcLabel}>{calculation.label}</Text>
                <Text style={styles.calcExpression}>
                  {calculation.expression}
                </Text>
                <Text style={styles.calcResult}>{calculation.result}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <ScrollView style={styles.inspectorPane} contentContainerStyle={styles.paneContent}>
          <SectionTitle label="Inspector" />
          <InspectorContent value={inspector} />

          <SectionTitle label="Prompt Contract" />
          <Text style={styles.contractText}>{buildSandboxPromptContract()}</Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function ChatMessageBubble({
  message,
  onTermPress,
}: {
  message: SandboxChatMessage;
  onTermPress: (id: string) => void;
}) {
  const output = message.parsed;
  const isAssistant = message.role === 'assistant';

  return (
    <View
      style={[
        styles.message,
        isAssistant ? styles.assistantMessage : styles.userMessage,
      ]}
    >
      <Text style={styles.messageRole}>
        {isAssistant ? 'Assistant' : 'You'}
      </Text>
      <Text style={styles.messageText}>
        {output
          ? renderTextWithTerms(output.prose, output.terms, onTermPress)
          : message.content}
      </Text>
      {output && output.terms.length > 0 && (
        <View style={styles.termRow}>
          {output.terms.map((term) => (
            <Pressable
              key={term.id}
              style={styles.termBrick}
              onPress={() => onTermPress(term.id)}
            >
              <Text style={styles.termBrickText}>{term.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function CodeArtifactCard({
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

function InspectorContent({
  value,
}: {
  value: ReturnType<typeof resolveInspectorTarget> | null;
}) {
  if (!value) {
    return (
      <View style={styles.inspectorCard}>
        <Text style={styles.inspectorTitle}>Nothing selected</Text>
      </View>
    );
  }

  if ('promptHook' in value) {
    return (
      <View style={styles.inspectorCard}>
        <Text style={styles.inspectorMeta}>Term</Text>
        <Text style={styles.inspectorTitle}>{value.label}</Text>
        <Text style={styles.inspectorSummary}>{value.summary}</Text>
        <Text style={styles.inspectorBody}>{value.detail}</Text>
        <Text style={styles.promptHook}>{value.promptHook}</Text>
      </View>
    );
  }

  if ('expression' in value) {
    return (
      <View style={styles.inspectorCard}>
        <Text style={styles.inspectorMeta}>Calculation</Text>
        <Text style={styles.inspectorTitle}>{value.label}</Text>
        <Text style={styles.inspectorSummary}>{value.expression}</Text>
        <Text style={styles.calcResult}>{value.result}</Text>
        <Text style={styles.inspectorBody}>{value.explanation}</Text>
      </View>
    );
  }

  return (
    <View style={styles.inspectorCard}>
      <Text style={styles.inspectorMeta}>{value.kind}</Text>
      <Text style={styles.inspectorTitle}>{value.title}</Text>
      <Text style={styles.inspectorSummary}>{value.summary}</Text>
      <Text style={styles.inspectorBody}>{value.detail}</Text>
      <Text style={styles.lineRange}>
        lines {value.lineStart}-{value.lineEnd}
      </Text>
    </View>
  );
}

function SectionTitle({ label }: { label: string }) {
  return <Text style={styles.sectionTitle}>{label}</Text>;
}

function renderTextWithTerms(
  text: string,
  terms: SandboxTerm[],
  onTermPress: (id: string) => void,
) {
  if (terms.length === 0) {
    return text;
  }

  const labels = terms
    .map((term) => term.label)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp);
  const splitter = new RegExp(`(${labels.join('|')})`, 'gi');

  return text.split(splitter).map((part, index) => {
    const term = terms.find(
      (item) => item.label.toLowerCase() === part.toLowerCase(),
    );
    if (!term) {
      return part;
    }

    return (
      <Text
        key={`${term.id}-${index}`}
        style={styles.inlineTerm}
        onPress={() => onTermPress(term.id)}
      >
        {part}
      </Text>
    );
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    minHeight: 80,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  kicker: {
    color: colors.green,
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  contractPill: {
    minHeight: 32,
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  contractPillText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  shell: {
    flex: 1,
    flexDirection: 'row',
  },
  chatPane: {
    flex: 1.05,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border,
  },
  codePane: {
    flex: 1.25,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border,
  },
  inspectorPane: {
    flex: 0.9,
  },
  paneContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  message: {
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 1,
  },
  userMessage: {
    backgroundColor: '#172033',
    borderColor: '#273b64',
  },
  assistantMessage: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  messageRole: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  messageText: {
    color: colors.text,
    fontSize: fontSize.md,
    lineHeight: 21,
  },
  inlineTerm: {
    color: colors.yellow,
    fontWeight: '700',
    backgroundColor: 'rgba(229, 192, 123, 0.12)',
  },
  termRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  termBrick: {
    minHeight: 32,
    justifyContent: 'center',
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    backgroundColor: 'rgba(229, 192, 123, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(229, 192, 123, 0.35)',
  },
  termBrickText: {
    color: colors.yellow,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
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
  calcGrid: {
    gap: spacing.sm,
  },
  calcCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  activeCard: {
    borderColor: colors.primary,
    backgroundColor: '#182237',
  },
  calcLabel: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  calcExpression: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  calcResult: {
    color: colors.green,
    fontSize: fontSize.md,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  inspectorCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  inspectorMeta: {
    color: colors.primaryLight,
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  inspectorTitle: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  inspectorSummary: {
    color: colors.text,
    fontSize: fontSize.md,
    lineHeight: 21,
    marginTop: spacing.sm,
  },
  inspectorBody: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    lineHeight: 21,
    marginTop: spacing.md,
  },
  promptHook: {
    color: colors.yellow,
    fontSize: fontSize.sm,
    lineHeight: 18,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: 6,
    backgroundColor: 'rgba(229, 192, 123, 0.1)',
  },
  lineRange: {
    color: colors.blue,
    fontSize: fontSize.sm,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  contractText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 18,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
});
