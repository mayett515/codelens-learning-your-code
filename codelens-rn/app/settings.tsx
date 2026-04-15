import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSize, spacing } from '@/src/ui/theme';

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.sub}>Phase 3 — providers, models, API keys, backup</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  title: { color: colors.text, fontSize: fontSize.xl, fontWeight: '700' },
  sub: { color: colors.textSecondary, fontSize: fontSize.md, marginTop: spacing.sm },
});
