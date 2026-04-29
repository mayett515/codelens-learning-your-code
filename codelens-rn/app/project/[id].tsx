import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { colors, fontSize, spacing } from '@/src/ui/theme';
import { getProjectById, updateProject } from '@/src/db/queries/projects';
import {
  getFilesByProject,
  getFileById,
  updateFileMarks,
} from '@/src/db/queries/files';
import { useInteractionModeStore } from '@/src/stores/interaction-mode';
import { useSelectionStore } from '@/src/stores/selection';
import { useMarkColorStore } from '@/src/stores/mark-color';
import {
  applyMark,
  eraseMark,
  applyRangeMark,
  getLineMarkColor,
  getLineMarkInfo,
} from '@/src/domain/marker';
import { CodeViewer } from '@/src/ui/components/CodeViewer';
import { inferLanguageFromPath } from '@/src/features/chat';
import { ColorPicker } from '@/src/ui/components/ColorPicker';
import { FilePickerModal } from '@/src/ui/components/FilePickerModal';
import { EraseConfirmBar } from '@/src/ui/components/EraseConfirmBar';
import { insertChat } from '@/src/db/queries/chats';
import { chatId as makeChatId } from '@/src/domain/types';
import { uid } from '@/src/lib/uid';
import { chatKeys, fileKeys, projectKeys } from '@/src/hooks/query-keys';
import type {
  ProjectId,
  FileId,
  SourceFile,
  LineMark,
  RangeMark,
} from '@/src/domain/types';

