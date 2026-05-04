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

describe('Ontology correction evidence guards', () => {
  // These guards enforce that ontology correction evidence stays in the
  // ontology feature and remains domain-only at this stage - no persistence,
  // no automatic profile mutations, no cross-feature imports.

  it('OntologyCorrectionEvidence exists in src/features/ontology/types.ts', () => {
    const typesSrc = read('src/features/ontology/types.ts');
    expect(typesSrc).toMatch(/export interface OntologyCorrectionEvidence\s*\{/);
    expect(typesSrc).toMatch(/id:\s*string/);
    expect(typesSrc).toMatch(/profileId:\s*string/);
    expect(typesSrc).toMatch(/subjectKind:\s*OntologyCorrectionSubjectKind/);
    expect(typesSrc).toMatch(/subjectId:\s*string/);
    expect(typesSrc).toMatch(/field:\s*OntologyCorrectionField/);
    expect(typesSrc).toMatch(/previousTypeNodeId:\s*string\s*\|\s*null/);
    expect(typesSrc).toMatch(/correctedTypeNodeId:\s*string/);
    expect(typesSrc).toMatch(/reason\?:\s*string\s*\|\s*null/);
    expect(typesSrc).toMatch(/source:\s*OntologyCorrectionSource/);
    expect(typesSrc).toMatch(/createdAt:\s*number/);
  });

  it('OntologyCorrectionField is currently only typeNodeId', () => {
    const typesSrc = read('src/features/ontology/types.ts');
    // The type alias must be exactly 'typeNodeId' - no union, no extras
    const match = typesSrc.match(
      /export type OntologyCorrectionField\s*=\s*['"]([^'"]+)['"]\s*;/
    );
    expect(match).toBeTruthy();
    expect(match![1]).toBe('typeNodeId');
    // No union alternatives
    expect(typesSrc).not.toMatch(
      /export type OntologyCorrectionField\s*=\s*['"][^'"]+['"]\s*\|/
    );
  });

  it('OntologyCorrectionSource is currently only user', () => {
    const typesSrc = read('src/features/ontology/types.ts');
    // The type alias must be exactly 'user' - no union, no extras
    const match = typesSrc.match(
      /export type OntologyCorrectionSource\s*=\s*['"]([^'"]+)['"]\s*;/
    );
    expect(match).toBeTruthy();
    expect(match![1]).toBe('user');
    // No union alternatives
    expect(typesSrc).not.toMatch(
      /export type OntologyCorrectionSource\s*=\s*['"][^'"]+['"]\s*\|/
    );
  });

  it('validateOntologyCorrection is exported from src/features/ontology/index.ts', () => {
    const indexSrc = read('src/features/ontology/index.ts');
    expect(indexSrc).toContain("export { validateOntologyCorrection } from './corrections';");
  });

  it('src/features/ontology/corrections.ts does not import from forbidden layers', () => {
    const correctionsSrc = read('src/features/ontology/corrections.ts');
    // Must not import from persistence, backup, learning, or graph layers
    expect(correctionsSrc).not.toMatch(/from\s+['"][^'"]*(?:\/db|features\/backup|features\/learning|features\/graph)[^'"]*['"]/);
  });

  it('no ontology_corrections or ontology_patch_suggestions table/string exists under src yet', () => {
    const offenders = sourceFiles()
      .filter((filePath) => {
        const content = read(filePath);
        return /ontology_corrections|ontology_patch_suggestions/.test(content);
      })
      .map(toRepoPath);

    // Only allowed in comment context (test files and design docs),
    // not in codegen, migration, or schema definitions.
    const actualOffenders = offenders.filter(
      (p) => !p.startsWith('ONTOLOGY_PROFILE_REFACTOR/') && !p.endsWith('.test.ts') && !p.endsWith('NEXT_LLM_CONTEXT.md')
    );
    expect(actualOffenders).toEqual([]);
  });

  it('no automatic profile mutation helper exists in src/features/ontology/corrections.ts', () => {
    const correctionsSrc = read('src/features/ontology/corrections.ts');
    // Must not contain obvious mutation helpers
    expect(correctionsSrc).not.toMatch(/\bapplyOntologyCorrection\b/);
    expect(correctionsSrc).not.toMatch(/\bmutateProfile\b/);
    expect(correctionsSrc).not.toMatch(/\bapplyProfilePatch\b/);
    // The file must export only the validation helper
    const exportCount = (correctionsSrc.match(/^export /gm) || []).length;
    expect(exportCount).toBe(1);
  });
});

describe('Ontology-profile naming boundary guards', () => {
  // These guards enforce that renamed fields stay renamed and legacy compat
  // boundaries stay documented. They do NOT globally ban conceptType — only
  // in scopes where it was intentionally renamed to typeNodeId/typeNodeIds.

  it('does not reintroduce conceptType on GraphNode (graph-owned)', () => {
    const graphTypes = read('src/features/graph/types.ts');
    // GraphNode must use typeNodeId, not conceptType
    expect(graphTypes).toMatch(/typeNodeId:\s*ConceptType/);
    expect(graphTypes).not.toMatch(/conceptType:\s*ConceptType/);
    // Also check the visual encoding and query files don't access .conceptType on GraphNode
    const visualEncoding = read('src/features/graph/engine/visualEncoding.ts');
    expect(visualEncoding).not.toMatch(/node\.conceptType/);
    const graphQueries = read('src/features/graph/data/graphQueries.ts');
    // toGraphNode must map to typeNodeId; reading concept.conceptType is the
    // allowed compat mapping from LearningConcept
    expect(graphQueries).toMatch(/typeNodeId:\s*concept\.conceptType/);
    expect(graphQueries).not.toMatch(/conceptType:\s*concept\.conceptType/);
  });

  it('does not reintroduce conceptType/proposedConceptType on promotion-owned type interfaces', () => {
    const promotionTypes = read('src/features/learning/promotion/types/promotion.ts');
    // PromotionConfirmInput must use typeNodeId, not conceptType
    expect(promotionTypes).toMatch(/typeNodeId:\s*ConceptType/);
    expect(promotionTypes).not.toMatch(/\bconceptType:\s*ConceptType/);
    // PromotionReviewModel must use proposedTypeNodeId, not proposedConceptType
    expect(promotionTypes).toMatch(/proposedTypeNodeId:\s*ConceptType/);
    expect(promotionTypes).not.toMatch(/\bproposedConceptType:\s*ConceptType/);
    // ClusterCandidate (which PromotionSuggestion extends) uses proposedTypeNodeId
    expect(promotionTypes).toMatch(/proposedTypeNodeId:\s*ConceptType;/);
    // None of the promotion-owned interfaces should have conceptType as a field
    // (the word "conceptType" should not appear as a field name)
    expect(promotionTypes).not.toMatch(/^\s+(conceptType|proposedConceptType)\s*:/m);
  });

  it('does not reintroduce conceptType on RetrievedConceptPayload (retrieval-owned)', () => {
    const retrievalTypes = read('src/features/learning/retrieval/types/retrieval.ts');
    // RetrievedConceptPayload must use typeNodeId, not conceptType
    expect(retrievalTypes).toMatch(/typeNodeId:\s*ConceptType/);
    // Must not have conceptType as a field on RetrievedConceptPayload
    // (allowing conceptTypes as the legacy filter alias on RetrieveFilters)
    expect(retrievalTypes).not.toMatch(/^\s+conceptType:\s*ConceptType/m);
    // RetrieveFilters must keep typeNodeIds as the preferred filter
    expect(retrievalTypes).toMatch(/typeNodeIds\?:\s*ConceptType\[\]/);
    // RetrieveFilters must keep conceptTypes as the legacy filter alias
    expect(retrievalTypes).toMatch(/conceptTypes\?:\s*ConceptType\[\]/);
  });

  it('keeps ConceptTypeChip as a deprecated wrapper, not a bare re-export', () => {
    const shimSrc = read('src/features/learning/ui/primitives/ConceptTypeChip.tsx');
    // Must be marked @deprecated
    expect(shimSrc).toMatch(/@deprecated/);
    // Must import TypeNodeChip (not re-export as a bare alias)
    expect(shimSrc).toMatch(/import.*TypeNodeChip.*from/);
    // Must define its own component function (not just re-export)
    expect(shimSrc).toMatch(/export function ConceptTypeChip/);
    // Must map the old `type` prop to `typeNodeId` when delegating
    expect(shimSrc).toMatch(/typeNodeId=\{type\}/);
    // Must accept the old `type` prop
    expect(shimSrc).toMatch(/type:\s*ConceptType/);
  });

  it('keeps TypeNodeChip as the primary chip with typeNodeId prop', () => {
    const chipSrc = read('src/features/learning/ui/primitives/TypeNodeChip.tsx');
    expect(chipSrc).toMatch(/export function TypeNodeChip/);
    expect(chipSrc).toMatch(/export interface TypeNodeChipProps/);
    // The interface body must use typeNodeId, not type
    const ifaceBody = chipSrc.match(/export interface TypeNodeChipProps\s*\{([^}]*)\}/);
    expect(ifaceBody).toBeTruthy();
    expect(ifaceBody![1]).not.toMatch(/\btype\s*:/);
    expect(ifaceBody![1]).toMatch(/typeNodeId/);
  });

  it('does not reintroduce conceptType as sole filter on ConceptListFilters (hook-owned)', () => {
    const hookSrc = read('src/features/learning/hooks/useConceptList.ts');
    // ConceptListFilters must expose typeNodeIds as the preferred filter
    expect(hookSrc).toMatch(/typeNodeIds\?:\s*ConceptType\[\]/);
    // ConceptListFilters must keep conceptType as the legacy alias
    expect(hookSrc).toMatch(/conceptType\?:\s*ConceptType/);
    // The filter logic must not be a single-field branch like:
    //   if (filters.conceptType) { ... }
    // It must consider both fields (typeNodeIds and conceptType)
    expect(hookSrc).toMatch(/filters\.typeNodeIds/);
    expect(hookSrc).toMatch(/filters\.conceptType/);
    // The filtering helper must use a union/Set pattern
    expect(hookSrc).toMatch(/new Set<ConceptType>/);
  });
});
