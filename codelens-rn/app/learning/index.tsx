import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSize, spacing } from '@/src/ui/theme';

export default function LearningHubScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Learning Hub</Text>
      <Text style={styles.sub}>Phase 4 — concepts, sessions, graph</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  title: { color: colors.text, fontSize: fontSize.xl, fontWeight: '700' },
  sub: { color: colors.textSecondary, fontSize: fontSize.md, marginTop: spacing.sm },
});
