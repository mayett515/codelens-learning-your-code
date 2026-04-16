import { useState, useDeferredValue, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, fontSize, spacing } from '@/src/ui/theme';
import { syncPendingEmbeddings, useAllSessions, useAllConcepts } from '@/src/features/learning';
import type { LearningSession, Concept } from '@/src/domain/types';

type Tab = 'sessions' | 'concepts';

export default function LearningHubScreen() {
  useEffect(() => {
    syncPendingEmbeddings().catch(() => undefined);
  }, []);

  const [tab, setTab] = useState<Tab>('concepts');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  const { data: sessions = [] } = useAllSessions();
  const { data: concepts = [] } = useAllConcepts();

  const filteredConcepts = useMemo(() => {
    if (!deferredSearch) return concepts;
    const q = deferredSearch.toLowerCase();
    return concepts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.summary.toLowerCase().includes(q) ||
        c.taxonomy.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [concepts, deferredSearch]);

  const renderSession = useCallback(
    ({ item }: { item: LearningSession }) => (
      <Pressable
        style={styles.card}
        onPress={() => {
          const firstConcept = item.conceptIds[0];
          if (firstConcept) router.push(`/learning/chat/${firstConcept}`);
        }}
      >
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.cardMeta}>
          {item.conceptIds.length} concept
          {item.conceptIds.length !== 1 ? 's' : ''} ·{' '}
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
        <Text style={styles.cardSnippet} numberOfLines={2}>
          {item.rawSnippet}
        </Text>
      </Pressable>
    ),
    [],
  );

  const renderConcept = useCallback(
    ({ item }: { item: Concept }) => (
      <Pressable
        style={styles.card}
        onPress={() => router.push(`/learning/chat/${item.id}`)}
      >
        <View style={styles.conceptHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.strengthBar}>
            <View
              style={[
                styles.strengthFill,
                { width: `${item.strength * 100}%` as `${number}%` },
              ]}
            />
          </View>
        </View>
        <Text style={styles.cardSummary} numberOfLines={2}>
          {item.summary}
        </Text>
        {item.taxonomy.tags.length > 0 && (
          <View style={styles.tagRow}>
            {item.taxonomy.tags.slice(0, 3).map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </Pressable>
    ),
    [],
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backBtn}>{'<'}</Text>
        </Pressable>
        <Text style={styles.title}>Learning Hub</Text>
      </View>

      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, tab === 'sessions' && styles.tabActive]}
          onPress={() => setTab('sessions')}
        >
          <Text
            style={[styles.tabText, tab === 'sessions' && styles.tabTextActive]}
          >
            Sessions ({sessions.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === 'concepts' && styles.tabActive]}
          onPress={() => setTab('concepts')}
        >
          <Text
            style={[styles.tabText, tab === 'concepts' && styles.tabTextActive]}
          >
            Concepts ({concepts.length})
          </Text>
        </Pressable>
      </View>

      {tab === 'concepts' && (
        <TextInput
          style={styles.searchInput}
          placeholder="Search concepts..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
      )}

      {tab === 'sessions' ? (
        sessions.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No sessions yet</Text>
            <Text style={styles.emptyHint}>
              Save a chat bubble as learning to get started.
            </Text>
          </View>
        ) : (
          <FlatList
            data={sessions}
            keyExtractor={(item) => item.id}
            renderItem={renderSession}
            contentContainerStyle={styles.list}
          />
        )
      ) : filteredConcepts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            {concepts.length === 0 ? 'No concepts yet' : 'No matching concepts'}
          </Text>
          {concepts.length === 0 && (
            <Text style={styles.emptyHint}>
              Concepts are extracted when you save chat bubbles.
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredConcepts}
          keyExtractor={(item) => item.id}
          renderItem={renderConcept}
          contentContainerStyle={styles.list}
        />
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
    fontWeight: '700',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  tabActive: {
    backgroundColor: `${colors.primary}20`,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.primary,
  },
  searchInput: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.sm,
    color: colors.text,
    fontSize: fontSize.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  list: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '600',
    flex: 1,
  },
  cardMeta: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  cardSnippet: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
    opacity: 0.8,
  },
  conceptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  strengthBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceLight,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    backgroundColor: colors.green,
    borderRadius: 2,
  },
  cardSummary: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  tagRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  tag: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  tagText: {
    color: colors.textSecondary,
    fontSize: 10,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  emptyHint: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    textAlign: 'center',
    marginTop: spacing.sm,
    opacity: 0.7,
  },
});
