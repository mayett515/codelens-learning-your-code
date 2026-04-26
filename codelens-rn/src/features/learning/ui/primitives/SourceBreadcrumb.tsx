import { Text, StyleSheet } from 'react-native';
import { colors, fontSize } from '../../../../ui/theme';

interface SourceBreadcrumbProps {
  fileName?: string | null | undefined;
  filePath?: string | null | undefined;
  startLine?: number | null | undefined;
  endLine?: number | null | undefined;
  relativeTime?: string | undefined;
  sessionLabel?: string | null | undefined;
  compact?: boolean;
}

export function SourceBreadcrumb(props: SourceBreadcrumbProps) {
  const path = props.compact
    ? props.fileName ?? fileNameFromPath(props.filePath)
    : props.filePath ?? props.fileName;
  const lines = props.startLine
    ? `lines ${props.startLine}${props.endLine ? `-${props.endLine}` : ''}`
    : null;
  const parts = [path ?? props.sessionLabel ?? 'chat', props.compact ? null : lines, props.relativeTime]
    .filter(Boolean)
    .join(' · ');

  return (
    <Text style={styles.text} numberOfLines={1}>
      {parts}
    </Text>
  );
}

function fileNameFromPath(path?: string | null): string | null {
  if (!path) return null;
  return path.split(/[\\/]/).pop() ?? path;
}

const styles = StyleSheet.create({
  text: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
});
