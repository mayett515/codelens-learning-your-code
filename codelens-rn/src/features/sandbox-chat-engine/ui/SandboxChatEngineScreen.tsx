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
  SandboxCodeLayer,
  SandboxInspectorTarget,
  SandboxModelOutput,
  SandboxRequestMode,
  SandboxTerm,
  SandboxTermCategory,
  SandboxCalculation,
  SandboxFinding,
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
                <Text style={styles.calcKindBadge}>{calculation.kind}</Text>
                <Text style={styles.calcLabel}>{calculation.title}</Text>
                <Text style={styles.calcExpression}>
                  {calculation.steps.length} steps
                </Text>
                <Text style={styles.calcResult} numberOfLines={2}>
                  {calculation.conclusion}
                </Text>
              </Pressable>
            ))}
          </View>

          <SectionTitle label="Findings" />
          <View style={styles.findingList}>
            {selectedOutput?.findings.map((finding) => (
              <Pressable
                key={finding.id}
                style={[
                  styles.findingCard,
                  target?.type === 'finding' &&
                    target.id === finding.id &&
                    styles.activeCard,
                ]}
                onPress={() =>
                  setTarget({ type: 'finding', id: finding.id })
                }
              >
                <View style={styles.findingHeaderRow}>
                  <Text
                    style={[
                      styles.findingSeverity,
                      { color: severityColor(finding.severity) },
                    ]}
                  >
                    {finding.severity}
                  </Text>
                  <Text style={styles.findingCategory}>{finding.category}</Text>
                </View>
                <Text style={styles.findingTitle}>{finding.title}</Text>
                <Text style={styles.findingDescription} numberOfLines={3}>
                  {finding.description}
                </Text>
                {finding.lineStart != null && finding.lineEnd != null ? (
                  <Text style={styles.findingLineRange}>
                    lines {finding.lineStart}-{finding.lineEnd}
                  </Text>
                ) : null}
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
              style={[
                styles.termBrick,
                { borderColor: termCategoryColor(term.category, 0.35), backgroundColor: termCategoryColor(term.category, 0.12) },
              ]}
              onPress={() => onTermPress(term.id, output)}
            >
              <Text style={[styles.termCategoryText, { color: termCategoryColor(term.category, 1) }]}>
                {term.category}
              </Text>
              <Text style={[styles.termBrickText, { color: termCategoryColor(term.category, 1) }]}>
                {term.label}
              </Text>
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

  if (isTerm(value)) {
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
        {'promptHook' in value && value.promptHook ? (
          <Text style={styles.promptHook}>{value.promptHook}</Text>
        ) : null}
      </View>
    );
  }

  if (isCalculation(value)) {
    return (
      <View style={styles.inspectorCard}>
        <Text style={styles.inspectorMeta}>Calculation / {value.kind}</Text>
        <Text style={styles.inspectorTitle}>{value.title}</Text>
        <View style={styles.stepList}>
          {value.steps.map((step, idx) => (
            <View key={idx} style={styles.stepRow}>
              <Text style={styles.stepLabel}>{step.label}</Text>
              <Text style={styles.stepValue}>
                {step.value} {step.unit}
              </Text>
              {step.note ? <Text style={styles.stepNote}>{step.note}</Text> : null}
            </View>
          ))}
        </View>
        <Text style={styles.inspectorBody}>{value.conclusion}</Text>
      </View>
    );
  }

  if (isFinding(value)) {
    return (
      <View style={styles.inspectorCard}>
        <View style={styles.findingBadgeRow}>
          <Text style={[styles.findingSeverityBadge, { color: severityColor(value.severity) }]}>
            {value.severity}
          </Text>
          <Text style={styles.findingCategoryBadge}>{value.category}</Text>
        </View>
        <Text style={styles.inspectorTitle}>{value.title}</Text>
        <Text style={styles.inspectorBody}>{value.description}</Text>
        {value.lineStart != null && value.lineEnd != null ? (
          <Text style={styles.lineRange}>
            lines {value.lineStart}-{value.lineEnd}
          </Text>
        ) : null}
        {value.suggestedFix ? (
          <Text style={styles.suggestedFix}>Fix: {value.suggestedFix}</Text>
        ) : null}
      </View>
    );
  }

  if (isLayer(value)) {
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

  return (
    <View style={styles.inspectorCard}>
      <Text style={styles.inspectorTitle}>Unknown inspector target</Text>
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
  const segments = useMemo(() => splitCodeFences(text), [text]);

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
            {renderTextWithTerms(segment.value, segment.textStart, terms, onTermPress)}
          </Text>
        );
      })}
    </View>
  );
}

type CodeFenceSegment =
  | { kind: 'text'; value: string; textStart: number }
  | { kind: 'code'; language: string; value: string };

