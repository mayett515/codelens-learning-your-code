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
import { getLineMarkInfo, type LineMarkInfo } from '@/src/domain/marker';
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
  markInfo: LineMarkInfo | null;
  onPress: (lineNum: number) => void;
  onLongPress: (lineNum: number) => void;
}

const CodeLine = memo(({ lineNum, text, markInfo, onPress, onLongPress }: CodeLineProps) => {
  const bgStyle = markInfo
    ? { backgroundColor: markBgColor(markInfo) }
    : undefined;

  return (
    <Pressable
      onPress={() => onPress(lineNum)}
      onLongPress={() => onLongPress(lineNum)}
      style={[styles.line, bgStyle]}
    >
      <Text style={styles.lineNumber}>{lineNum}</Text>
      <Text style={styles.lineText}>{text || ' '}</Text>
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
}

export function CodeViewer({
  content,
  marks,
  ranges,
  mode,
  onLinePress,
  onLineLongPress,
}: Props) {
  const lines = useMemo(() => content.split('\n'), [content]);

  const markMap = useMemo(() => {
    const map = new Map<number, LineMarkInfo>();
    for (let i = 1; i <= lines.length; i++) {
      const info = getLineMarkInfo(marks, ranges, i);
      if (info) {
        map.set(i, info);
      }
    }
    return map;
  }, [marks, ranges, lines.length]);

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<string>) => {
      const lineNum = index + 1;
      return (
        <CodeLine
          lineNum={lineNum}
          text={item}
          markInfo={markMap.get(lineNum) || null}
          onPress={onLinePress}
          onLongPress={onLineLongPress}
        />
      );
    },
    [markMap, onLinePress, onLineLongPress],
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
