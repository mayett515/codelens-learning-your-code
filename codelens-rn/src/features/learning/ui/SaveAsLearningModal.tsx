import { useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { captureKeys, conceptKeys } from '../data/query-keys';
import { useSaveLearningStore } from '../state/save-learning';
import { prepareSaveCandidates } from '../services/prepareSaveCandidates';
import { saveCapture } from '../services/saveCapture';
import { CandidateCaptureCard } from './cards/CandidateCaptureCard';
import { CaptureCardFull } from './cards/CaptureCardFull';
import { colors, fontSize, spacing } from '../../../ui/theme';
import type { ConceptType } from '../types/learning';

export function SaveAsLearningModal() {
  const store = useSaveLearningStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!store.visible || store.phase !== 'extracting') return;

    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        const state = useSaveLearningStore.getState();
        const candidates = await prepareSaveCandidates(
          {
            selectedText: state.snippet,
            chatMessageId: state.sourceMessageId,
            sessionId: state.sourceChatId,
          },
          { signal: controller.signal },
        );
        if (cancelled) return;

        useSaveLearningStore.getState().setCandidates(candidates);
        useSaveLearningStore.getState().setPhase('reviewing');
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error
          ? error.message
          : "Couldn't extract your capture. Try again.";
        useSaveLearningStore.getState().setError(message);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [store.visible, store.phase]);

  const handleRetry = useCallback(() => {
    useSaveLearningStore.getState().setPhase('extracting');
  }, []);

  const handleSave = useCallback(async (candidateId: string, index: number) => {
    const current = useSaveLearningStore.getState();
    const candidate = current.candidates[index];
    if (!candidate) return;
    const currentState = current.saveStates[candidateId]?.state;
    if (currentState === 'saving' || currentState === 'saved') return;

    current.setCandidateSaveState(candidateId, { state: 'saving', error: null });
    try {
      const captureId = await saveCapture(candidate);
      useSaveLearningStore
        .getState()
        .setCandidateSaveState(candidateId, { state: 'saved', captureId, error: null });
      queryClient.invalidateQueries({ queryKey: captureKeys.all });
      queryClient.invalidateQueries({ queryKey: conceptKeys.all });
    } catch (error) {
      useSaveLearningStore.getState().setCandidateSaveState(candidateId, {
        state: 'failed',
        error: error instanceof Error ? error.message : 'Save failed',
      });
    }
  }, [queryClient]);

  if (!store.visible) return null;

  const inspectingIndex = store.inspectingCandidateId
    ? Number(store.inspectingCandidateId.replace('candidate-', ''))
    : -1;
  const inspectingCandidate = inspectingIndex >= 0 ? store.candidates[inspectingIndex] : null;

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
            <Text style={styles.headerTitle}>Save Capture</Text>
            <Pressable onPress={store.close} hitSlop={8}>
              <Text style={styles.closeBtn}>X</Text>
            </Pressable>
          </View>

          {store.phase === 'extracting' && (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.statusText}>Finding what clicked...</Text>
            </View>
          )}

          {store.phase === 'reviewing' && (
            <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
              {store.candidates.map((candidate, index) => {
                const candidateId = `candidate-${index}`;
                const saveStatus = store.saveStates[candidateId];
                const conceptType = candidate.conceptHint?.proposedConceptType ?? null;
                return (
                  <View key={candidateId}>
                    <CandidateCaptureCard
                      candidateId={candidateId}
                      title={candidate.title}
                      whatClicked={candidate.whatClicked}
                      rawSnippet={candidate.rawSnippet}
                      conceptType={conceptType as ConceptType | null}
                      linkedConceptName={candidate.linkedConceptName}
                      isNewLanguageForExistingConcept={candidate.isNewLanguageForExistingConcept}
                      crossLanguageHint={buildCrossLanguageHint(candidate)}
                      extractionConfidence={candidate.extractionConfidence}
                      saveState={saveStatus?.state ?? 'idle'}
                      onSave={() => handleSave(candidateId, index)}
                      onInspect={() => store.inspectCandidate(candidateId)}
                    />
                    {saveStatus?.state === 'failed' && saveStatus.error ? (
                      <Text style={styles.errorInline}>{saveStatus.error}</Text>
                    ) : null}
                  </View>
                );
              })}
            </ScrollView>
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

        {inspectingCandidate ? (
          <Modal
            animationType="fade"
            transparent
            visible={!!store.inspectingCandidateId}
            onRequestClose={() => store.inspectCandidate(null)}
          >
            <View style={styles.inspectOverlay}>
              <View style={styles.inspectContainer}>
                <ScrollView>
                  <CaptureCardFull
                    title={inspectingCandidate.title}
                    conceptType={inspectingCandidate.conceptHint?.proposedConceptType ?? null}
                    whatClicked={inspectingCandidate.whatClicked}
                    whyItMattered={inspectingCandidate.whyItMattered}
                    rawSnippet={inspectingCandidate.rawSnippet}
                    snippetLang={inspectingCandidate.snippetLang}
                    snippetSourcePath={inspectingCandidate.snippetSourcePath}
                    snippetStartLine={inspectingCandidate.snippetStartLine}
                    snippetEndLine={inspectingCandidate.snippetEndLine}
                    linkedConcept={inspectingCandidate.linkedConceptId && inspectingCandidate.linkedConceptName
                      ? {
                          id: inspectingCandidate.linkedConceptId,
                          name: inspectingCandidate.linkedConceptName,
                        }
                      : null}
                    derivedFromCaptureId={inspectingCandidate.derivedFromCaptureId}
                  />
                </ScrollView>
                <Pressable style={styles.doneBtn} onPress={() => store.inspectCandidate(null)}>
                  <Text style={styles.doneText}>Done</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        ) : null}
      </KeyboardAvoidingView>
    </Modal>
  );
}

function buildCrossLanguageHint(candidate: {
  isNewLanguageForExistingConcept: boolean;
  linkedConceptName: string | null;
  linkedConceptLanguages: string[] | null;
}): string | null {
  if (!candidate.isNewLanguageForExistingConcept || !candidate.linkedConceptName) return null;
  const language = candidate.linkedConceptLanguages?.[0];
  if (!language) return null;
  return `You also saved ${candidate.linkedConceptName} in ${language}.`;
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
    maxHeight: '84%',
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
    fontWeight: '700',
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
  errorInline: {
    color: colors.red,
    fontSize: fontSize.sm,
    marginTop: -spacing.sm,
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
  inspectOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  inspectContainer: {
    maxHeight: '88%',
    backgroundColor: colors.surface,
    borderRadius: 8,
    overflow: 'hidden',
  },
  doneBtn: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  doneText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});
