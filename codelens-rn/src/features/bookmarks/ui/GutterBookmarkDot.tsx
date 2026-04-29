import { StyleSheet, View } from 'react-native';
import { FALLBACK_BOOKMARK_COLOR } from '../data/defaultPalette';

interface Props {
  colorHex?: string | null | undefined;
}

export function GutterBookmarkDot({ colorHex }: Props) {
  return (
    <View
      style={[
        styles.dot,
        { backgroundColor: colorHex ?? FALLBACK_BOOKMARK_COLOR },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    left: 4,
    top: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