export default function ProjectViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const projectId = id as ProjectId;
  const queryClient = useQueryClient();

  const mode = useInteractionModeStore((s) => s.mode);
  const toggleMode = useInteractionModeStore((s) => s.toggleMode);
  const activeColor = useMarkColorStore((s) => s.activeColor);
  const setColor = useMarkColorStore((s) => s.setColor);

  const isRangeSelectMode = useSelectionStore((s) => s.isRangeSelectMode);
  const startLine = useSelectionStore((s) => s.startLine);
  const toggleRangeSelectMode = useSelectionStore(
    (s) => s.toggleRangeSelectMode,
  );
  const setStartLine = useSelectionStore((s) => s.setStartLine);
  const resetSelection = useSelectionStore((s) => s.reset);

  const [currentFileId, setCurrentFileId] = useState<FileId | null>(null);
  const [filePickerVisible, setFilePickerVisible] = useState(false);
  const [eraseConfirm, setEraseConfirm] = useState<{
    line: number;
  } | null>(null);

  const [localMarks, setLocalMarks] = useState<LineMark[]>([]);
  const [localRanges, setLocalRanges] = useState<RangeMark[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: project } = useQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: () => getProjectById(projectId),
  });

  const { data: files = [] } = useQuery({
    queryKey: fileKeys.byProject(projectId),
    queryFn: () => getFilesByProject(projectId),
  });

  const { data: currentFile } = useQuery({
    queryKey: currentFileId ? fileKeys.detail(currentFileId) : fileKeys.root,
    queryFn: () => (currentFileId ? getFileById(currentFileId) : null),
    enabled: !!currentFileId,
  });

  useEffect(() => {
    if (currentFile) {
      setLocalMarks(currentFile.marks);
      setLocalRanges(currentFile.ranges);
    }
  }, [currentFile]);

  const debounceSave = useCallback(
    (fileId: FileId, marks: LineMark[], ranges: RangeMark[]) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        await updateFileMarks(fileId, marks, ranges);
        // Optimistically update the cache instead of invalidating to prevent ping-pong re-renders
        queryClient.setQueryData<SourceFile | null | undefined>(fileKeys.detail(fileId), (old) => {
          if (!old) return old;
          return { ...old, marks, ranges };
        });
      }, 500);
    },
    [queryClient],
  );

  const recentFiles = useMemo(() => {
    if (!project) return [];
    return project.recentFileIds
      .map((fid) => files.find((f) => f.id === fid))
      .filter(Boolean) as typeof files;
  }, [project, files]);

  const selectFile = useCallback(
    async (fid: FileId) => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        if (currentFileId) {
          await updateFileMarks(currentFileId, localMarks, localRanges);
        }
      }
      setCurrentFileId(fid);
      setFilePickerVisible(false);
      resetSelection();
      setEraseConfirm(null);

      if (!project) return;
      const recent = [fid, ...project.recentFileIds.filter((r) => r !== fid)].slice(0, 8);
      await updateProject(projectId, { recentFileIds: recent });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
    [project, projectId, queryClient, resetSelection, currentFileId, localMarks, localRanges],
  );

  const openSectionChat = useCallback(
    async (line: number) => {
      if (!currentFile) return;
      const info = getLineMarkInfo(localMarks, localRanges, line);
      if (!info) return;

      let chatStartLine = line;
      let chatEndLine = line;

      if (!info.isDirectMark) {
        const range = localRanges.find(
          (r) => line >= r.startLine && line <= r.endLine && r.color === info.color,
        );
        if (range) {
          chatStartLine = range.startLine;
          chatEndLine = range.endLine;
        }
      }

      const now = new Date().toISOString();
      const newChatId = makeChatId(uid());
      const title = `${currentFile.path.split('/').pop()}:${chatStartLine}-${chatEndLine}`;

      await insertChat({
        id: newChatId,
        scope: 'section',
        projectId,
        fileId: currentFile.id,
        startLine: chatStartLine,
        endLine: chatEndLine,
        title,
        createdAt: now,
        updatedAt: now,
      });

      queryClient.invalidateQueries({ queryKey: chatKeys.recent });
      router.push(`/chat/${newChatId}`);
    },
    [currentFile, localMarks, localRanges, projectId, queryClient],
  );

  const handleLinePress = useCallback(
    (line: number) => {
      if (!currentFile) return;

      if (mode === 'view') {
        const info = getLineMarkInfo(localMarks, localRanges, line);
        if (info) {
          openSectionChat(line);
        }
        return;
      }

      if (isRangeSelectMode) {
        if (startLine === null) {
          setStartLine(line);
          return;
        }
        const newRanges = applyRangeMark(
          localRanges,
          startLine,
          line,
          activeColor,
        );
        setLocalRanges(newRanges);
        debounceSave(currentFile.id, localMarks, newRanges);
        resetSelection();
        return;
      }

      const newMarks = applyMark(localMarks, line, activeColor);
      setLocalMarks(newMarks);
      debounceSave(currentFile.id, newMarks, localRanges);
    },
    [
      mode,
      currentFile,
      isRangeSelectMode,
      startLine,
      activeColor,
      localMarks,
      localRanges,
      debounceSave,
      resetSelection,
      setStartLine,
      openSectionChat,
    ],
  );

  const handleLineLongPress = useCallback(
    (line: number) => {
      if (mode !== 'mark' || !currentFile) return;

      const existing = getLineMarkColor(localMarks, localRanges, line);
      if (existing) {
        const result = eraseMark(localMarks, line, existing.color);
        if (result.hadDepth) {
          setEraseConfirm({ line });
          return;
        }
        setLocalMarks(result.marks);
        debounceSave(currentFile.id, result.marks, localRanges);
        return;
      }

      if (!isRangeSelectMode) {
        toggleRangeSelectMode();
        setStartLine(line);
      }
    },
    [mode, currentFile, localMarks, localRanges, isRangeSelectMode, toggleRangeSelectMode, setStartLine, debounceSave],
  );

  const handleEraseConfirm = useCallback(() => {
    if (!eraseConfirm || !currentFile) return;
    const existing = getLineMarkColor(localMarks, localRanges, eraseConfirm.line);
    if (existing) {
      const result = eraseMark(localMarks, eraseConfirm.line, existing.color);
      setLocalMarks(result.marks);
      debounceSave(currentFile.id, result.marks, localRanges);
    }
    setEraseConfirm(null);
  }, [eraseConfirm, currentFile, localMarks, localRanges, debounceSave]);

  const handleEraseCancel = useCallback(() => {
    setEraseConfirm(null);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backBtn}>{'<'}</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {project?.name ?? 'Project'}
        </Text>
        <Pressable
          style={[styles.modeToggle, mode === 'mark' && styles.modeToggleMark]}
          onPress={toggleMode}
        >
          <Text
            style={[
              styles.modeToggleText,
              mode === 'mark' && styles.modeToggleTextMark,
            ]}
          >
            {mode === 'view' ? 'View' : 'Mark'}
          </Text>
        </Pressable>
      </View>

      {recentFiles.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.recentBar}
          contentContainerStyle={styles.recentBarContent}
        >
          {recentFiles.map((f) => {
            const basename = f.path.split('/').pop() ?? f.path;
            const isActive = f.id === currentFileId;
            return (
              <Pressable
                key={f.id}
                style={[styles.recentChip, isActive && styles.recentChipActive]}
                onPress={() => selectFile(f.id)}
              >
                <Text
                  style={[
                    styles.recentChipText,
                    isActive && styles.recentChipTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {basename}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <Pressable
        style={styles.filePickerBtn}
        onPress={() => setFilePickerVisible(true)}
      >
        <Text style={styles.filePickerBtnText}>
          {currentFile
            ? currentFile.path
            : files.length > 0
              ? 'Select a file...'
              : 'No files in project'}
        </Text>
      </Pressable>

      {isRangeSelectMode && (
        <View style={styles.rangeBar}>
          <Text style={styles.rangeBarText}>
            Range select: {startLine !== null ? `from line ${startLine} - tap end line` : 'tap start line'}
          </Text>
          <Pressable
            style={styles.rangeCancelBtn}
            onPress={resetSelection}
          >
            <Text style={styles.rangeCancelText}>Cancel</Text>
          </Pressable>
        </View>
      )}

      {currentFile ? (
        <CodeViewer
          content={currentFile.content}
          marks={localMarks}
          ranges={localRanges}
          mode={mode}
          onLinePress={handleLinePress}
          onLineLongPress={handleLineLongPress}
          language={inferLanguageFromPath(currentFile.path)}
          selectionStartLine={isRangeSelectMode ? startLine : null}
        />
      ) : (
        <View style={styles.emptyViewer}>
          <Text style={styles.emptyViewerText}>
            {files.length > 0
              ? 'Select a file to view'
              : 'Import a project to get started'}
          </Text>
        </View>
      )}

      {mode === 'mark' && <ColorPicker active={activeColor} onSelect={setColor} />}

      <EraseConfirmBar
        visible={!!eraseConfirm}
        onConfirm={handleEraseConfirm}
        onCancel={handleEraseCancel}
      />

      <FilePickerModal
        visible={filePickerVisible}
        files={files}
        onSelect={selectFile}
        onClose={() => setFilePickerVisible(false)}
      />
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
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backBtn: {
    color: colors.primary,
    fontSize: fontSize.xl,
    fontWeight: '600',
    paddingHorizontal: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '600',
    flex: 1,
  },
  modeToggle: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: 6,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeToggleMark: {
    backgroundColor: 'rgba(96, 139, 219, 0.2)',
    borderColor: colors.primary,
  },
  modeToggleText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  modeToggleTextMark: {
    color: colors.primary,
  },
  recentBar: {
    maxHeight: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  recentBarContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  recentChip: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: 6,
    maxWidth: 140,
  },
  recentChipActive: {
    backgroundColor: 'rgba(96, 139, 219, 0.2)',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  recentChipText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  recentChipTextActive: {
    color: colors.primary,
  },
  filePickerBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  filePickerBtnText: {
    color: colors.primary,
    fontSize: fontSize.md,
  },
  rangeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(96, 139, 219, 0.15)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.primary,
  },
  rangeBarText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    flex: 1,
  },
  rangeCancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 4,
    backgroundColor: colors.surfaceLight,
  },
  rangeCancelText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  emptyViewer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyViewerText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
});
