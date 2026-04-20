import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors, fontSize, spacing } from '../theme';
import { insertProject } from '@/src/db/queries/projects';
import { insertFile } from '@/src/db/queries/files';
import { fetchGitHubRepo, extractRepoName } from '@/src/lib/github';
import { projectId as makeProjectId, fileId as makeFileId } from '@/src/domain/types';
import { uid } from '@/src/lib/uid';
import type { ProjectId } from '@/src/domain/types';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: (id: ProjectId) => void;
}

type Tab = 'github' | 'paste';

export function NewProjectModal({ visible, onClose, onCreated }: Props) {
  const [tab, setTab] = useState<Tab>('github');
  const [githubUrl, setGithubUrl] = useState('');
  const [pasteName, setPasteName] = useState('');
  const [pasteContent, setPasteContent] = useState('');
  const [pasteFileName, setPasteFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function reset() {
    setGithubUrl('');
    setPasteName('');
    setPasteContent('');
    setPasteFileName('');
    setError('');
    setLoading(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleGitHubImport() {
    if (!githubUrl.trim()) return;
    setLoading(true);
    setError('');

    try {
      const id = makeProjectId(uid());
      const repoName = extractRepoName(githubUrl) ?? 'Imported Repo';
      const files = await fetchGitHubRepo(githubUrl, id);

      if (files.length === 0) {
        setError('No text files found in repository');
        setLoading(false);
        return;
      }

      await insertProject({
        id,
        name: repoName,
        source: 'github',
        githubUrl: githubUrl.trim(),
        createdAt: new Date().toISOString(),
      });

      for (const f of files) {
        await insertFile({
          id: f.id,
          projectId: id,
          path: f.path,
          content: f.content,
          marks: [],
          ranges: [],
        });
      }

      reset();
      onCreated(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
      setLoading(false);
    }
  }

  async function handlePasteCreate() {
    if (!pasteName.trim() || !pasteContent.trim()) return;
    setLoading(true);
    setError('');

    try {
      const id = makeProjectId(uid());
      const fId = makeFileId(uid());
      const fileName = pasteFileName.trim() || 'main.txt';

      await insertProject({
        id,
        name: pasteName.trim(),
        source: 'paste',
        createdAt: new Date().toISOString(),
      });

      await insertFile({
        id: fId,
        projectId: id,
        path: fileName,
        content: pasteContent,
        marks: [],
        ranges: [],
      });

      reset();
      onCreated(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
      setLoading(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior="padding"
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>New Project</Text>
            <Pressable onPress={handleClose} hitSlop={12}>
              <Text style={styles.closeBtn}>X</Text>
            </Pressable>
          </View>

          <View style={styles.tabs}>
            <Pressable
              style={[styles.tab, tab === 'github' && styles.tabActive]}
              onPress={() => setTab('github')}
            >
              <Text
                style={[
                  styles.tabText,
                  tab === 'github' && styles.tabTextActive,
                ]}
              >
                GitHub
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, tab === 'paste' && styles.tabActive]}
              onPress={() => setTab('paste')}
            >
              <Text
                style={[
                  styles.tabText,
                  tab === 'paste' && styles.tabTextActive,
                ]}
              >
                Paste Code
              </Text>
            </Pressable>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {tab === 'github' ? (
              <>
                <Text style={styles.label}>Repository URL</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://github.com/owner/repo"
                  placeholderTextColor={colors.textSecondary}
                  value={githubUrl}
                  onChangeText={setGithubUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                <Text style={styles.hint}>
                  Public repos only. Fetches all text files.
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.label}>Project Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="My Snippet"
                  placeholderTextColor={colors.textSecondary}
                  value={pasteName}
                  onChangeText={setPasteName}
                  editable={!loading}
                />
                <Text style={styles.label}>File Name (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="main.ts"
                  placeholderTextColor={colors.textSecondary}
                  value={pasteFileName}
                  onChangeText={setPasteFileName}
                  autoCapitalize="none"
                  editable={!loading}
                />
                <Text style={styles.label}>Code</Text>
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  placeholder="Paste your code here..."
                  placeholderTextColor={colors.textSecondary}
                  value={pasteContent}
                  onChangeText={setPasteContent}
                  multiline
                  textAlignVertical="top"
                  editable={!loading}
                />
              </>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={[styles.createBtn, loading && styles.createBtnDisabled]}
              onPress={tab === 'github' ? handleGitHubImport : handlePasteCreate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.text} size="small" />
              ) : (
                <Text style={styles.createBtnText}>
                  {tab === 'github' ? 'Import' : 'Create'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  closeBtn: {
    color: colors.textSecondary,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.background,
    padding: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: colors.surfaceLight,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.text,
  },
  body: {
    paddingHorizontal: spacing.lg,
  },
  label: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.text,
    fontSize: fontSize.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  codeInput: {
    minHeight: 120,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: fontSize.sm,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  error: {
    color: colors.red,
    fontSize: fontSize.sm,
    marginTop: spacing.md,
  },
  footer: {
    padding: spacing.lg,
  },
  createBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm + 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  createBtnDisabled: {
    opacity: 0.6,
  },
  createBtnText: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
});
