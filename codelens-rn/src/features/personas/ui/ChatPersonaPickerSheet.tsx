import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../../../ui/theme';
import { usePersonas } from '../hooks/usePersonas';
import { useSetChatPersona } from '../hooks/useSetChatPersona';
import { PersonaRowItem } from './PersonaRowItem';
import type { ChatId } from '../../../domain/types';
import type { Persona } from '../types/persona';

interface ChatPersonaPickerSheetProps {
  visible: boolean;
  chatId: ChatId | null | undefined;
  currentPersona: Persona | null | undefined;
  onClose: () => void;
  onPicked?: ((persona: Persona | null) => void) | undefined;
}

export function ChatPersonaPickerSheet({
  visible,
  chatId,
  currentPersona,
  onClose,
  onPicked,
}: ChatPersonaPickerSheetProps) {
  const personas = usePersonas();
  const setPersona = useSetChatPersona(chatId);
  const disabled = setPersona.isPending || !chatId;

  async function selectPersona(persona: Persona | null): Promise<void> {
    await setPersona.mutateAsync(persona?.id ?? null);
    onPicked?.(persona);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Choose a focus</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            <PersonaRowItem
              title="Default (no extra focus)"
              subtitle="Base assistant style"
              active={!currentPersona}
              disabled={disabled}
              onPress={() => void selectPersona(null)}
            />
            {(personas.data ?? []).map((persona) => (
              <PersonaRowItem
                key={persona.id}
                title={persona.name}
                subtitle={persona.description}
                iconEmoji={persona.iconEmoji}
                active={currentPersona?.id === persona.id}
                disabled={disabled}
                onPress={() => void selectPersona(persona)}
              />
            ))}
          </ScrollView>
          {setPersona.error ? (
            <Text style={styles.error}>
              {setPersona.error instanceof Error ? setPersona.error.message : 'Could not update focus'}
            </Text>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    maxHeight: '78%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  close: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  content: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  error: {
    color: colors.red,
    fontSize: fontSize.sm,
  },
});