function splitCodeFences(text: string): CodeFenceSegment[] {
  const segments: CodeFenceSegment[] = [];
  const fence = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = fence.exec(text)) !== null) {
    if (match.index > cursor) {
      segments.push({
        kind: 'text',
        value: text.slice(cursor, match.index),
        textStart: cursor,
      });
    }
    segments.push({
      kind: 'code',
      language: match[1] ?? '',
      value: (match[2] ?? '').trimEnd(),
    });
    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) {
    segments.push({
      kind: 'text',
      value: text.slice(cursor),
      textStart: cursor,
    });
  }

  return segments.length > 0 ? segments : [{ kind: 'text', value: text, textStart: 0 }];
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
  textStart: number,
  terms: SandboxTerm[],
  onTermPress: (id: string) => void,
) {
  if (terms.length === 0) {
    return text;
  }

  const segmentEnd = textStart + text.length;

  // Collect spans that overlap this text segment, clip to segment bounds
  const relevantSpans = terms
    .flatMap((term) =>
      term.spans
        .filter((span) => {
          const spanStart = span.proseOffset;
          const spanEnd = span.proseOffset + span.length;
          return (
            Number.isFinite(span.proseOffset) &&
            span.proseOffset >= 0 &&
            Number.isFinite(span.length) &&
            span.length > 0 &&
            spanStart < segmentEnd &&
            spanEnd > textStart
          );
        })
        .map((span) => {
          const clippedStart = Math.max(span.proseOffset, textStart);
          const clippedEnd = Math.min(span.proseOffset + span.length, segmentEnd);
          return {
            start: clippedStart - textStart,
            end: clippedEnd - textStart,
            term,
          };
        }),
    )
    .sort((a, b) => a.start - b.start);

  // Remove overlaps: keep the first span when two overlap
  const filteredSpans: typeof relevantSpans = [];
  let lastEnd = -1;
  for (const span of relevantSpans) {
    if (span.start >= lastEnd) {
      filteredSpans.push(span);
      lastEnd = span.end;
    }
  }

  if (filteredSpans.length === 0) {
    return text;
  }

  const result: React.ReactNode[] = [];
  let cursor = 0;
  for (const span of filteredSpans) {
    if (span.start > cursor) {
      result.push(text.slice(cursor, span.start));
    }
    result.push(
      <Text
        key={`${span.term.id}-${span.start}`}
        style={{
          color: termCategoryColor(span.term.category, 1),
          fontWeight: '700',
          backgroundColor: termCategoryColor(span.term.category, 0.12),
        }}
        onPress={() => onTermPress(span.term.id)}
      >
        {text.slice(span.start, span.end)}
      </Text>,
    );
    cursor = span.end;
  }
  if (cursor < text.length) {
    result.push(text.slice(cursor));
  }

  return result;
}

// Type guards for inspector content
function isTerm(value: unknown): value is SandboxTerm {
  return (
    value != null &&
    typeof (value as SandboxTerm).label === 'string' &&
    Array.isArray((value as SandboxTerm).spans)
  );
}

function isCalculation(value: unknown): value is SandboxCalculation {
  return (
    value != null &&
    Array.isArray((value as SandboxCalculation).steps)
  );
}

function isFinding(value: unknown): value is SandboxFinding {
  return (
    value != null &&
    typeof (value as SandboxFinding).severity === 'string'
  );
}

function isLayer(value: unknown): value is SandboxCodeLayer {
  return (
    value != null &&
    typeof (value as SandboxCodeLayer).lineStart === 'number' &&
    typeof (value as SandboxCodeLayer).lineEnd === 'number' &&
    !isFinding(value)
  );
}

function termCategoryColor(category: SandboxTermCategory, alpha: number): string {
  const base: Record<SandboxTermCategory, string> = {
    risk: colors.red,
    concept: colors.blue,
    api: colors.green,
    data: colors.purple,
    performance: colors.orange,
    test: colors.teal,
  };
  const hex = base[category] ?? colors.yellow;
  if (alpha >= 1) return hex;
  // Convert hex to rgba
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function severityColor(severity: SandboxFinding['severity']): string {
  switch (severity) {
    case 'critical':
      return colors.red;
    case 'high':
      return colors.red;
    case 'medium':
      return colors.orange;
    case 'low':
      return colors.yellow;
    case 'info':
      return colors.blue;
    default:
      return colors.textSecondary;
  }
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
    borderWidth: 1,
  },
  termCategoryText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  termBrickText: {
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
  calcKindBadge: {
    color: colors.primaryLight,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
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
  findingList: {
    gap: spacing.sm,
  },
  findingCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  findingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  findingSeverity: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  findingCategory: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  findingTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  findingDescription: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  findingLineRange: {
    color: colors.blue,
    fontSize: fontSize.sm,
    fontWeight: '700',
    marginTop: spacing.sm,
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
  stepList: {
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  stepRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  stepValue: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  stepNote: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontStyle: 'italic',
  },
  findingBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  findingSeverityBadge: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  findingCategoryBadge: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  suggestedFix: {
    color: colors.green,
    fontSize: fontSize.sm,
    lineHeight: 18,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: 6,
    backgroundColor: 'rgba(152, 195, 121, 0.1)',
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
