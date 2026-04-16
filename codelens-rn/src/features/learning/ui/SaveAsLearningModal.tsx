import { useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { learningKeys } from '../data/query-keys';
import { useSaveLearningStore } from '../state/save-learning';
import { extractConcepts } from '../application/extract';
import { findMergeCandidates } from '../application/retrieve';
import { commitLearningSession } from '../application/commit';
import { ConceptChip } from './ConceptChip';
import { colors, fontSize, spacing } from '../../../ui/theme';
import type { ConceptId } from '../../../domain/types';

export function SaveAsLearningModal() {
  const store = useSaveLearningStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!store.visible || store.phase !== 'extracting') return;

    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        const currentSnippet = useSaveLearningStore.getState().snippet;
        const result = await extractConcepts(currentSnippet, controller.signal);
        if (cancelled) return;

        const s = useSaveLearningStore.getState();
        s.setExtractionResult(result.title, result.concepts);

        const suggestions: Array<{ conceptIndex: number; candidates: Awaited<ReturnType<typeof findMergeCandidates>> }> = [];
        for (let i = 0; i < result.concepts.length; i++) {
          try {
            const candidates = await findMergeCandidates(
              result.concepts[i].name,
              result.concepts[i].summary,
            );
            if (candidates.length > 0) {
              suggestions.push({ conceptIndex: i, candidates });
            }
          } catch {
            // merge candidate lookup is non-critical
          }
        }

        if (cancelled) return;
        const s2 = useSaveLearningStore.getState();
        s2.setMergeSuggestions(suggestions);
        s2.setPhase('reviewing');
      } catch (e) {
        if (cancelled) return;
        useSaveLearningStore
          .getState()
          .setError(e instanceof Error ? e.message : 'Extraction failed');
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [store.visible, store.phase]);

  const handleSave = useCallback(async () => {
    const s = useSaveLearningStore.getState();
    s.setPhase('saving');

    try {
      const newConcepts = s.extractedConcepts.filter(
        (_, i) => s.selectedIndices.has(i) && !s.mergeTargets.has(i),
      );
      const mergedIds = [...s.mergeTargets.entries()]
        .filter(([i]) => s.selectedIndices.has(i))
        .map(([, id]) => id);

      await commitLearningSession({
        sourceChatId: s.sourceChatId!,
        snippet: s.snippet,
        title: s.extractedTitle,
        newConcepts,
        mergedConceptIds: mergedIds,
      });

      queryClient.invalidateQueries({ queryKey: learningKeys.sessions.all });
      queryClient.invalidateQueries({ queryKey: learningKeys.concepts.all });
      useSaveLearningStore.getState().close();
    } catch (e) {
      useSaveLearningStore
        .getState()
        .setError(e instanceof Error ? e.message : 'Save failed');
    }
  }, [queryClient]);

  const handleRetry = useCallback(() => {
    useSaveLearningStore.getState().setPhase('extracting');
  }, []);

  const handleMerge = useCallback((index: number, existingId: ConceptId) => {
    useSaveLearningStore.getState().acceptMerge(index, existingId);
  }, []);

  if (!store.visible) return null;

  return (
    <Modal
      animationType="slide"
      transparent
      visible={store.visible}
      onRequestClose={store.close}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={store.close} />
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Save as Learning</Text>
            <Pressable onPress={store.close} hitSlop={8}>
              <Text style={styles.closeBtn}>X</Text>
            </Pressable>
          </View>

          {store.phase === 'extracting' && (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.statusText}>Extracting concepts...</Text>
            </View>
          )}

          {(store.phase === 'reviewing' || store.phase === 'saving') && (
            <>
              <ScrollView
                style={styles.body}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.label}>Title</Text>
                <TextInput
                  style={styles.titleInput}
                  value={store.extractedTitle}
                  onChangeText={store.editTitle}
                  placeholderTextColor={colors.textSecondary}
                />

                <Text style={styles.label}>Snippet</Text>
                <TextInput
                  style={styles.snippetInput}
                  value={store.snippet}
                  onChangeText={store.editSnippet}
                  multiline
                  numberOfLines={4}
                  placeholderTextColor={colors.textSecondary}
                />

                <Text style={styles.label}>
                  Concepts ({store.selectedIndices.size}/
                  {store.extractedConcepts.length})
                </Text>
                <View style={styles.conceptList}>
                  {store.extractedConcepts.map((concept, index) => {
                    const isMerged = store.mergeTargets.has(index);
                    const suggestion = store.mergeSuggestions.find(
                      (s) => s.conceptIndex === index,
                    );

                    return (
                      <View key={index} style={styles.conceptRow}>
                        <ConceptChip
                          name={
                            isMerged ? `\u2197 ${concept.name}` : concept.name
                          }
                          selected={store.selectedIndices.has(index)}
                          onPress={() => store.toggleConceptSelection(index)}
                          variant={isMerged ? 'merge' : 'default'}
                        />
                        <Text style={styles.conceptSummary} numberOfLines={2}>
                          {concept.summary}
                        </Text>
                        {suggestion && !isMerged && (
                          <View style={styles.mergeRow}>
                            <Text style={styles.mergeLabel}>Similar:</Text>
                            {suggestion.candidates.slice(0, 2).map((cand) => (
                              <ConceptChip
                                key={cand.concept.id}
                                name={cand.concept.name}
                                selected={false}
                                onPress={() =>
                                  handleMerge(index, cand.concept.id)
                                }
                                variant="merge"
                              />
                            ))}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </ScrollView>

              <View style={styles.footer}>
                <Pressable
                  style={[
                    styles.saveBtn,
                    (store.phase === 'saving' ||
                      store.selectedIndices.size === 0) &&
                      styles.saveBtnDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={
                    store.phase === 'saving' || store.selectedIndices.size === 0
                  }
                >
                  {store.phase === 'saving' ? (
                    <ActivityIndicator size="small" color={colors.text} />
                  ) : (
                    <Text style={styles.saveBtnText}>
                      Save {store.selectedIndices.size} Concept
                      {store.selectedIndices.size !== 1 ? 's' : ''}
                    </Text>
                  )}
                </Pressable>
              </View>
            </>
          )}

          {store.phase === 'error' && (
            <View style={styles.center}>
              <Text style={styles.errorText}>{store.error}</Text>
              <Pressable style={styles.retryBtn} onPress={handleRetry}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </Pressable>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  closeBtn: {
    fontSize: fontSize.xl,
    color: colors.textSecondary,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  titleInput: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    padding: spacing.sm,
    color: colors.text,
    fontSize: fontSize.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  snippetInput: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    padding: spacing.sm,
    color: colors.text,
    fontSize: fontSize.sm,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 120,
    textAlignVertical: 'top',
  },
  conceptList: {
    marginTop: spacing.xs,
  },
  conceptRow: {
    marginBottom: spacing.sm,
  },
  conceptSummary: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
    marginLeft: spacing.xs,
  },
  mergeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    marginLeft: spacing.md,
  },
  mergeLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  center: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  statusText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.red,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryBtn: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryBtnText: {
    fontSize: fontSize.md,
    color: colors.primary,
  },
});
