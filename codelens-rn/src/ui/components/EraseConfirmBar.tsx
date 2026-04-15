import { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import { colors, fontSize, spacing } from '../theme';

interface Props {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function EraseConfirmBar({ visible, onConfirm, onCancel }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.bar, { opacity }]}>
      <Text style={styles.text}>Erase mark? Tap again to confirm</Text>
      <View style={styles.actions}>
        <Pressable style={styles.confirmBtn} onPress={onConfirm}>
          <Text style={styles.confirmText}>Erase</Text>
        </Pressable>
        <Pressable style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  text: {
    color: colors.text,
    fontSize: fontSize.md,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  confirmBtn: {
    backgroundColor: colors.red,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: 6,
  },
  confirmText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  cancelBtn: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: 6,
  },
  cancelText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
