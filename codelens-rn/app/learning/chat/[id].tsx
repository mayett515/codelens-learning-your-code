import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { colors, fontSize, spacing } from '@/src/ui/theme';

export default function LearningChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Learning Review Chat</Text>
      <Text style={styles.sub}>Concept ID: {id}</Text>
      <Text style={styles.sub}>Phase 4 — AI review with semantic retrieval</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  title: { color: colors.text, fontSize: fontSize.xl, fontWeight: '700' },
  sub: { color: colors.textSecondary, fontSize: fontSize.md, marginTop: spacing.sm },
});
