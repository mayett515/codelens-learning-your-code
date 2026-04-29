import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSize, spacing } from '@/src/ui/theme';
import {
  buildSandboxPromptContract,
  findLayerForLine,
  getPrimaryInspectorTarget,
  makeSandboxAssistantMessage,
  makeSandboxUserMessage,
  requestSandboxModelOutput,
  resolveInspectorTarget,
  sandboxMessages,
} from '@/src/features/sandbox-chat-engine';
import type {
  SandboxChatMessage,
  SandboxCodeArtifact,
  SandboxInspectorTarget,
  SandboxModelOutput,
  SandboxRequestMode,
  SandboxTerm,
} from '@/src/features/sandbox-chat-engine';

export function SandboxChatEngineScreen() {
  const assistantOutput = sandboxMessages.find((message) => message.parsed)
    ?.parsed;
  const assistantMessageId = sandboxMessages.find((message) => message.parsed)
    ?.id;
  const [messages, setMessages] = useState<SandboxChatMessage[]>(sandboxMessages);
  const [selectedOutput, setSelectedOutput] = useState<SandboxModelOutput | null>(
    assistantOutput ?? null,
  );
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    assistantMessageId ?? null,
  );
  const [target, setTarget] = useState<SandboxInspectorTarget | null>(
    assistantOutput ? getPrimaryInspectorTarget(assistantOutput) : null,
  );
  const [prompt, setPrompt] = useState(
    'Review this MCP schema-compressor skeleton for runtime bugs, cache risks, and lossy compression problems.',
  );
  const [mode, setMode] = useState<SandboxRequestMode>('local-contract');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [visualizeKeywords, setVisualizeKeywords] = useState(true);

  const inspector = useMemo(() => {
    if (!selectedOutput || !target) {
      return null;
    }
    return resolveInspectorTarget(selectedOutput, target);
  }, [selectedOutput, target]);

  async function handleSend() {
    const trimmed = prompt.trim();
    if (!trimmed || sending) {
      return;
    }

    setSending(true);
    setError('');

    const userMessage = makeSandboxUserMessage(trimmed);
    setMessages((current) => [...current, userMessage]);

    try {
      const response = await requestSandboxModelOutput({ prompt: trimmed, mode });
      const assistantMessage = makeSandboxAssistantMessage(response);
      setMessages((current) => [...current, assistantMessage]);
      setSelectedOutput(response.parsed);
      setSelectedMessageId(assistantMessage.id);
      setTarget(getPrimaryInspectorTarget(response.parsed));
      setPrompt('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sandbox request failed');
    } finally {
      setSending(false);
    }
  }

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
          <View style={styles.sectionHeaderRow}>
            <SectionTitle label="Chat" />
            <Pressable
              style={[
                styles.keywordToggle,
                visualizeKeywords && styles.keywordToggleActive,
              ]}
              onPress={() => setVisualizeKeywords((value) => !value)}
            >
              <Text
                style={[
                  styles.keywordToggleText,
                  visualizeKeywords && styles.activeText,
                ]}
              >
                Visualize keywords
              </Text>
            </Pressable>
          </View>
          {messages.map((message) => (
            <ChatMessageBubble
              key={message.id}
              message={message}
              selected={selectedMessageId === message.id}
              visualizeKeywords={visualizeKeywords}
              onOpenOutput={(output) => {
                setSelectedOutput(output);
                setSelectedMessageId(message.id);
                setTarget(getPrimaryInspectorTarget(output));
              }}
              onTermPress={(id, output) => {
                setSelectedOutput(output);
                setSelectedMessageId(message.id);
                setTarget({ type: 'term', id });
              }}
            />
          ))}
          <View style={styles.composer}>
            <View style={styles.modeRow}>
              <ModeButton
                active={mode === 'local-contract'}
                label="Local"
                onPress={() => setMode('local-contract')}
              />
              <ModeButton
                active={mode === 'configured-model'}
                label="Model"
                onPress={() => setMode('configured-model')}
              />
            </View>
            <TextInput
              value={prompt}
              onChangeText={setPrompt}
              multiline
              placeholder="Ask the sandbox chat engine to generate inspectable output..."
              placeholderTextColor={colors.textSecondary}
              style={styles.promptInput}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Pressable
              style={[styles.sendButton, sending && styles.disabledButton]}
              onPress={handleSend}
              disabled={sending}
            >
              <Text style={styles.sendButtonText}>
                {sending ? 'Sending...' : 'Send'}
              </Text>
            </Pressable>
          </View>
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

          {selectedOutput && selectedOutput.diagnostics.length > 0 ? (
            <>
              <SectionTitle label="Contract Diagnostics" />
              <View style={styles.diagnosticList}>
                {selectedOutput.diagnostics.map((item) => (
                  <View
                    key={item.id}
                    style={[
                      styles.diagnosticCard,
                      item.level === 'error' && styles.errorDiagnosticCard,
                    ]}
                  >
                    <Text
                      style={[
                        styles.diagnosticLevel,
                        item.level === 'error' && styles.errorText,
                      ]}
                    >
                      {item.level}
                    </Text>
                    <Text style={styles.diagnosticTitle}>{item.title}</Text>
                    <Text style={styles.diagnosticDetail}>{item.detail}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          <SectionTitle label="Prompt Contract" />
          <Text style={styles.contractText}>{buildSandboxPromptContract()}</Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function ChatMessageBubble({
  message,
  selected,
  visualizeKeywords,
  onOpenOutput,
  onTermPress,
}: {
  message: SandboxChatMessage;
  selected: boolean;
  visualizeKeywords: boolean;
  onOpenOutput: (output: SandboxModelOutput) => void;
  onTermPress: (id: string, output: SandboxModelOutput) => void;
}) {
  const output = message.parsed;
  const isAssistant = message.role === 'assistant';

  return (
    <View
      style={[
        styles.message,
        isAssistant ? styles.assistantMessage : styles.userMessage,
        selected && styles.selectedMessage,
      ]}
    >
      <View style={styles.messageHeaderRow}>
        <Text style={styles.messageRole}>
          {isAssistant ? 'Assistant' : 'You'}
        </Text>
        {output ? (
          <Pressable
            style={[styles.openReviewButton, selected && styles.openReviewButtonActive]}
            onPress={() => onOpenOutput(output)}
          >
            <Text style={styles.openReviewButtonText}>
              {selected ? 'Active review' : 'Open review'}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <MessageContent
        text={output ? output.prose : message.content}
        terms={visualizeKeywords && output ? output.terms : []}
        onTermPress={(id) => {
          if (output) {
            onTermPress(id, output);
          }
        }}
      />
      {message.timing ? <TimingBadge timing={message.timing} /> : null}
      {visualizeKeywords && output && output.terms.length > 0 && (
        <View style={styles.termRow}>
          {output.terms.map((term) => (
            <Pressable
              key={term.id}
              style={styles.termBrick}
              onPress={() => onTermPress(term.id, output)}
            >
              <Text style={styles.termCategoryText}>{term.category}</Text>
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
        <Text style={styles.inspectorMeta}>Term / {value.category}</Text>
        <Text style={styles.inspectorTitle}>{value.label}</Text>
        <Text style={styles.inspectorSummary}>{value.summary}</Text>
        <Text style={styles.inspectorBody}>{value.detail}</Text>
        {value.relatedTermIds.length > 0 ? (
          <Text style={styles.relatedTerms}>
            related: {value.relatedTermIds.join(', ')}
          </Text>
        ) : null}
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

function TimingBadge({
  timing,
}: {
  timing: NonNullable<SandboxChatMessage['timing']>;
}) {
  const parts = [
    `${formatMs(timing.totalMs)} total`,
    timing.firstCallMs != null ? `${formatMs(timing.firstCallMs)} first` : null,
    timing.repairCallMs != null ? `${formatMs(timing.repairCallMs)} repair` : null,
    timing.repaired ? 'repaired' : null,
  ].filter(Boolean);

  return (
    <Text style={styles.timingBadge}>
      {parts.join(' / ')}
    </Text>
  );
}

function formatMs(ms: number): string {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }

  return `${ms}ms`;
}

function MessageContent({
  text,
  terms,
  onTermPress,
}: {
  text: string;
  terms: SandboxTerm[];
  onTermPress: (id: string) => void;
}) {
  const segments = splitCodeFences(text);

  return (
    <View style={styles.messageContent}>
      {segments.map((segment, index) => {
        if (segment.kind === 'code') {
          return (
            <View key={`code-${index}`} style={styles.inlineCodeBlock}>
              {segment.language ? (
                <Text style={styles.inlineCodeLanguage}>{segment.language}</Text>
              ) : null}
              <Text style={styles.inlineCodeText}>{segment.value}</Text>
            </View>
          );
        }

        return (
          <Text key={`text-${index}`} style={styles.messageText}>
            {renderTextWithTerms(segment.value, terms, onTermPress)}
          </Text>
        );
      })}
    </View>
  );
}

function splitCodeFences(
  text: string,
): Array<
  | { kind: 'text'; value: string }
  | { kind: 'code'; language: string; value: string }
> {
  const segments: Array<
    | { kind: 'text'; value: string }
    | { kind: 'code'; language: string; value: string }
  > = [];
  const fence = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = fence.exec(text)) !== null) {
    if (match.index > cursor) {
      segments.push({ kind: 'text', value: text.slice(cursor, match.index) });
    }
    segments.push({
      kind: 'code',
      language: match[1] ?? '',
      value: (match[2] ?? '').trimEnd(),
    });
    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) {
    segments.push({ kind: 'text', value: text.slice(cursor) });
  }

  return segments.length > 0 ? segments : [{ kind: 'text', value: text }];
}

function ModeButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.modeButton, active && styles.activeModeButton]}
      onPress={onPress}
    >
      <Text style={[styles.modeButtonText, active && styles.activeText]}>
        {label}
      </Text>
    </Pressable>
  );
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
  sectionHeaderRow: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  keywordToggle: {
    minHeight: 32,
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
  },
  keywordToggleActive: {
    borderColor: 'rgba(229, 192, 123, 0.45)',
    backgroundColor: 'rgba(229, 192, 123, 0.1)',
  },
  keywordToggleText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '700',
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
  selectedMessage: {
    borderColor: colors.primary,
  },
  messageHeaderRow: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  messageRole: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  openReviewButton: {
    minHeight: 28,
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceLight,
  },
  openReviewButtonActive: {
    borderColor: colors.primary,
    backgroundColor: '#20395f',
  },
  openReviewButtonText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  messageText: {
    color: colors.text,
    fontSize: fontSize.md,
    lineHeight: 21,
  },
  messageContent: {
    gap: spacing.sm,
  },
  inlineCodeBlock: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#30384a',
    backgroundColor: '#080b12',
    padding: spacing.md,
  },
  inlineCodeLanguage: {
    color: colors.blue,
    fontSize: fontSize.sm,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  inlineCodeText: {
    color: colors.text,
    fontSize: fontSize.sm,
    lineHeight: 19,
    fontFamily: 'monospace',
  },
  timingBadge: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  composer: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modeButton: {
    minHeight: 32,
    justifyContent: 'center',
    borderRadius: 6,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceLight,
  },
  activeModeButton: {
    backgroundColor: '#20395f',
  },
  modeButtonText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  promptInput: {
    minHeight: 92,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: fontSize.md,
    lineHeight: 21,
    padding: spacing.sm,
    textAlignVertical: 'top',
  },
  sendButton: {
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  disabledButton: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  errorText: {
    color: colors.red,
    fontSize: fontSize.sm,
    lineHeight: 18,
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
    minHeight: 42,
    justifyContent: 'center',
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(229, 192, 123, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(229, 192, 123, 0.35)',
  },
  termCategoryText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
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
  relatedTerms: {
    color: colors.blue,
    fontSize: fontSize.sm,
    lineHeight: 18,
    marginTop: spacing.md,
  },
  lineRange: {
    color: colors.blue,
    fontSize: fontSize.sm,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  diagnosticList: {
    gap: spacing.sm,
  },
  diagnosticCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(229, 192, 123, 0.35)',
    backgroundColor: 'rgba(229, 192, 123, 0.08)',
    padding: spacing.md,
  },
  errorDiagnosticCard: {
    borderColor: 'rgba(224, 108, 117, 0.45)',
    backgroundColor: 'rgba(224, 108, 117, 0.08)',
  },
  diagnosticLevel: {
    color: colors.yellow,
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  diagnosticTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  diagnosticDetail: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 18,
    marginTop: spacing.xs,
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
