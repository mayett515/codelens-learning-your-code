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
  // ontology feature. Persistence is allowed only for append-only evidence
  // records; automatic profile mutations and patch target fields stay out.

  it('OntologyCorrectionEvidence exists in src/features/ontology/types.ts', () => {
    const typesSrc = read('src/features/ontology/types.ts');
    expect(typesSrc).toMatch(/export interface OntologyCorrectionEvidence\s*\{/);
    expect(typesSrc).toMatch(/id:\s*string/);
    expect(typesSrc).toMatch(/profileId:\s*string/);
    expect(typesSrc).toMatch(/activeSelectionSnapshot:\s*OntologyCorrectionActiveSelectionSnapshot/);
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

  it('no legacy ontology_corrections or ontology_patch_suggestions table/string exists under src yet', () => {
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

  it('ontology_correction_evidence appears only in the planned persistence boundary', () => {
    const allowedFiles = new Set(
      [
        'src/db/schema.ts',
        'src/db/migrations/015-ontology-correction-evidence.ts',
        'src/db/migrations/017-ontology-correction-raw-proposed-type.ts',
        'src/db/migrations/index.ts',
        'src/features/ontology/data/schema.ts',
        'src/features/ontology/data/ontologyCorrectionEvidenceRepo.ts',
        'src/features/ontology/data/index.ts',
        'src/features/ontology/codecs/ontologyCorrectionEvidence.ts',
        'src/features/backup/format.ts',
        'src/features/backup/export.ts',
        'src/features/backup/import.ts',
        'src/features/backup/clear.ts',
        'src/features/backup/columnMaps.ts',
      ].map((p) => path.normalize(p)),
    );

    const offenders = sourceFiles()
      .filter((filePath) => read(filePath).includes('ontology_correction_evidence'))
      .map(toRepoPath)
      .filter((p) => {
        if (p.endsWith('.test.ts') || p.endsWith('.test.tsx') || p.includes('__tests__/')) return false;
        return !allowedFiles.has(path.normalize(p));
      });
    expect(offenders).toEqual([]);
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

describe('Kortex active-profile overlay state guards', () => {
  // getActiveDomainProfile is a pure seam. It must not accrete module-level
  // mutable overlay state or setter functions that would allow premature
  // runtime profile switching before branch/overlay persistence, UI, and
  // activation decisions are made.

  const ontologyFilePattern = /^src\/features\/ontology\//;

  it('no setActiveDomainProfile setter in src/features/ontology', () => {
    const offenders = sourceFiles()
      .filter((filePath) => ontologyFilePattern.test(toRepoPath(filePath)))
      .filter((filePath) => /\bsetActiveDomainProfile\b/.test(read(filePath)))
      .map(toRepoPath);
    expect(offenders).toEqual([]);
  });

  it('no setActiveProfile setter in src/features/ontology', () => {
    const offenders = sourceFiles()
      .filter((filePath) => ontologyFilePattern.test(toRepoPath(filePath)))
      .filter((filePath) => /\bsetActiveProfile\b/.test(read(filePath)))
      .map(toRepoPath);
    expect(offenders).toEqual([]);
  });

  it('no activeOverlays module-level mutable collection in src/features/ontology', () => {
    const offenders = sourceFiles()
      .filter((filePath) => ontologyFilePattern.test(toRepoPath(filePath)))
      .filter((filePath) => /\bactiveOverlays\b/.test(read(filePath)))
      .map(toRepoPath);
    expect(offenders).toEqual([]);
  });

  it('no activeProfileStore module-level mutable state in src/features/ontology', () => {
    const offenders = sourceFiles()
      .filter((filePath) => ontologyFilePattern.test(toRepoPath(filePath)))
      .filter((filePath) => /\bactiveProfileStore\b/.test(read(filePath)))
      .map(toRepoPath);
    expect(offenders).toEqual([]);
  });

  it('profileActivation.ts exports createActiveDomainProfileSource and resolveActiveDomainProfileFromActivationInput without forbidden state/persistence/runtime strings', () => {
    const activationSrc = read('src/features/ontology/profileActivation.ts');

    // The file must export the explicit activation helpers
    expect(activationSrc).toMatch(/\bcreateActiveDomainProfileSource\b/);
    expect(activationSrc).toMatch(/\bresolveActiveDomainProfileFromActivationInput\b/);

    // The file must not contain forbidden state/persistence/runtime strings
    const forbiddenStrings = [
      'AsyncStorage',
      'sqlite',
      'drizzle',
      'schema',
      'db',
      'zustand',
      'createStore',
      'useActiveDomainProfile',
      'setActiveDomainProfile',
      'setActiveProfile',
      'activeProfileStore',
      'activeOverlays',
      'profile_overlays',
      'profile_branches',
      'active_profile_overlay',
    ] as const;

    for (const forbidden of forbiddenStrings) {
      const regex = new RegExp(`\\b${forbidden}\\b`);
      expect(activationSrc).not.toMatch(regex);
    }
  });
});

describe('Runtime Profile Coordinator guard', () => {
  // The coordinator helper is the explicit above-services boundary.
  // It must export composeRuntimeDomainProfile and RuntimeProfileCoordinatorInput,
  // must delegate to resolveActiveDomainProfileFromActivationInput, and must
  // not contain forbidden state/persistence/runtime strings.

  it('runtimeProfileCoordinator.ts exports the coordinator function and type alias and delegates to the activation input resolver', () => {
    const coordinatorSrc = read('src/features/ontology/runtimeProfileCoordinator.ts');

    // Must export the coordinator entry point
    expect(coordinatorSrc).toMatch(/\bcomposeRuntimeDomainProfile\b/);
    // Must export the input type alias
    expect(coordinatorSrc).toMatch(/\bRuntimeProfileCoordinatorInput\b/);
    // Must delegate to the existing grouped activation pipeline
    expect(coordinatorSrc).toMatch(/\bresolveActiveDomainProfileFromActivationInput\b/);
  });

  it('runtimeProfileCoordinator.ts does not contain forbidden state/persistence/runtime strings', () => {
    const coordinatorSrc = read('src/features/ontology/runtimeProfileCoordinator.ts');

    const forbiddenStrings = [
      'AsyncStorage',
      'sqlite',
      'drizzle',
      'schema',
      'db',
      'zustand',
      'createStore',
      'getRuntimeProfile',
      'useRuntimeProfile',
      'setRuntimeProfile',
      'useActiveDomainProfile',
      'setActiveDomainProfile',
      'setActiveProfile',
      'activeProfileStore',
      'activeOverlays',
      'profile_overlays',
      'profile_branches',
      'active_profile_overlay',
      'prepareSaveCandidates',
    ] as const;

    for (const forbidden of forbiddenStrings) {
      const regex = new RegExp(`\\b${forbidden}\\b`);
      expect(coordinatorSrc).not.toMatch(regex);
    }
  });
});

describe('Kortex future operation name guards', () => {
  // Future Kortex operation names from the language-layer direction
  // (08_KORTEX_LANGUAGE_LAYER_AND_ADAPTERS.md) must not appear in src/
  // production code yet. These names define future protocol operations for
  // agent execution policy and self-building-app workflows. They belong in
  // design docs only at this stage.

  const forbiddenOps = [
    'DefineAgentCore',
    'SetExecutionConstraint',
    'GrantOperation',
    'ForbidOperation',
    'RequireApproval',
    'DefineAppCore',
    'DefineAppEntity',
    'DefineAppWorkflow',
    'AssignSubagent',
  ];

  const isAllowedFile = (p: string) =>
    p.startsWith('ONTOLOGY_PROFILE_REFACTOR/') ||
    p.endsWith('.test.ts') ||
    p.endsWith('.test.tsx') ||
    p.includes('__tests__/');

  for (const opName of forbiddenOps) {
    it(`no ${opName} source implementation under src yet`, () => {
      const offenders = sourceFiles()
        .filter((filePath) => {
          const content = read(filePath);
          return content.includes(opName);
        })
        .map(toRepoPath)
        .filter((p) => !isAllowedFile(p));
      expect(offenders).toEqual([]);
    });
  }
});

describe('Kortex overlay persistence table guards', () => {
  const allowedProfilePersistenceFiles = new Set(
    [
      'src/db/schema.ts',
      'src/db/migrations/012-profile-branches.ts',
      'src/db/migrations/013-profile-selections.ts',
      'src/db/migrations/014-profile-definitions.ts',
      'src/db/migrations/016-profile-change-proposals.ts',
      'src/db/migrations/018-profile-trust-settings.ts',
      'src/db/migrations/019-profile-proposal-events.ts',
      'src/db/migrations/index.ts',
      'src/features/ontology/data/schema.ts',
      'src/features/ontology/data/profileBranchRepo.ts',
      'src/features/ontology/data/profileSelectionRepo.ts',
      'src/features/ontology/data/profileDefinitionRepo.ts',
      'src/features/ontology/data/profileChangeProposalRepo.ts',
      'src/features/ontology/data/profileProposalEventRepo.ts',
      'src/features/ontology/data/profileTrustSettingRepo.ts',
      'src/features/ontology/data/index.ts',
      'src/features/ontology/codecs/profileBranch.ts',
      'src/features/ontology/codecs/profileSelection.ts',
      'src/features/ontology/codecs/profileDefinition.ts',
      'src/features/ontology/codecs/profileChangeProposal.ts',
      'src/features/ontology/codecs/profileProposalEvent.ts',
      'src/features/ontology/codecs/profileTrustSetting.ts',
      'src/features/backup/format.ts',
      'src/features/backup/export.ts',
      'src/features/backup/import.ts',
      'src/features/backup/clear.ts',
      'src/features/backup/columnMaps.ts',
    ].map((p) => path.normalize(p)),
  );

  it('profile_branches is only allowed in planned persistence boundary files and tests', () => {
    const offenders = sourceFiles()
      .filter((filePath) => {
        const content = read(filePath);
        return content.includes('profile_branches');
      })
      .map(toRepoPath)
      .filter((p) => {
        if (p.startsWith('ONTOLOGY_PROFILE_REFACTOR/')) return false;
        if (p.endsWith('.test.ts') || p.endsWith('.test.tsx') || p.includes('__tests__/')) return false;
        return !allowedProfilePersistenceFiles.has(path.normalize(p));
      });
    expect(offenders).toEqual([]);
  });

  it('profile_selections is only allowed in planned persistence boundary files and tests', () => {
    const offenders = sourceFiles()
      .filter((filePath) => {
        const content = read(filePath);
        return content.includes('profile_selections');
      })
      .map(toRepoPath)
      .filter((p) => {
        if (p.startsWith('ONTOLOGY_PROFILE_REFACTOR/')) return false;
        if (p.endsWith('.test.ts') || p.endsWith('.test.tsx') || p.includes('__tests__/')) return false;
        return !allowedProfilePersistenceFiles.has(path.normalize(p));
      });
    expect(offenders).toEqual([]);
  });

  it('profile_definitions is only allowed in planned persistence boundary files and tests', () => {
    const offenders = sourceFiles()
      .filter((filePath) => {
        const content = read(filePath);
        return content.includes('profile_definitions');
      })
      .map(toRepoPath)
      .filter((p) => {
        if (p.startsWith('ONTOLOGY_PROFILE_REFACTOR/')) return false;
        if (p.endsWith('.test.ts') || p.endsWith('.test.tsx') || p.includes('__tests__/')) return false;
        return !allowedProfilePersistenceFiles.has(path.normalize(p));
      });
    expect(offenders).toEqual([]);
  });

  it('profile_change_proposals is only allowed in planned persistence boundary files and tests', () => {
    const offenders = sourceFiles()
      .filter((filePath) => {
        const content = read(filePath);
        return content.includes('profile_change_proposals');
      })
      .map(toRepoPath)
      .filter((p) => {
        if (p.startsWith('ONTOLOGY_PROFILE_REFACTOR/')) return false;
        if (p.endsWith('.test.ts') || p.endsWith('.test.tsx') || p.includes('__tests__/')) return false;
        return !allowedProfilePersistenceFiles.has(path.normalize(p));
      });
    expect(offenders).toEqual([]);
  });

  it('profile_proposal_events is only allowed in planned persistence boundary files and tests', () => {
    const offenders = sourceFiles()
      .filter((filePath) => {
        const content = read(filePath);
        return content.includes('profile_proposal_events');
      })
      .map(toRepoPath)
      .filter((p) => {
        if (p.startsWith('ONTOLOGY_PROFILE_REFACTOR/')) return false;
        if (p.endsWith('.test.ts') || p.endsWith('.test.tsx') || p.includes('__tests__/')) return false;
        return !allowedProfilePersistenceFiles.has(path.normalize(p));
      });
    expect(offenders).toEqual([]);
  });

  it('profile_trust_settings is only allowed in planned persistence boundary files and tests', () => {
    const offenders = sourceFiles()
      .filter((filePath) => {
        const content = read(filePath);
        return content.includes('profile_trust_settings');
      })
      .map(toRepoPath)
      .filter((p) => {
        if (p.startsWith('ONTOLOGY_PROFILE_REFACTOR/')) return false;
        if (p.endsWith('.test.ts') || p.endsWith('.test.tsx') || p.includes('__tests__/')) return false;
        return !allowedProfilePersistenceFiles.has(path.normalize(p));
      });
    expect(offenders).toEqual([]);
  });

  const forbiddenTableNames = [
    'profile_overlays',
    'active_profile_overlay',
    'active_profile_selection',
    'profile_merge_proposals',
    'persisted_runtime_profile',
    'runtime_profile_json',
    'composed_profile_json',
  ];

  const isAllowedFile = (p: string) =>
    p.startsWith('ONTOLOGY_PROFILE_REFACTOR/') ||
    p.endsWith('.test.ts') ||
    p.endsWith('.test.tsx') ||
    p.includes('__tests__/');

  for (const tableName of forbiddenTableNames) {
    it(`no ${tableName} table/string source implementation under src yet`, () => {
      const offenders = sourceFiles()
        .filter((filePath) => {
          const content = read(filePath);
          return content.includes(tableName);
        })
        .map(toRepoPath)
        .filter((p) => !isAllowedFile(p));
      expect(offenders).toEqual([]);
    });
  }
});

describe('Profile registry bootstrap boundary guards', () => {
  it('root ontology barrel does not export DB-backed bootstrap helpers', () => {
    const indexSrc = read('src/features/ontology/index.ts');
    expect(indexSrc).not.toContain('profileRegistryBootstrap');
    expect(indexSrc).not.toContain('loadPersistedProfileDefinitionSource');
    expect(indexSrc).not.toContain('loadDefaultProfileRegistry');
  });

  it('ontology data barrel exports the bootstrap helpers', () => {
    const dataIndexSrc = read('src/features/ontology/data/index.ts');
    expect(dataIndexSrc).toContain('loadPersistedProfileDefinitionSource');
    expect(dataIndexSrc).toContain('loadDefaultProfileRegistry');
  });
});

describe('Ontology-profile naming boundary guards', () => {
  // These guards enforce that renamed fields stay renamed and legacy compat
  // boundaries stay documented. They do NOT globally ban conceptType - only
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

describe('Kortex durable doc future-direction anchor guards', () => {
  const docRoot = path.join(repoRoot, 'ONTOLOGY_PROFILE_REFACTOR');

  function readDoc(filename: string): string {
    return fs.readFileSync(path.join(docRoot, filename), 'utf8');
  }

  it('keeps core, agent, and self-building app anchors in doc 07', () => {
    const doc07 = readDoc('07_KORTEX_CORE_AND_CHILD_CORES.md');

    expect(doc07).toContain('## Agent Execution Ontology');
    expect(doc07).toContain('<agent_execution_ontology>');
    expect(doc07).toContain('## Self-Building App Framework Direction');
    expect(doc07).toContain('<self_building_app_framework>');
  });

  it('keeps future operation anchors in doc 08', () => {
    const doc08 = readDoc('08_KORTEX_LANGUAGE_LAYER_AND_ADAPTERS.md');

    expect(doc08).toContain('DefineAgentCore');
    expect(doc08).toContain('DefineAppCore');
  });

  it('keeps self-building app overlay anchor in doc 09', () => {
    const doc09 = readDoc('09_KORTEX_OVER_EXISTING_SYSTEMS.md');

    expect(doc09).toContain('## Kortex Over Self-Building Apps');
    expect(doc09).toContain('app idea / user intent');
    expect(doc09).toContain('subagent cores with execution policy');
  });

  it('keeps agent and self-building app cautions in NEXT_LLM_CONTEXT.md', () => {
    const nextContext = readDoc('NEXT_LLM_CONTEXT.md');

    expect(nextContext).toContain('Important agent/subagent caution before implementation');
    expect(nextContext).toContain('ontology-backed execution policy');
    expect(nextContext).toContain('Important self-building-app caution before implementation');
    expect(nextContext).toContain('intent -> project ontology -> constrained subagents');
  });

  it('keeps future boundary guardrails in anti-regression rules', () => {
    const antiRegressionRules = readDoc('05_ANTI_REGRESSION_RULES.md');

    expect(antiRegressionRules).toContain('## Future Architecture Guardrails');
    expect(antiRegressionRules).toContain('### Agent/Subagent Execution');
    expect(antiRegressionRules).toContain('### Self-Building App Framework');
    expect(antiRegressionRules).toContain('### Language/DSL Direction');
    expect(antiRegressionRules).toContain('### Overlay Over Existing Systems');
    expect(antiRegressionRules).toContain('### Active-Profile Overlays');
  });

  it('keeps profile branching, layering, and merge anchors in doc 06', () => {
    const doc06 = readDoc('06_PROFILE_BRANCHING_AND_MERGE.md');

    expect(doc06).toContain('## Architecture Decisions');
    expect(doc06).toContain('personal corrections win, then active project/learning overlay, then base');
    expect(doc06).toContain('Active branch rules win for classification inside that branch.');
    expect(doc06).toContain('Do not rush into persistence for branches.');
    expect(doc06).toContain('Only then consider storage for branches/patch suggestions.');
    expect(doc06).toContain('## What A Branch Can Change');
  });

  it('keeps first branch-local proposal apply anchors in doc 24', () => {
    const doc24 = readDoc('24_BRANCH_LOCAL_PROPOSAL_APPLY_DECISION.md');

    expect(doc24).toContain('The first proposal apply flow is explicit and branch-local.');
    expect(doc24).toContain('Apply');
    expect(doc24).toContain('Reject');
    expect(doc24).toContain('Postpone');
    expect(doc24).toContain('Ask why / why not');
    expect(doc24).toContain('confidence = is Kortex probably right?');
    expect(doc24).toContain('risk = how much could Kortex break if it is wrong?');
    expect(doc24).toContain('Apply must not:');
  });
});
