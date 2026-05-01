import { useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, fontSize, spacing } from '../../../ui/theme';
import type { Bookmark, BookmarkId, BookmarkUpsertInput, MarkColor } from '../types/bookmark';

interface Props {
  mode: 'create' | 'edit';
  bookmark?: Bookmark | undefined;
  projectId: string;
  filePath: string;
  startLine: number;
  endLine: number;
  palette: MarkColor[];
  initialColorKey?: string | null | undefined;
  isSaving?: boolean | undefined;
  isDeleting?: boolean | undefined;
  errorMessage?: string | null | undefined;
  onSave: (data: BookmarkUpsertInput) => void;
  onDelete?: ((id: BookmarkId) => void) | undefined;
  onSaveCapture?: (() => void) | undefined;
  onClose: () => void;
}

export function BookmarkSheet({
  mode,
  bookmark,
  projectId,
  filePath,
  startLine,
  endLine,
  palette,
  initialColorKey,
  isSaving = false,
  isDeleting = false,
  errorMessage = null,
  onSave,
  onDelete,
  onSaveCapture,
  onClose,
}: Props) {
  const fallbackColorKey = resolveFallbackColorKey(initialColorKey, palette);
  const [colorKey, setColorKey] = useState(bookmark?.colorKey ?? fallbackColorKey);
  const [note, setNote] = useState(bookmark?.note ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setColorKey(bookmark?.colorKey ?? fallbackColorKey);
    setNote(bookmark?.note ?? '');
    setConfirmDelete(false);
  }, [
    bookmark?.colorKey,
    bookmark?.id,
    bookmark?.note,
    endLine,
    fallbackColorKey,
    filePath,
    projectId,
    startLine,
  ]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [onClose]);

  const lineLabel = useMemo(
    () => startLine === endLine ? `${filePath}:${startLine}` : `${filePath}:${startLine}-${endLine}`,
    [endLine, filePath, startLine],
  );
  const selectedColorExists = palette.some((color) => color.key === colorKey);
  const saveDisabled = isSaving || !selectedColorExists;

  const save = () => {
    if (saveDisabled) return;
    onSave({
      projectId,
      filePath,
      startLine,
      endLine,
      colorKey,
      note: note.trim() ? note.trim() : null,
      sessionId: bookmark?.sessionId ?? null,
    });
  };

  const deleteBookmark = () => {
    if (!bookmark || !onDelete || isDeleting) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete(bookmark.id);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.overlay}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{mode === 'edit' ? 'Edit bookmark' : 'Bookmark line'}</Text>
            <Text style={styles.location} numberOfLines={1}>{lineLabel}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.closeText}>x</Text>
          </Pressable>
        </View>

        <View style={styles.body}>
          <View style={styles.paletteRow}>
            {palette.map((color) => {
              const selected = color.key === colorKey;
              return (
                <Pressable
                  key={color.key}
                  style={[
                    styles.swatchBtn,
                    selected && styles.swatchSelected,
                  ]}
                  onPress={() => setColorKey(color.key)}
                  accessibilityRole="button"
                  accessibilityLabel={color.label}
                >
                  <View style={[styles.swatch, { backgroundColor: color.hex }]} />
                  <Text style={styles.swatchLabel} numberOfLines={1}>{color.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.noteBlock}>
            <View style={styles.noteHeader}>
              <Text style={styles.noteLabel}>Note</Text>
              <Text style={styles.noteCount}>{note.length}/200</Text>
            </View>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              maxLength={200}
              placeholder="Optional annotation"
              placeholderTextColor={colors.textSecondary}
              returnKeyType="done"
            />
          </View>

          <View style={styles.actions}>
            {mode === 'edit' && onDelete ? (
              <Pressable
                style={[styles.deleteBtn, isDeleting && styles.disabled]}
                onPress={deleteBookmark}
                disabled={isDeleting}
              >
                <Text style={styles.deleteText}>
                  {confirmDelete ? 'Remove this bookmark?' : 'Delete'}
                </Text>
              </Pressable>
            ) : null}
            {mode === 'edit' && onSaveCapture ? (
              <Pressable style={styles.captureBtn} onPress={onSaveCapture}>
                <Text style={styles.captureText}>Save capture from here</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={[styles.saveBtn, saveDisabled && styles.disabled]}
              onPress={save}
              disabled={saveDisabled}
            >
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </View>
          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function resolveFallbackColorKey(
  initialColorKey: string | null | undefined,
  palette: MarkColor[],
): string {
  return initialColorKey && palette.some((color) => color.key === initialColorKey)
    ? initialColorKey
    : palette[0]?.key ?? 'yellow';
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
    justifyContent: 'flex-end',
    zIndex: 35,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    maxHeight: '70%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  location: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  closeText: {
    color: colors.textSecondary,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  body: {
    padding: spacing.md,
    gap: spacing.md,
  },
  paletteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  swatchBtn: {
    minWidth: 92,
    maxWidth: 132,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.sm,
  },
  swatchSelected: {
    borderColor: colors.primary,
  },
  swatch: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  swatchLabel: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  noteBlock: {
    gap: spacing.xs,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  noteLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  noteCount: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  noteInput: {
    minHeight: 42,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: fontSize.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  deleteBtn: {
    minHeight: 40,
    borderRadius: 6,
    backgroundColor: 'rgba(224, 108, 117, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  deleteText: {
    color: colors.red,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  captureBtn: {
    minHeight: 40,
    borderRadius: 6,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  captureText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  saveBtn: {
    minHeight: 40,
    borderRadius: 6,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  saveText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  errorText: {
    color: colors.red,
    fontSize: fontSize.sm,
  },
  disabled: {
    opacity: 0.45,
  },
});
