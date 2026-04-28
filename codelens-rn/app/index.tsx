import { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { colors, fontSize, spacing } from '@/src/ui/theme';
import { getAllProjects } from '@/src/db/queries/projects';
import { getRecentChats, insertChat } from '@/src/db/queries/chats';
import { NewProjectModal } from '@/src/ui/components/NewProjectModal';
import { chatId as makeChatId } from '@/src/domain/types';
import { uid } from '@/src/lib/uid';
import { chatKeys, projectKeys } from '@/src/hooks/query-keys';
import type { Project, ProjectId, Chat } from '@/src/domain/types';

export default function HomeScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: projectKeys.all,
    queryFn: getAllProjects,
  });

  const { data: recentChats = [] } = useQuery({
    queryKey: chatKeys.recent,
    queryFn: () => getRecentChats(5),
  });

  const sorted = [...projects].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const handleProjectCreated = useCallback(
    (id: ProjectId) => {
      setModalVisible(false);
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      router.push(`/project/${id}`);
    },
    [queryClient],
  );

  const handleNewGeneralChat = useCallback(async () => {
    const now = new Date().toISOString();
    const newChatId = makeChatId(uid());
    await insertChat({
      id: newChatId,
      scope: 'general',
      title: 'New Chat',
      createdAt: now,
      updatedAt: now,
    });
    queryClient.invalidateQueries({ queryKey: chatKeys.recent });
    router.push(`/general-chat/${newChatId}`);
  }, [queryClient]);

  const openChat = useCallback((chat: Chat) => {
    if (chat.scope === 'general') {
      router.push(`/general-chat/${chat.id}`);
    } else if (chat.scope === 'section') {
      router.push(`/chat/${chat.id}`);
    } else if (chat.scope === 'learning' && chat.conceptId) {
      router.push(`/learning/chat/${chat.conceptId}`);
    } else {
      router.push(`/chat/${chat.id}`);
    }
  }, []);

  const renderProject = useCallback(
    ({ item }: { item: Project }) => (
      <Pressable
        style={styles.card}
        onPress={() => router.push(`/project/${item.id}`)}
      >
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.sourceBadge,
              item.source === 'github' ? styles.badgeGithub : styles.badgePaste,
            ]}
          >
            <Text style={styles.sourceBadgeText}>
              {item.source === 'github' ? 'GH' : 'P'}
            </Text>
          </View>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name}
          </Text>
        </View>
        <Text style={styles.cardDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </Pressable>
    ),
    [],
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>CodeLens</Text>
        </View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={{ flexShrink: 1, marginLeft: 16 }}
          contentContainerStyle={styles.headerButtons}
        >
          <Pressable style={styles.chatButton} onPress={handleNewGeneralChat}>
            <Text style={styles.chatButtonText}>Chat</Text>
          </Pressable>
          <Pressable
            style={styles.learnButton}
            onPress={() => router.push('/learning')}
          >
            <Text style={styles.learnButtonText}>Learn</Text>
          </Pressable>
          <Pressable
            style={styles.devButton}
            onPress={() => router.push('/dev')}
          >
            <Text style={styles.devButtonText}>Dev</Text>
          </Pressable>
          <Pressable
            style={styles.sandboxButton}
            onPress={() => router.push('/sandboxtexttesting')}
          >
            <Text style={styles.sandboxButtonText}>Sandbox</Text>
          </Pressable>
          <Pressable
            style={styles.settingsButton}
            onPress={() => router.push('/settings')}
          >
            <Text style={styles.settingsButtonText}>S</Text>
          </Pressable>
        </ScrollView>
      </View>

      {recentChats.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={styles.recentTitle}>Recent Chats</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentScroll}
          >
            {recentChats.map((chat) => (
              <Pressable
                key={chat.id}
                style={styles.recentChat}
                onPress={() => openChat(chat)}
              >
                <Text style={styles.recentChatScope}>
                  {chat.scope === 'section' ? 'SEC' : chat.scope === 'general' ? 'GEN' : 'LRN'}
                </Text>
                <Text style={styles.recentChatTitle} numberOfLines={1}>
                  {chat.title}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {isLoading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Loading...</Text>
        </View>
      ) : sorted.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No projects yet</Text>
          <Text style={styles.emptyHint}>
            Import a GitHub repo or paste some code to get started.
          </Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          renderItem={renderProject}
          contentContainerStyle={styles.list}
        />
      )}

      <Pressable
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      <NewProjectModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onCreated={handleProjectCreated}
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    marginTop: spacing.xs,
  },
  headerButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
    flex: 1,
    marginLeft: spacing.md,
  },
  chatButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: 6,
  },
  chatButtonText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  learnButton: {
    backgroundColor: `${colors.purple}30`,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: 6,
  },
  learnButtonText: {
    color: colors.purple,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  devButton: {
    backgroundColor: colors.surfaceLight,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: 6,
  },
  devButtonText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  sandboxButton: {
    backgroundColor: 'rgba(152, 195, 121, 0.18)',
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: 6,
  },
  sandboxButtonText: {
    color: colors.green,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  settingsButton: {
    backgroundColor: colors.surfaceLight,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: 6,
  },
  settingsButtonText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  recentSection: {
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  recentTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  recentScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  recentChat: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: 200,
  },
  recentChatScope: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  recentChatTitle: {
    color: colors.text,
    fontSize: fontSize.sm,
    flex: 1,
  },
  list: {
    padding: spacing.lg,
    paddingBottom: 100,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sourceBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeGithub: {
    backgroundColor: 'rgba(96, 139, 219, 0.2)',
  },
  badgePaste: {
    backgroundColor: 'rgba(152, 195, 121, 0.2)',
  },
  sourceBadgeText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  cardName: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '600',
    flex: 1,
  },
  cardDate: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  emptyContainer: {
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
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '400',
    marginTop: -2,
  },
});
