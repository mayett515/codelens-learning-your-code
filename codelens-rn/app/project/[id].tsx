import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { colors, fontSize, spacing } from '@/src/ui/theme';

export default function ProjectViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Project Viewer</Text>
      <Text style={styles.sub}>Project ID: {id}</Text>
      <Text style={styles.sub}>Phase 2 — code viewer, marks, file picker</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  title: { color: colors.text, fontSize: fontSize.xl, fontWeight: '700' },
  sub: { color: colors.textSecondary, fontSize: fontSize.md, marginTop: spacing.sm },
});
