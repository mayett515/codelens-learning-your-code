import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { colors, fontSize, spacing } from '@/src/ui/theme';
import { getProjectById } from '@/src/db/queries/projects';
import { projectKeys } from '@/src/hooks/query-keys';
import { BookmarkListScreen, type Bookmark } from '@/src/features/bookmarks';
import type { ProjectId } from '@/src/domain/types';

export default function BookmarkListRoute() {
  const { projectId: rawProjectId } = useLocalSearchParams<{ projectId: string }>();
  const projectId = typeof rawProjectId === 'string' && rawProjectId.length > 0
    ? rawProjectId as ProjectId
    : null;

  const { data: project } = useQuery({
    queryKey: projectId ? projectKeys.detail(projectId) : projectKeys.all,
    queryFn: () => (projectId ? getProjectById(projectId) : null),
    enabled: projectId !== null,
  });

  const handleSelectBookmark = useCallback(
    (_bookmark: Bookmark) => {
      if (projectId === null) return;
      // TODO(stage8.5-followup): deep-link to bookmark.filePath at bookmark.startLine.
      // Today the project viewer route only accepts ?id=, so we land on the project's
      // most-recent file. Adding optional fileId/line params + scroll-to-line in
      // CodeViewer is its own slice.
      router.push(`/project/${projectId}`);
    },
    [projectId],
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backBtn}>{'<'}</Text>
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Bookmarks</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {project?.name ?? 'Project'}
          </Text>
        </View>
      </View>

      {projectId !== null ? (
        <BookmarkListScreen
          projectId={projectId}
          onSelectBookmark={handleSelectBookmark}
        />
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Missing project.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  backBtn: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
});
