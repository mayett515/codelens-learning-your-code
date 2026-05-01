import { StyleSheet, Text, View } from 'react-native';
import type {
  SandboxCalculation,
  SandboxCodeLayer,
  SandboxFinding,
  SandboxTerm,
} from '../types';
import { colors, fontSize, spacing } from '@/src/ui/theme';

export function InspectorContent({
  value,
}: {
  value: ReturnType<typeof import('../engine').resolveInspectorTarget> | null;
}) {
  if (!value) {
    return (
      <View style={styles.inspectorCard}>
        <Text style={styles.inspectorTitle}>Nothing selected</Text>
      </View>
    );
  }

  if (isTerm(value)) {
    return <TermInspector term={value} />;
  }

  if (isCalculation(value)) {
    return <CalculationInspector calculation={value} />;
  }

  if (isFinding(value)) {
    return <FindingInspector finding={value} />;
  }

  if (isLayer(value)) {
    return <LayerInspector layer={value} />;
  }

  return (
    <View style={styles.inspectorCard}>
      <Text style={styles.inspectorTitle}>Unknown inspector target</Text>
    </View>
  );
}

function TermInspector({ term }: { term: SandboxTerm }) {
  return (
    <View style={styles.inspectorCard}>
      <Text style={styles.inspectorMeta}>
        Term / {term.category}
        {term.subcategory ? ` / ${term.subcategory}` : ''}
      </Text>
      <Text style={styles.inspectorTitle}>{term.label}</Text>
      <Text style={styles.inspectorSummary}>{term.summary}</Text>
      <Text style={styles.inspectorBody}>{term.detail}</Text>
      {term.relatedTermIds.length > 0 ? (
        <Text style={styles.relatedTerms}>
          related: {term.relatedTermIds.join(', ')}
        </Text>
      ) : null}
      {term.promptHook ? (
        <Text style={styles.promptHook}>{term.promptHook}</Text>
      ) : null}
      <Text style={styles.depthLabel}>
        depth: {term.depth ?? 'moderate'}
      </Text>
    </View>
  );
}

function CalculationInspector({
  calculation,
}: {
  calculation: SandboxCalculation;
}) {
  return (
    <View style={styles.inspectorCard}>
      <Text style={styles.inspectorMeta}>Calculation / {calculation.kind}</Text>
      <Text style={styles.inspectorTitle}>{calculation.title}</Text>
      <View style={styles.stepList}>
        {calculation.steps.map((step, index) => (
          <View key={`${calculation.id}-${index}`} style={styles.stepRow}>
            <Text style={styles.stepLabel}>{step.label}</Text>
            <Text style={styles.stepValue}>
              {step.value} {step.unit}
            </Text>
            {step.note ? <Text style={styles.stepNote}>{step.note}</Text> : null}
          </View>
        ))}
      </View>
      <Text style={styles.inspectorBody}>{calculation.conclusion}</Text>
    </View>
  );
}

function FindingInspector({ finding }: { finding: SandboxFinding }) {
  return (
    <View style={styles.inspectorCard}>
      <View style={styles.findingBadgeRow}>
        <Text
          style={[
            styles.findingSeverityBadge,
            { color: severityColor(finding.severity) },
          ]}
        >
          {finding.severity}
        </Text>
        <Text style={styles.findingCategoryBadge}>{finding.category}</Text>
      </View>
      <Text style={styles.inspectorTitle}>{finding.title}</Text>
      <Text style={styles.inspectorBody}>{finding.description}</Text>
      {finding.lineStart != null && finding.lineEnd != null ? (
        <Text style={styles.lineRange}>
          lines {finding.lineStart}-{finding.lineEnd}
        </Text>
      ) : null}
      {finding.suggestedFix ? (
        <Text style={styles.suggestedFix}>Fix: {finding.suggestedFix}</Text>
      ) : null}
    </View>
  );
}

function LayerInspector({ layer }: { layer: SandboxCodeLayer }) {
  return (
    <View style={styles.inspectorCard}>
      <Text style={styles.inspectorMeta}>{layer.kind}</Text>
      <Text style={styles.inspectorTitle}>{layer.title}</Text>
      <Text style={styles.inspectorSummary}>{layer.summary}</Text>
      <Text style={styles.inspectorBody}>{layer.detail}</Text>
      <Text style={styles.lineRange}>
        lines {layer.lineStart}-{layer.lineEnd}
      </Text>
    </View>
  );
}

function isTerm(value: unknown): value is SandboxTerm {
  return (
    value != null &&
    typeof (value as SandboxTerm).label === 'string' &&
    Array.isArray((value as SandboxTerm).spans)
  );
}

function isCalculation(value: unknown): value is SandboxCalculation {
  return (
    value != null &&
    Array.isArray((value as SandboxCalculation).steps)
  );
}

function isFinding(value: unknown): value is SandboxFinding {
  return (
    value != null &&
    typeof (value as SandboxFinding).severity === 'string'
  );
}

function isLayer(value: unknown): value is SandboxCodeLayer {
  return (
    value != null &&
    typeof (value as SandboxCodeLayer).lineStart === 'number' &&
    typeof (value as SandboxCodeLayer).lineEnd === 'number' &&
    !isFinding(value)
  );
}

function severityColor(severity: SandboxFinding['severity']): string {
  switch (severity) {
    case 'critical':
    case 'high':
      return colors.red;
    case 'medium':
      return colors.orange;
    case 'low':
      return colors.yellow;
    case 'info':
      return colors.blue;
    default:
      return colors.textSecondary;
  }
}

const styles = StyleSheet.create({
  inspectorCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  inspectorMeta: {
    color: colors.primaryLight,
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  inspectorTitle: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  inspectorSummary: {
    color: colors.text,
    fontSize: fontSize.md,
    lineHeight: 21,
    marginTop: spacing.sm,
  },
  inspectorBody: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    lineHeight: 21,
    marginTop: spacing.md,
  },
  relatedTerms: {
    color: colors.blue,
    fontSize: fontSize.sm,
    lineHeight: 18,
    marginTop: spacing.md,
  },
  promptHook: {
    color: colors.yellow,
    fontSize: fontSize.sm,
    lineHeight: 18,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: 6,
    backgroundColor: 'rgba(229, 192, 123, 0.1)',
  },
  depthLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  findingBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  findingSeverityBadge: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  findingCategoryBadge: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  lineRange: {
    color: colors.blue,
    fontSize: fontSize.sm,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  suggestedFix: {
    color: colors.green,
    fontSize: fontSize.sm,
    lineHeight: 18,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: 6,
    backgroundColor: 'rgba(152, 195, 121, 0.1)',
  },
  stepList: {
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  stepRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  stepValue: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  stepNote: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontStyle: 'italic',
  },
});
