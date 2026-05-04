import { StyleSheet, TextInput } from 'react-native';
import { colors, fontSize, spacing } from '../../../../ui/theme';
import { getActiveDomainProfile } from '@/src/features/ontology';

export function ReflectionInput(props: {
  value: string;
  onChangeText: (value: string) => void;
}) {
  const profile = getActiveDomainProfile();

  return (
    <TextInput
      style={styles.input}
      value={props.value}
      onChangeText={props.onChangeText}
      placeholder={profile.review.reflectPlaceholder}
      placeholderTextColor={colors.textSecondary}
      multiline
      maxLength={2000}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.text,
    fontSize: fontSize.md,
    padding: spacing.md,
    textAlignVertical: 'top',
    backgroundColor: colors.surface,
  },
});
