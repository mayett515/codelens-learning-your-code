import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, fontSize, spacing } from '../../../ui/theme';
import { syncPendingEmbeddings } from '../application/sync';
import { maybeRecomputeSuggestions } from '../promotion/services/maybeRecomputeSuggestions';
import { computeStrength } from '../strength/computeStrength';
import { useConceptList } from '../hooks/useConceptList';
import { useConceptCaptures } from '../hooks/useConceptCaptures';
import { useKnowledgeHealthConcepts } from '../hooks/useKnowledgeHealthConcepts';
import { useRecentCaptures } from '../hooks/useRecentCaptures';
import { useRecentSessions } from '../hooks/useRecentSessions';
import { useSessionFlashback } from '../hooks/useSessionFlashback';
import { ConceptListSection } from './ConceptListSection';
import { KnowledgeHealthEntry } from './KnowledgeHealthEntry';
import { KnowledgeHealthScreen } from './KnowledgeHealthScreen';
import { RecentCapturesSection } from './RecentCapturesSection';
import { SessionCardsSection } from './SessionCardsSection';
import { SessionFlashbackScreen } from './SessionFlashbackScreen';
import { CaptureCardFull } from './cards/CaptureCardFull';
import { ConceptCardFull } from './cards/ConceptCardFull';
import { PromotionSuggestionsSection } from '../promotion/ui/PromotionSuggestionsSection';
import { PromotionReviewScreen } from '../promotion/ui/PromotionReviewScreen';
import type { ConceptId, LearningCaptureId } from '../types/ids';
import type { LearningCapture, LearningConcept } from '../types/learning';

type Detail =
  | { type: 'capture'; id: LearningCaptureId }
  | { type: 'concept'; id: ConceptId }
  | { type: 'session'; id: string }
  | { type: 'promotion'; fingerprint: string }
  | { type: 'health' }
  | null;

export function LearningHubScreen() {
  useEffect(() => {
    syncPendingEmbeddings().catch(() => undefined);
    maybeRecomputeSuggestions('hub_open').catch(() => undefined);
  }, []);

  const [detail, setDetail] = useState<Detail>(null);
  const { data: captures = [] } = useRecentCaptures({ limit: 10 });
  const { data: concepts = [] } = useConceptList({ sort: 'weakest' });
  const { data: sessions = [] } = useRecentSessions({ limit: 5 });
  const { data: healthConcepts = [] } = useKnowledgeHealthConcepts();
  const { data: flashback } = useSessionFlashback(detail?.type === 'session' ? detail.id : null);
  const { data: conceptCaptures = [] } = useConceptCaptures(
    detail?.type === 'concept' ? detail.id : null,
  );

  const conceptsById = useMemo(() => new Map(concepts.map((concept) => [concept.id, concept])), [concepts]);
  const capturesById = useMemo(() => new Map(captures.map((capture) => [capture.id, capture])), [captures]);

  const selectedCapture = detail?.type === 'capture' ? capturesById.get(detail.id) : undefined;
  const selectedConcept = detail?.type === 'concept' ? conceptsById.get(detail.id) : undefined;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backBtn}>{'<'}</Text>
        </Pressable>
        <View>
          <Text style={styles.title}>Learning Hub</Text>
          <Text style={styles.subtitle}>Navigation and awareness</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <RecentCapturesSection
          captures={captures}
          conceptsById={conceptsById}
          onOpenCapture={(id) => setDetail({ type: 'capture', id })}
        />
        <PromotionSuggestionsSection onOpenReview={(fingerprint) => setDetail({ type: 'promotion', fingerprint })} />
        <ConceptListSection concepts={concepts} onOpenConcept={(id) => setDetail({ type: 'concept', id })} />
        <SessionCardsSection sessions={sessions} onOpenSession={(id) => setDetail({ type: 'session', id })} />
        <KnowledgeHealthEntry concepts={healthConcepts} onOpen={() => setDetail({ type: 'health' })} />
      </ScrollView>

      <DetailModal visible={detail !== null} onClose={() => setDetail(null)}>
        {selectedCapture ? (
          <CaptureCardFull
            captureId={selectedCapture.id}
            title={selectedCapture.title}
            conceptType={selectedCapture.conceptHint?.proposedConceptType ?? null}
            state={selectedCapture.state}
            whatClicked={selectedCapture.whatClicked}
            whyItMattered={selectedCapture.whyItMattered}
            rawSnippet={selectedCapture.rawSnippet}
            snippetLang={selectedCapture.snippetLang}
            snippetSourcePath={selectedCapture.snippetSource?.path ?? null}
            snippetStartLine={selectedCapture.snippetSource?.startLine ?? null}
            snippetEndLine={selectedCapture.snippetSource?.endLine ?? null}
            relativeTime={formatDate(selectedCapture.createdAt)}
            sessionLabel={selectedCapture.sessionId ?? null}
            linkedConcept={linkedConceptForCapture(selectedCapture, conceptsById)}
            derivedFromCaptureId={selectedCapture.derivedFromCaptureId}
            editableUntil={selectedCapture.editableUntil}
          />
        ) : null}
        {selectedConcept ? (
          <ConceptCardFull
            conceptId={selectedConcept.id}
            name={selectedConcept.name}
            conceptType={selectedConcept.conceptType}
            strength={computeStrength(selectedConcept.familiarityScore, selectedConcept.importanceScore)}
            canonicalSummary={selectedConcept.canonicalSummary}
            coreConcept={selectedConcept.coreConcept}
            architecturalPattern={selectedConcept.architecturalPattern}
            programmingParadigm={selectedConcept.programmingParadigm}
            languageOrRuntime={selectedConcept.languageOrRuntime}
            surfaceFeatures={selectedConcept.surfaceFeatures}
            prerequisites={namedConcepts(selectedConcept.prerequisites, conceptsById)}
            relatedConcepts={namedConcepts(selectedConcept.relatedConcepts, conceptsById)}
            contrastConcepts={namedConcepts(selectedConcept.contrastConcepts, conceptsById)}
            linkedCaptures={capturesForConcept(selectedConcept.id, conceptCaptures)}
            representativeCaptureIds={selectedConcept.representativeCaptureIds}
            originSessions={originSessionsForConcept(selectedConcept.id, conceptCaptures)}
            onStartReview={() => undefined}
            onViewGraph={() => undefined}
            onOpenConcept={(id) => setDetail({ type: 'concept', id })}
            onOpenCapture={(id) => setDetail({ type: 'capture', id })}
            onJumpToSession={(id) => setDetail({ type: 'session', id })}
          />
        ) : null}
        {detail?.type === 'session' ? (
          <SessionFlashbackScreen session={flashback?.session} captures={flashback?.captures ?? []} />
        ) : null}
        {detail?.type === 'promotion' ? (
          <PromotionReviewScreen
            fingerprint={detail.fingerprint}
            onComplete={(conceptId) => setDetail({ type: 'concept', id: conceptId as ConceptId })}
          />
        ) : null}
        {detail?.type === 'health' ? (
          <KnowledgeHealthScreen
            concepts={healthConcepts}
            onOpenConcept={(id) => setDetail({ type: 'concept', id })}
          />
        ) : null}
      </DetailModal>
    </SafeAreaView>
  );
}

