import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../../../../ui/theme';
import type { LearningConcept } from '../../types/learning';

interface NormalizedKeyConflictDialogProps {
  concept: LearningConcept | null;
  onLinkExisting: () => void;
  onEditName: () => void;
}

export function NormalizedKeyConflictDialog(props: NormalizedKeyConflictDialogProps) {
  if (!props.concept) return null;
  return (
    <View style={styles.box}>
      <Text style={styles.title}>Concept already exists</Text>
      <Text style={styles.body}>Link these captures to {props.concept.name} or edit the name.</Text>
      <View style={styles.actions}>
        <Pressable style={styles.secondaryButton} onPress={props.onEditName}>
          <Text style={styles.secondaryText}>Edit name</Text>
        </Pressable>
        <Pressable style={styles.primaryButton} onPress={props.onLinkExisting}>
          <Text style={styles.primaryText}>Link existing</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderColor: colors.yellow,
    borderRadius: 8,
    padding: spacing.md,
    marginVertical: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '800',
  },
  body: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  secondaryButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  secondaryText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  primaryButton: {
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
  },
  primaryText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});
