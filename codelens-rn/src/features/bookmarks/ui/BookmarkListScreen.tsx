import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, fontSize, spacing } from '../../../ui/theme';
import { useBookmarks } from '../hooks/useBookmarks';
import { useBookmarkPalette } from '../hooks/useBookmarkPalette';
import { FALLBACK_BOOKMARK_COLOR } from '../data/defaultPalette';
import { formatRelativeTime } from '../lib/formatRelativeTime';
import type { Bookmark, MarkColor } from '../types/bookmark';

export interface BookmarkListScreenProps {
  projectId: string;
  onSelectBookmark: (bookmark: Bookmark) => void;
}

export function BookmarkListScreen({ projectId, onSelectBookmark }: BookmarkListScreenProps) {
  const [activeColorKey, setActiveColorKey] = useState<string | null>(null);

  const filter = useMemo(
    () => activeColorKey
      ? { projectId, colorKey: activeColorKey }
      : { projectId },
    [activeColorKey, projectId],
  );

  const { data: bookmarks = [], isError, isLoading } = useBookmarks(filter);
  const { data: palette = [] } = useBookmarkPalette(projectId);

  const colorByKey = useMemo(() => {
    const map = new Map<string, MarkColor>();
    for (const color of palette) map.set(color.key, color);
    return map;
  }, [palette]);

  useEffect(() => {
    if (activeColorKey && !colorByKey.has(activeColorKey)) {
      setActiveColorKey(null);
    }
  }, [activeColorKey, colorByKey]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Could not load bookmarks.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ColorFilterRow
        palette={palette}
        activeColorKey={activeColorKey}
        onSelect={setActiveColorKey}
      />

      {bookmarks.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            {activeColorKey
              ? 'No bookmarks with that color'
              : 'No bookmarks yet. Tap a code line to bookmark it.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={bookmarks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <BookmarkRow
              bookmark={item}
              color={colorByKey.get(item.colorKey)}
              onPress={() => onSelectBookmark(item)}
            />
          )}
        />
      )}
    </View>
  );
}

interface ColorFilterRowProps {
  palette: MarkColor[];
  activeColorKey: string | null;
  onSelect: (key: string | null) => void;
}

function ColorFilterRow({ palette, activeColorKey, onSelect }: ColorFilterRowProps) {
  if (palette.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filterRow}
      contentContainerStyle={styles.filterRowContent}
    >
      <Pressable
        style={[styles.filterChip, activeColorKey === null && styles.filterChipActive]}
        onPress={() => onSelect(null)}
        accessibilityRole="button"
        accessibilityLabel="All bookmarks"
      >
        <Text
          style={[styles.filterChipText, activeColorKey === null && styles.filterChipTextActive]}
        >
          All
        </Text>
      </Pressable>
      {palette.map((color) => {
        const active = activeColorKey === color.key;
        return (
          <Pressable
            key={color.key}
            style={[styles.filterChip, active && styles.filterChipActive]}
            onPress={() => onSelect(active ? null : color.key)}
            accessibilityRole="button"
            accessibilityLabel={`Filter by ${color.label}`}
          >
            <View style={[styles.filterDot, { backgroundColor: color.hex }]} />
            <Text
              style={[styles.filterChipText, active && styles.filterChipTextActive]}
              numberOfLines={1}
            >
              {color.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

interface BookmarkRowProps {
  bookmark: Bookmark;
  color: MarkColor | undefined;
  onPress: () => void;
}

function BookmarkRow({ bookmark, color, onPress }: BookmarkRowProps) {
  const fileName = bookmark.filePath.split('/').pop() ?? bookmark.filePath;
  const range = bookmark.startLine === bookmark.endLine
    ? `:${bookmark.startLine}`
    : `:${bookmark.startLine}-${bookmark.endLine}`;
  const updatedLabel = formatRelativeTime(bookmark.updatedAt);

  return (
    <Pressable style={styles.row} onPress={onPress} accessibilityRole="button">
      <View style={[styles.rowDot, { backgroundColor: color?.hex ?? FALLBACK_BOOKMARK_COLOR }]} />
      <View style={styles.rowBody}>
        <Text style={styles.rowFile} numberOfLines={1}>
          {fileName}
          <Text style={styles.rowRange}>{range}</Text>
        </Text>
        <Text style={styles.rowPath} numberOfLines={1}>
          {bookmark.filePath}
        </Text>
        {bookmark.note ? (
          <Text style={styles.rowNote} numberOfLines={2}>
            {bookmark.note}
          </Text>
        ) : null}
        <View style={styles.rowMeta}>
          {color ? <Text style={styles.rowColorLabel}>{color.label}</Text> : null}
          <Text style={styles.rowTime}>{updatedLabel}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    textAlign: 'center',
  },
  errorText: {
    color: colors.red,
    fontSize: fontSize.md,
    textAlign: 'center',
  },
  filterRow: {
    flexGrow: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  filterRowContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 32,
    paddingHorizontal: spacing.sm,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceLight,
  },
  filterDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: colors.text,
  },
  listContent: {
    paddingVertical: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  rowDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowFile: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  rowRange: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  rowPath: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  rowNote: {
    color: colors.text,
    fontSize: fontSize.sm,
    marginTop: 4,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 4,
  },
  rowColorLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  rowTime: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
});
