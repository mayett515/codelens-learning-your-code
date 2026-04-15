import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSize, spacing } from '@/src/ui/theme';
import { initDatabase } from '@/src/db/client';
import { vectorStore } from '@/src/composition';
import * as projectQueries from '@/src/db/queries/projects';
import * as conceptQueries from '@/src/db/queries/concepts';
import {
  projectId,
  conceptId,
  type ConceptId,
} from '@/src/domain/types';

export default function DevScreen() {
  const [log, setLog] = useState<string[]>([]);

  function appendLog(msg: string) {
    setLog((prev) => [...prev, `[${new Date().toISOString().slice(11, 19)}] ${msg}`]);
  }

  async function runSmokeTest() {
    setLog([]);
    try {
      appendLog('Initializing database...');
      initDatabase();
      appendLog('Database initialized');

      appendLog('Cleaning up any stale test data...');
      const pid = projectId('test-project-1');
      const concept1Id = conceptId('concept-closure');
      const concept2Id = conceptId('concept-promise');
      const concept3Id = conceptId('concept-monad');
      try { await vectorStore.deleteAll(); } catch {}
      try { await conceptQueries.deleteConcept(concept1Id); } catch {}
      try { await conceptQueries.deleteConcept(concept2Id); } catch {}
      try { await conceptQueries.deleteConcept(concept3Id); } catch {}
      try { await projectQueries.deleteProject(pid); } catch {}

      appendLog('Inserting test project...');
      await projectQueries.insertProject({
        id: pid,
        name: 'Smoke Test Project',
        source: 'paste',
        createdAt: new Date().toISOString(),
      });
      appendLog('Project inserted');

      const projects = await projectQueries.getAllProjects();
      appendLog(`Projects in DB: ${projects.length}`);

      appendLog('Inserting test concepts...');
      const now = new Date().toISOString();
      for (const c of [
        { id: concept1Id, name: 'Closure', summary: 'A function that captures its lexical scope' },
        { id: concept2Id, name: 'Promise', summary: 'A placeholder for an async computation result' },
        { id: concept3Id, name: 'Monad', summary: 'A design pattern for chaining computations' },
      ]) {
        await conceptQueries.insertConcept({
          ...c,
          taxonomy: { tags: ['programming'] },
          sessionIds: [],
          strength: 0.5,
          createdAt: now,
          updatedAt: now,
        });
      }
      appendLog('3 concepts inserted');

      appendLog('Generating stub vectors (384-dim)...');
      const vec1 = makeStubVector(384, 1);
      const vec2 = makeStubVector(384, 2);
      const vec3 = makeStubVector(384, 3);

      for (const [id, vec] of [
        [concept1Id, vec1],
        [concept2Id, vec2],
        [concept3Id, vec3],
      ] as [ConceptId, Float32Array][]) {
        await vectorStore.upsert({
          id,
          vector: vec,
          model: 'stub-384',
          api: 'openrouter',
          signature: `sig-${id}`,
          updatedAt: now,
        });
      }
      appendLog('3 vectors upserted into vec0');

      appendLog('Running topMatches query (searching near vec1)...');
      const queryVec = makeStubVector(384, 1);
      const matches = await vectorStore.topMatches({
        vector: queryVec,
        limit: 3,
      });
      appendLog(`Top matches returned: ${matches.length}`);
      for (const m of matches) {
        const concept = await conceptQueries.getConceptById(m.id);
        appendLog(`  ${concept?.name ?? m.id}: cosine=${m.cosine.toFixed(4)}`);
      }

      appendLog('Cleaning up test data...');
      await vectorStore.deleteAll();
      await conceptQueries.deleteConcept(concept1Id);
      await conceptQueries.deleteConcept(concept2Id);
      await conceptQueries.deleteConcept(concept3Id);
      await projectQueries.deleteProject(pid);
      appendLog('Cleanup done');

      appendLog('RAG SMOKE TEST PASSED');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      appendLog(`ERROR: ${msg}`);
      if (err instanceof Error && err.stack) {
        appendLog(err.stack.split('\n').slice(0, 3).join('\n'));
      }
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Dev Smoke Test</Text>
      <Text style={styles.sub}>
        Tests: DB init, project CRUD, concept CRUD, vec0 upsert, topMatches query
      </Text>

      <Pressable style={styles.button} onPress={runSmokeTest}>
        <Text style={styles.buttonText}>Run RAG Smoke Test</Text>
      </Pressable>

      <ScrollView style={styles.logContainer}>
        {log.map((line, i) => (
          <Text
            key={i}
            style={[
              styles.logLine,
              line.includes('ERROR') && styles.errorLine,
              line.includes('PASSED') && styles.passLine,
            ]}
          >
            {line}
          </Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStubVector(dim: number, seed: number): Float32Array {
  const vec = new Float32Array(dim);
  for (let i = 0; i < dim; i++) {
    vec[i] = Math.sin(seed * (i + 1) * 0.01);
  }
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  for (let i = 0; i < dim; i++) {
    vec[i] /= norm;
  }
  return vec;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  sub: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  buttonText: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  logContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.sm,
  },
  logLine: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  errorLine: {
    color: colors.red,
  },
  passLine: {
    color: colors.green,
    fontWeight: '700',
  },
});
