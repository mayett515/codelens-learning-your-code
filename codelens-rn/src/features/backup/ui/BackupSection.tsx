import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { colors, fontSize, spacing } from '../../../ui/theme';
import { exportBackup } from '../export';
import { importBackup, type ImportResult } from '../import';
import { clearAllData } from '../clear';
import { ConfirmClearModal } from './ConfirmClearModal';
import { ImportResultModal } from './ImportResultModal';

export interface BackupSectionProps {
  onFlash: (msg: string) => void;
}

/**
 * Settings-screen section that exposes export / import / clear.
 * Re-uses the parent's flash toast callback for consistency with the rest of
 * the settings screen.
 */
export function BackupSection({ onFlash }: BackupSectionProps) {
  const qc = useQueryClient();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const busy = exporting || importing;

  async function handleExport() {
    if (busy) return;
    setExporting(true);
    try {
      const r = await exportBackup();
      const mb = (r.sizeBytes / 1_048_576).toFixed(2);
      onFlash(`Exported ${r.fileName} (${mb} MB)`);
    } catch (e) {
      onFlash(`Export failed: ${errMsg(e)}`);
    } finally {
      setExporting(false);
    }
  }

  async function handleImport() {
    if (busy) return;
    setImporting(true);
    try {
      const r = await importBackup();
      setImportResult(r);
      // Blow away every cached query — UI must reflect the restored data.
      await qc.invalidateQueries();
    } catch (e) {
      const msg = errMsg(e);
      if (msg !== 'Import cancelled') onFlash(`Restore failed: ${msg}`);
    } finally {
      setImporting(false);
    }
  }

  async function handleClearConfirmed(opts: { includeApiKeys: boolean }) {
    await clearAllData(opts);
    await qc.invalidateQueries();
    setClearOpen(false);
    onFlash('All data cleared');
  }

  return (
    <View>
      <Text style={styles.sectionTitle}>Data</Text>

      <Pressable
        style={[styles.btn, busy && styles.btnDisabled]}
        onPress={handleExport}
        disabled={busy}
      >
        {exporting ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <>
            <Text style={styles.btnLabel}>Export backup</Text>
            <Text style={styles.btnHint}>
              Download all your data as a .codelens file.
            </Text>
          </>
        )}
      </Pressable>

      <Pressable
        style={[styles.btn, busy && styles.btnDisabled]}
        onPress={handleImport}
        disabled={busy}
      >
        {importing ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <>
            <Text style={styles.btnLabel}>Restore from backup</Text>
            <Text style={styles.btnHint}>
              Import a .codelens file. Replaces all current data.
            </Text>
          </>
        )}
      </Pressable>

      <Pressable
        style={[styles.btn, styles.danger, busy && styles.btnDisabled]}
        onPress={() => setClearOpen(true)}
        disabled={busy}
      >
        <Text style={[styles.btnLabel, styles.dangerText]}>Clear all data</Text>
        <Text style={styles.btnHint}>Delete everything. Cannot be undone.</Text>
      </Pressable>

      <ConfirmClearModal
        visible={clearOpen}
        onClose={() => setClearOpen(false)}
        onConfirm={handleClearConfirmed}
      />

      <ImportResultModal
        visible={importResult !== null}
        result={importResult}
        onClose={() => setImportResult(null)}
      />
    </View>
  );
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'unknown error';
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  btn: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnLabel: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  btnHint: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  danger: {
    borderColor: colors.red,
  },
  dangerText: {
    color: colors.red,
  },
});
