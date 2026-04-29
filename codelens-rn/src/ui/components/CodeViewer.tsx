import React, { useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  FlatList,
  ListRenderItemInfo,
} from 'react-native';
import { colors, fontSize, spacing } from '../theme';
import { highlightLine, type HighlightedToken } from '../../features/codeReader/highlighting/highlightLine';
import { PLAIN_TOKEN_COLOR } from '../../features/codeReader/highlighting/vscodeDarkPlusPalette';
import { SelectionStartIndicator } from '../../features/codeReader/ui/SelectionStartIndicator';
import type { LineMarkInfo } from '@/src/domain/marker';
import type {
  LineMark,
  RangeMark,
  MarkColor,
  CodeInteractionMode,
} from '@/src/domain/types';

const MARK_COLORS: Record<MarkColor, string> = {
  red: colors.red,
  green: colors.green,
  yellow: colors.yellow,
  blue: colors.blue,
  purple: colors.purple,
};

function parseHex(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function markBgColor(info: LineMarkInfo): string {
  const base = MARK_COLORS[info.color];
  const [r, g, b] = parseHex(base);

  if (info.isOverlap || info.isDirectMark) {
    const alpha = Math.min(0.45 + info.depth * 0.15, 0.85);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const isOdd = info.rangeIndex % 2 === 1;
  const baseAlpha = isOdd ? 0.18 : 0.28;
  const alpha = Math.min(baseAlpha + info.depth * 0.15, 0.75);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface CodeLineProps {
  lineNum: number;
  text: string;
  language: string | null;
  markInfo: LineMarkInfo | null;
  isSelectionStart: boolean;
  onPress: (lineNum: number) => void;
  onLongPress: (lineNum: number) => void;
}

const CodeLine = memo(({ lineNum, text, language, markInfo, isSelectionStart, onPress, onLongPress }: CodeLineProps) => {
  const bgStyle = markInfo
    ? { backgroundColor: markBgColor(markInfo) }
    : undefined;

  const tokens: HighlightedToken[] | null = useMemo(() => {
    if (!language) return null;
    const result = highlightLine(text, language);
    if (result.length === 0) return null;
    if (result.length === 1 && result[0]?.color === PLAIN_TOKEN_COLOR) return null;
    return result;
  }, [text, language]);

  return (
    <Pressable
      onPress={() => onPress(lineNum)}
      onLongPress={() => onLongPress(lineNum)}
      style={[styles.line, bgStyle]}
    >
      <SelectionStartIndicator visible={isSelectionStart} />
      <Text style={styles.lineNumber}>{lineNum}</Text>
      {tokens ? (
        <Text style={styles.lineText} selectable>
          {tokens.map((token, idx) => (
            <Text key={idx} style={{ color: token.color }}>{token.text}</Text>
          ))}
        </Text>
      ) : (
        <Text style={styles.lineText} selectable>{text || ' '}</Text>
      )}
      {markInfo && markInfo.isDirectMark && markInfo.isOverlap ? (
        <View style={[styles.chatIndicator, { backgroundColor: MARK_COLORS[markInfo.color] }]} />
      ) : markInfo && markInfo.depth > 0 ? (
        <View style={[styles.depthIndicator, { backgroundColor: MARK_COLORS[markInfo.color] }]} />
      ) : null}
    </Pressable>
  );
});

interface Props {
  content: string;
  marks: LineMark[];
  ranges: RangeMark[];
  mode: CodeInteractionMode;
  onLinePress: (line: number) => void;
  onLineLongPress: (line: number) => void;
  language?: string | null | undefined;
  selectionStartLine?: number | null | undefined;
}

export function CodeViewer({
  content,
  marks,
  ranges,
  mode,
  onLinePress,
  onLineLongPress,
  language,
  selectionStartLine,
}: Props) {
  const lines = useMemo(() => content.split('\n'), [content]);
  const resolvedLanguage = language ?? null;

  const markMap = useMemo(() => {
    const map = new Map<number, LineMarkInfo>();

    const directByLine = new Map<number, LineMark>();
    for (const m of marks) directByLine.set(m.line, m);

    const rangeIndexCache = new Map<MarkColor, Map<RangeMark, number>>();
    for (const r of ranges) {
      let colorMap = rangeIndexCache.get(r.color);
      if (!colorMap) {
        const sorted = ranges
          .filter((x) => x.color === r.color)
          .sort((a, b) => a.startLine - b.startLine);
        colorMap = new Map<RangeMark, number>();
        for (let i = 0; i < sorted.length; i++) colorMap.set(sorted[i], i);
        rangeIndexCache.set(r.color, colorMap);
      }
    }

    for (const r of ranges) {
      const idx = rangeIndexCache.get(r.color)!.get(r)!;
      for (let line = r.startLine; line <= r.endLine; line++) {
        if (map.has(line)) continue;
        const direct = directByLine.get(line);
        if (direct) {
          map.set(line, {
            color: direct.color,
            depth: direct.depth,
            isDirectMark: true,
            isOverlap: true,
            rangeIndex: idx,
          });
        } else {
          map.set(line, {
            color: r.color,
            depth: r.depth,
            isDirectMark: false,
            isOverlap: false,
            rangeIndex: idx,
          });
        }
      }
    }

    for (const m of marks) {
      if (!map.has(m.line)) {
        map.set(m.line, {
          color: m.color,
          depth: m.depth,
          isDirectMark: true,
          isOverlap: false,
          rangeIndex: -1,
        });
      }
    }

    return map;
  }, [marks, ranges]);

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<string>) => {
      const lineNum = index + 1;
      return (
        <CodeLine
          lineNum={lineNum}
          text={item}
          language={resolvedLanguage}
          markInfo={markMap.get(lineNum) || null}
          isSelectionStart={selectionStartLine === lineNum}
          onPress={onLinePress}
          onLongPress={onLineLongPress}
        />
      );
    },
    [markMap, onLinePress, onLineLongPress, resolvedLanguage, selectionStartLine],
  );

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalContent}
      >
        <FlatList
          data={lines}
          keyExtractor={(_, index) => String(index)}
          renderItem={renderItem}
          initialNumToRender={50}
          maxToRenderPerBatch={50}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          contentContainerStyle={styles.codeBlock}
          showsVerticalScrollIndicator
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  horizontalContent: {
    minWidth: '100%',
  },
  codeBlock: {
    paddingVertical: spacing.xs,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.sm,
    minHeight: 22,
  },
  lineNumber: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    width: 40,
    textAlign: 'right',
    marginRight: spacing.sm,
    opacity: 0.5,
  },
  lineText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    flex: 1,
  },
  depthIndicator: {
    width: 3,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 1,
  },
  chatIndicator: {
    width: 4,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 2,
    opacity: 0.9,
  },
});
