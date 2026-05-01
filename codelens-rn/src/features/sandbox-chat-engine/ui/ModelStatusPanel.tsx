import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '@/src/ui/theme';
import type { SandboxModelStatus } from '../useSandboxChat';
import { providerLabel } from '../useSandboxChat';

export function ModelStatusPanel({
  status,
  sending,
  onRefresh,
}: {
  status: SandboxModelStatus;
  sending: boolean;
  onRefresh: () => Promise<SandboxModelStatus>;
}) {
  const activeKeySet = status.provider === 'openrouter'
    ? status.openrouterKeySet
    : status.siliconflowKeySet;
  const anyKeySet = status.openrouterKeySet || status.siliconflowKeySet;

  return (
    <View style={styles.modelStatusCard}>
      <View style={styles.modelStatusHeader}>
        <Text style={styles.modelStatusTitle}>Model status</Text>
        <Pressable
          style={[styles.refreshStatusButton, sending && styles.disabledButton]}
          onPress={() => {
            void onRefresh();
          }}
          disabled={sending}
        >
          <Text style={styles.refreshStatusText}>
            {status.loading ? 'Checking...' : 'Refresh'}
          </Text>
        </Pressable>
      </View>
      <Text style={styles.modelStatusLine}>
        General scope: {providerLabel(status.provider)} / {status.model || '(no model)'}
      </Text>
      <View style={styles.keyStatusRow}>
        <KeyStatus label="OpenRouter" active={status.openrouterKeySet} />
        <KeyStatus label="SiliconFlow" active={status.siliconflowKeySet} />
      </View>
      {!anyKeySet ? (
        <Text style={styles.modelWarning}>
          Add an API key in Settings before using Model mode.
        </Text>
      ) : !activeKeySet ? (
        <Text style={styles.modelWarning}>
          Active provider key is missing; fallback may use the other provider.
        </Text>
      ) : null}
    </View>
  );
}

function KeyStatus({ label, active }: { label: string; active: boolean }) {
  return (
    <View
      style={[
        styles.keyStatusBadge,
        active ? styles.keyStatusBadgeActive : styles.keyStatusBadgeMissing,
      ]}
    >
      <Text
        style={[
          styles.keyStatusText,
          active ? styles.keyStatusTextActive : styles.keyStatusTextMissing,
        ]}
      >
        {label}: {active ? 'key set' : 'missing'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  modelStatusCard: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#121722',
    padding: spacing.sm,
    gap: spacing.xs,
  },
  modelStatusHeader: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  modelStatusTitle: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  refreshStatusButton: {
    minHeight: 28,
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceLight,
  },
  refreshStatusText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  modelStatusLine: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  keyStatusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  keyStatusBadge: {
    minHeight: 28,
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
  },
  keyStatusBadgeActive: {
    borderColor: 'rgba(152, 195, 121, 0.4)',
    backgroundColor: 'rgba(152, 195, 121, 0.1)',
  },
  keyStatusBadgeMissing: {
    borderColor: 'rgba(224, 108, 117, 0.4)',
    backgroundColor: 'rgba(224, 108, 117, 0.1)',
  },
  keyStatusText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  keyStatusTextActive: {
    color: colors.green,
  },
  keyStatusTextMissing: {
    color: colors.red,
  },
  modelWarning: {
    color: colors.yellow,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  disabledButton: {
    opacity: 0.6,
  },
});