function DetailModal({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        <Pressable style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>Close</Text>
        </Pressable>
        {children}
      </SafeAreaView>
    </Modal>
  );
}

function linkedConceptForCapture(
  capture: LearningCapture,
  conceptsById: Map<ConceptId, LearningConcept>,
) {
  if (!capture.linkedConceptId) return null;
  const concept = conceptsById.get(capture.linkedConceptId);
  if (!concept) return null;
  return {
    id: concept.id,
    name: concept.name,
    summary: concept.canonicalSummary,
  };
}

function namedConcepts(ids: ConceptId[], conceptsById: Map<ConceptId, LearningConcept>) {
  return ids
    .map((id) => {
      const concept = conceptsById.get(id);
      return concept ? { id, name: concept.name } : null;
    })
    .filter((item): item is { id: ConceptId; name: string } => item !== null);
}

function capturesForConcept(conceptId: ConceptId, captures: LearningCapture[]) {
  return captures
    .filter((capture) => capture.linkedConceptId === conceptId)
    .map((capture) => ({
      id: capture.id,
      title: capture.title,
      whatClicked: capture.whatClicked,
      sessionId: capture.sessionId,
      sessionLabel: capture.sessionId,
      languageOrRuntime: capture.snippetLang,
      createdAt: capture.createdAt,
    }));
}

function originSessionsForConcept(conceptId: ConceptId, captures: LearningCapture[]) {
  const counts = new Map<string, { captureCount: number; lastCaptureAt: number }>();
  captures
    .filter((capture) => capture.linkedConceptId === conceptId && capture.sessionId)
    .forEach((capture) => {
      const sessionId = capture.sessionId as string;
      const existing = counts.get(sessionId);
      counts.set(sessionId, {
        captureCount: (existing?.captureCount ?? 0) + 1,
        lastCaptureAt: Math.max(existing?.lastCaptureAt ?? 0, capture.createdAt),
      });
    });

  return [...counts.entries()].map(([sessionId, value]) => ({
    sessionId,
    sessionLabel: sessionId,
    captureCount: value.captureCount,
    lastCaptureAt: value.lastCaptureAt,
  }));
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString();
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
    fontSize: fontSize.xl,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  content: {
    paddingBottom: spacing.xl,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  closeButton: {
    alignSelf: 'flex-end',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  closeText: {
    color: colors.primaryLight,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});
