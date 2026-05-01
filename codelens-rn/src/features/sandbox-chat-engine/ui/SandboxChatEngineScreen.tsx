import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { buildSandboxPromptContract, resolveInspectorTarget, getPrimaryInspectorTarget } from '../engine';
import { useSandboxChat, canSendModelRequest } from '../useSandboxChat';
import { ChatMessageBubble } from './ChatMessageBubble';
import { CodeArtifactCard } from './CodeArtifactCard';
import { InspectorContent } from './InspectorContent';
import { ModelStatusPanel } from './ModelStatusPanel';
import { colors, fontSize, spacing } from '@/src/ui/theme';

export function SandboxChatEngineScreen() {
  const chat = useSandboxChat();
  const [visualizeKeywords, setVisualizeKeywords] = useState(true);

  const inspector = useMemo(() => {
    if (!chat.selectedOutput || !chat.target) return null;
    return resolveInspectorTarget(chat.selectedOutput, chat.target);
  }, [chat.selectedOutput, chat.target]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>sandboxtexttesting</Text>
          <Text style={styles.title}>Chat Engine Lab</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.clearButton} onPress={chat.handleClear}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </Pressable>
          <View style={styles.contractPill}>
            <Text style={styles.contractPillText}>Expo web</Text>
          </View>
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
              onPress={() => setVisualizeKeywords(!visualizeKeywords)}
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
          {chat.messages.map((message) => (
            <ChatMessageBubble
              key={message.id}
              message={message}
              selected={chat.selectedMessageId === message.id}
              visualizeKeywords={visualizeKeywords}
              onOpenOutput={(output) => {
                chat.setSelectedOutput(output);
                chat.setSelectedMessageId(message.id);
                chat.setTarget(getPrimaryInspectorTarget(output));
              }}
              onTermPress={(id, output) => {
                chat.setSelectedOutput(output);
                chat.setSelectedMessageId(message.id);
                chat.setTarget({ type: 'term', id });
              }}
            />
          ))}
          <View style={styles.composer}>
            <View style={styles.modeRow}>
              <ModeButton
                active={chat.mode === 'local-contract'}
                label="Local"
                onPress={() => chat.setMode('local-contract')}
              />
              <ModeButton
                active={chat.mode === 'configured-model'}
                label="Model"
                onPress={() => chat.setMode('configured-model')}
              />
            </View>
            {chat.mode === 'configured-model' ? (
              <ModelStatusPanel
                status={chat.modelStatus}
                sending={chat.sending}
                onRefresh={chat.refreshModelStatus}
              />
            ) : null}
            <TextInput
              value={chat.prompt}
              onChangeText={chat.setPrompt}
              multiline
              placeholder="Ask the sandbox chat engine to generate inspectable output..."
              placeholderTextColor={colors.textSecondary}
              style={styles.promptInput}
            />
            {chat.error ? <Text style={styles.errorText}>{chat.error}</Text> : null}
            {chat.requestStatus ? (
              <Text style={styles.requestStatus}>{chat.requestStatus}</Text>
            ) : null}
            <View style={styles.sendRow}>
              <Pressable
                style={[
                  styles.sendButton,
                  (chat.sending || !canSendModelRequest(chat.mode, chat.modelStatus)) &&
                    styles.disabledButton,
                ]}
                onPress={() => chat.handleSend()}
                disabled={chat.sending || !canSendModelRequest(chat.mode, chat.modelStatus)}
              >
                <Text style={styles.sendButtonText}>
                  {chat.sending ? 'Sending...' : 'Send'}
                </Text>
              </Pressable>
              {chat.sending && chat.mode === 'configured-model' ? (
                <Pressable style={styles.cancelButton} onPress={chat.handleCancel}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </ScrollView>

        <ScrollView style={styles.codePane} contentContainerStyle={styles.paneContent}>
          <SectionTitle label="Code Under The Hood" />
          {chat.selectedOutput?.codeArtifacts.map((artifact) => (
            <CodeArtifactCard
              key={artifact.id}
              artifact={artifact}
              target={chat.target}
              onLayerPress={(layerId) =>
                chat.setTarget({ type: 'layer', artifactId: artifact.id, layerId })
              }
            />
          ))}

          <SectionTitle label="Calculations" />
          <View style={styles.calcGrid}>
            {chat.selectedOutput?.calculations.map((calculation) => (
              <Pressable
                key={calculation.id}
                style={[
                  styles.calcCard,
                  chat.target?.type === 'calculation' &&
                    chat.target.id === calculation.id &&
                    styles.activeCard,
                ]}
                onPress={() =>
                  chat.setTarget({ type: 'calculation', id: calculation.id })
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
            {chat.selectedOutput?.findings.map((finding) => (
              <Pressable
                key={finding.id}
                style={[
                  styles.findingCard,
                  chat.target?.type === 'finding' &&
                    chat.target.id === finding.id &&
                    styles.activeCard,
                ]}
                onPress={() =>
                  chat.setTarget({ type: 'finding', id: finding.id })
                }
              >
                <View style={styles.findingHeaderRow}>
                  <Text
                    style={[
                      styles.findingSeverity,
                      { color: severityColorSys(finding.severity) },
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

          {chat.selectedOutput && chat.selectedOutput.diagnostics.length > 0 ? (
            <>
              <SectionTitle label="Contract Diagnostics" />
              <View style={styles.diagnosticList}>
                {chat.selectedOutput.diagnostics.map((item) => (
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

function SectionTitle({ label }: { label: string }) {
  return <Text style={styles.sectionTitle}>{label}</Text>;
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

function severityColorSys(severity: 'critical' | 'high' | 'medium' | 'low' | 'info'): string {
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
  clearButton: {
    minHeight: 28,
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceLight,
  },
  clearButtonText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
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
    flex: 1,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  sendRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelButton: {
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(224, 108, 117, 0.45)',
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(224, 108, 117, 0.12)',
  },
  cancelButtonText: {
    color: colors.red,
    fontSize: fontSize.md,
    fontWeight: '700',
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
  requestStatus: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  activeText: {
    color: colors.text,
  },
  activeCard: {
    borderColor: colors.primary,
    backgroundColor: '#182237',
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
