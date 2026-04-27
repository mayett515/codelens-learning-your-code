import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../../../../ui/theme';

export function ReviewResultScreen(props: {
  conceptName: string;
  onDone: () => void;
  onOpenConcept: () => void;
  onContinueInChat?: (() => void) | undefined;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{props.conceptName}</Text>
      <Text style={styles.body}>Review saved.</Text>
      <Pressable style={styles.primary} onPress={props.onDone}>
        <Text style={styles.primaryText}>Done</Text>
      </Pressable>
      {props.onContinueInChat ? (
        <Pressable style={styles.secondary} onPress={props.onContinueInChat}>
          <Text style={styles.secondaryText}>Continue in chat</Text>
        </Pressable>
      ) : null}
      <Pressable style={styles.secondary} onPress={props.onOpenConcept}>
        <Text style={styles.secondaryText}>Open this concept</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '800',
  },
  body: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  primary: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  primaryText: {
    color: colors.text,
    fontWeight: '700',
  },
  secondary: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
});
