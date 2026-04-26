import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../../../ui/theme';
import type { LearningSession } from '../../../domain/types';

interface SessionCardsSectionProps {
  sessions: LearningSession[];
  onOpenSession: (id: string) => void;
}

export function SessionCardsSection({ sessions, onOpenSession }: SessionCardsSectionProps) {
  if (sessions.length === 0) {
    return (
      <View style={styles.section}>
        <SectionHeader title="Session Cards" />
        <Text style={styles.empty}>Your saved work sessions will appear here.</Text>
      </View>
    );
  }

  const groups = groupSessions(sessions);
  return (
    <View style={styles.section}>
      <SectionHeader title="Session Cards" meta="Recent 5" />
      {groups.map((group) => (
        <View key={group.label} style={styles.group}>
          <Text style={styles.groupLabel}>{group.label}</Text>
          {group.sessions.map((session) => (
            <SessionCardCompact key={session.id} session={session} onPress={() => onOpenSession(session.id)} />
          ))}
        </View>
      ))}
    </View>
  );
}

function SessionCardCompact({
  session,
  onPress,
}: {
  session: LearningSession;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Text style={styles.cardTitle} numberOfLines={1}>{session.title || formatDate(session.createdAt)}</Text>
      <Text style={styles.cardMeta}>
        {session.conceptIds.length} concept{session.conceptIds.length === 1 ? '' : 's'} - {formatDate(session.createdAt)}
      </Text>
      <Text style={styles.origin} numberOfLines={1}>{session.source}</Text>
    </Pressable>
  );
}

function groupSessions(sessions: LearningSession[]) {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfWeek = startOfToday - 6 * 24 * 60 * 60 * 1000;
  const groups = [
    { label: 'Today', sessions: [] as LearningSession[] },
    { label: 'This Week', sessions: [] as LearningSession[] },
    { label: 'Earlier', sessions: [] as LearningSession[] },
  ];

  sessions.forEach((session) => {
    const createdAt = Date.parse(session.createdAt);
    if (createdAt >= startOfToday) groups[0].sessions.push(session);
    else if (createdAt >= startOfWeek) groups[1].sessions.push(session);
    else groups[2].sessions.push(session);
  });

  return groups.filter((group) => group.sessions.length > 0);
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString();
}

function SectionHeader({ title, meta }: { title: string; meta?: string }) {
  return (
    <View style={styles.headerRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '800',
  },
  meta: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  group: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  groupLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  cardTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  cardMeta: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  origin: {
    color: colors.primaryLight,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  empty: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    paddingVertical: spacing.md,
  },
});
