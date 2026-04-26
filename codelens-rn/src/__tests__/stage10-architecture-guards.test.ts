import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '..', '..');
const sourceRoots = ['app', 'src'] as const;
const textExtensions = new Set(['.ts', '.tsx', '.js', '.jsx']);
const excludedFiles = new Set([
  path.normalize('src/ai/vocab.json'),
]);

function toRepoPath(filePath: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.expo') return [];
      return walk(fullPath);
    }

    if (!textExtensions.has(path.extname(entry.name))) return [];
    if (excludedFiles.has(path.normalize(toRepoPath(fullPath)))) return [];
    return [fullPath];
  });
}

function sourceFiles(): string[] {
  return sourceRoots.flatMap((root) => walk(path.join(repoRoot, root)));
}

function read(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

describe('Stage 10 Phase A architecture guards', () => {
  it('keeps TanStack query keys factory-owned in learning code', () => {
    const offenders = sourceFiles()
      .filter((filePath) => toRepoPath(filePath).startsWith('src/features/learning/'))
      .filter((filePath) => !toRepoPath(filePath).endsWith('/data/query-keys.ts'))
      .filter((filePath) => /queryKey\s*:\s*\[/.test(read(filePath)))
      .map(toRepoPath);

    expect(offenders).toEqual([]);
  });

  it('keeps Stage 8 persona prompt composition out of extractor code', () => {
    const offenders = sourceFiles()
      .filter((filePath) => toRepoPath(filePath).includes('/extractor/'))
      .filter((filePath) => /personas?/.test(read(filePath)))
      .map(toRepoPath);

    expect(offenders).toEqual([]);
  });

  it('keeps future Stage 3 cards free of density or variant props', () => {
    const forbiddenPropPattern = /\b(variant|density|mode|isCompact|isFull)\??\s*:/;
    const offenders = sourceFiles()
      .filter((filePath) => toRepoPath(filePath).startsWith('src/features/learning/ui/cards/'))
      .filter((filePath) => forbiddenPropPattern.test(read(filePath)))
      .map(toRepoPath);

    expect(offenders).toEqual([]);
  });

  it('keeps future Stage 9 graph code on the native Skia path', () => {
    const forbiddenBackendPattern = /WebView|react-native-webview|react-native-svg|cytoscape/i;
    const offenders = sourceFiles()
      .filter((filePath) => toRepoPath(filePath).startsWith('src/features/graph/'))
      .filter((filePath) => forbiddenBackendPattern.test(read(filePath)))
      .map(toRepoPath);

    expect(offenders).toEqual([]);
  });
});
