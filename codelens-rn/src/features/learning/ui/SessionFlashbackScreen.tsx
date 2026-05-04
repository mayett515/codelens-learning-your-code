import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../../../ui/theme';
import { getActiveDomainProfile } from '@/src/features/ontology';
import { CaptureChip } from './cards/CaptureChip';
import type { LearningSession } from '../../../domain/types';
import type { LearningCapture } from '../types/learning';

interface SessionFlashbackScreenProps {
  session: LearningSession | undefined;
  captures: LearningCapture[];
}

export function SessionFlashbackScreen({ session, captures }: SessionFlashbackScreenProps) {
  const profile = getActiveDomainProfile();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.banner}>
        <Text style={styles.bannerText}>{profile.labels.flashback.bannerPrefix}{session ? formatDate(session.createdAt) : profile.labels.flashback.unknownDateLabel}</Text>
      </View>
      <Text style={styles.title}>{session?.title ?? profile.labels.flashback.fallbackTitle}</Text>
      <Text style={styles.meta}>
        {session ? profile.labels.flashback.conceptCountTemplate
          .replace('{count}', String(session.conceptIds.length))
          .replace('{itemLabel}', session.conceptIds.length === 1 ? profile.labels.flashback.conceptCountSingularLabel : profile.labels.flashback.conceptCountPluralLabel)
          : profile.labels.flashback.noMetadataLabel}
        {captures.length > 0 ? ` - ${profile.labels.flashback.captureCountTemplate
          .replace('{count}', String(captures.length))
          .replace('{captureLabel}', captures.length === 1 ? profile.labels.flashback.captureCountSingularLabel : profile.labels.flashback.captureCountPluralLabel)}` : ''}
      </Text>
      <View style={styles.memoryPane}>
        <Text style={styles.memoryTitle}>{profile.labels.flashback.savedSectionTitle}</Text>
        {captures.length === 0 ? (
          <Text style={styles.memoryText}>{profile.labels.flashback.emptyLabel}</Text>
        ) : (
          captures.map((capture) => (
            <CaptureChip key={capture.id} label={capture.title} sublabel={capture.whatClicked} />
          ))
        )}
      </View>
    </ScrollView>
  );
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString();
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#11131a',
  },
  content: {
    padding: spacing.lg,
  },
  banner: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: '#171a24',
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  bannerText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: '800',
  },
  meta: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    marginTop: spacing.sm,
  },
  memoryPane: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: '#181b25',
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  memoryTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  memoryText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
});
