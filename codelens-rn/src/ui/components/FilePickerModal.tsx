import { useState, useMemo, useCallback, useDeferredValue } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors, fontSize, spacing } from '../theme';
import type { SourceFile, FileId } from '@/src/domain/types';

type SearchMode = 'path+content' | 'filename';

interface Props {
  visible: boolean;
  files: SourceFile[];
  onSelect: (id: FileId) => void;
  onClose: () => void;
}

export function FilePickerModal({ visible, files, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [searchMode, setSearchMode] = useState<SearchMode>('path+content');

  const filtered = useMemo(() => {
    const q = deferredQuery.toLowerCase().trim();
    if (!q) return files;

    if (searchMode === 'filename') {
      return files.filter((f) => {
        const basename = f.path.split('/').pop()?.toLowerCase() ?? '';
        return basename.includes(q);
      });
    }

    return files.filter(
      (f) =>
        f.path.toLowerCase().includes(q) ||
        f.content.toLowerCase().includes(q),
    );
  }, [files, deferredQuery, searchMode]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => a.path.localeCompare(b.path)),
    [filtered],
  );

  const handleSelect = useCallback(
    (id: FileId) => {
      setQuery('');
      onSelect(id);
    },
    [onSelect],
  );

  const renderFile = useCallback(
    ({ item }: { item: SourceFile }) => {
      const parts = item.path.split('/');
      const basename = parts.pop() ?? item.path;
      const dir = parts.length > 0 ? parts.join('/') + '/' : '';

      return (
        <Pressable
          style={styles.fileRow}
          onPress={() => handleSelect(item.id)}
        >
          <Text style={styles.filePath} numberOfLines={1}>
            <Text style={styles.fileDir}>{dir}</Text>
            <Text style={styles.fileName}>{basename}</Text>
          </Text>
        </Pressable>
      );
    },
    [handleSelect],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Files</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.closeBtn}>X</Text>
            </Pressable>
          </View>

          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder={
                searchMode === 'filename'
                  ? 'Search by filename...'
                  : 'Search path + content...'
              }
              placeholderTextColor={colors.textSecondary}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.modeToggle}>
            <Pressable
              style={[
                styles.modeBtn,
                searchMode === 'path+content' && styles.modeBtnActive,
              ]}
              onPress={() => setSearchMode('path+content')}
            >
              <Text
                style={[
                  styles.modeBtnText,
                  searchMode === 'path+content' && styles.modeBtnTextActive,
                ]}
              >
                Path+Content
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.modeBtn,
                searchMode === 'filename' && styles.modeBtnActive,
              ]}
              onPress={() => setSearchMode('filename')}
            >
              <Text
                style={[
                  styles.modeBtnText,
                  searchMode === 'filename' && styles.modeBtnTextActive,
                ]}
              >
                Filename Only
              </Text>
            </Pressable>
          </View>

          <Text style={styles.count}>{sorted.length} files</Text>

          <FlatList
            data={sorted}
            keyExtractor={(item) => item.id}
            renderItem={renderFile}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%',
    minHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  closeBtn: {
    color: colors.textSecondary,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  searchRow: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  searchInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.text,
    fontSize: fontSize.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  modeToggle: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  modeBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 6,
    backgroundColor: colors.background,
  },
  modeBtnActive: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  modeBtnText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  modeBtnTextActive: {
    color: colors.primary,
  },
  count: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  list: {
    flex: 1,
  },
  fileRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  filePath: {
    fontSize: fontSize.md,
  },
  fileDir: {
    color: colors.textSecondary,
  },
  fileName: {
    color: colors.text,
    fontWeight: '500',
  },
});
