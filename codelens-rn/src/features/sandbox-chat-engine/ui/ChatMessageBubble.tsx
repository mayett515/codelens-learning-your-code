import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useMemo } from 'react';
import type { SandboxChatMessage, SandboxModelOutput, SandboxTerm, SandboxTermCategory } from '../types';
import { findLayerForLine } from '../engine';
import { termCategoryColor } from '../useSandboxChat';
import { colors, fontSize, spacing } from '@/src/ui/theme';

export function ChatMessageBubble({
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
                {
                  borderColor: termCategoryColor(term.category, 0.35),
                  backgroundColor: termCategoryColor(term.category, 0.12),
                },
              ]}
              onPress={() => onTermPress(term.id, output)}
            >
              <Text style={[styles.termCategoryText, { color: termCategoryColor(term.category, 1) }]}>
                {term.category}
                {term.subcategory ? ` / ${term.subcategory}` : ''}
              </Text>
              <Text style={[styles.termBrickText, { color: termCategoryColor(term.category, 1) }]}>
                {term.label}
              </Text>
              {term.depth && (
                <Text style={styles.termDepthBadge}>{term.depth}</Text>
              )}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
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

  // Collect contract-guaranteed spans that overlap this text segment, clip to segment bounds
  const contractSpans = terms
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

  // Remove overlaps: keep the first span when two overlap.
  const filteredSpans: typeof contractSpans = [];
  let lastEnd = -1;
  for (const span of contractSpans) {
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

const styles = StyleSheet.create({
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
  termDepthBadge: {
    fontSize: 9,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
