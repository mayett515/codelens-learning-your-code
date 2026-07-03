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
        'src/db/migrations/020-ontology-correction-near-miss-candidates.ts',
        'src/db/migrations/021-user-fit-history-recency-indexes.ts',
        'src/db/migrations/index.ts',
        'src/features/ontology/data/schema.ts',
        'src/features/ontology/data/ontologyCorrectionEvidenceRepo.ts',
        'src/features/ontology/data/userFitHistoryRepo.ts',
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
      .filter((filePath) => {
        const content = read(filePath);
        return content.includes('ontology_correction_evidence') || /\bontologyCorrectionEvidence\b/.test(content);
      })
      .map(toRepoPath)
      .filter((p) => {
        if (p.endsWith('.test.ts') || p.endsWith('.test.tsx') || p.includes('__tests__/')) return false;
        return !allowedFiles.has(path.normalize(p));
    });
    expect(offenders).toEqual([]);
  });

  it('near-miss correction candidates stay factual evidence, not public tags or mutations', () => {
    const typesSrc = read('src/features/ontology/types.ts');
    const classifierSrc = read('src/features/learning/services/conceptualizeClassification.ts');
    const saveModalSrc = read('src/features/learning/types/saveModal.ts');
    const correctionSaveSrc = read('src/features/learning/services/saveConceptualizedCapture.ts');
    const uncorrectedSaveSrc = read('src/features/learning/services/saveCapture.ts');
    const promptBuilderSrc = read('src/features/learning/services/conceptualizePromptBuilder.ts');
    const publicClassificationBody = promptBuilderSrc.match(
      /export function getConceptualizePublicClassification[\s\S]*?\n}/,
    )?.[0] ?? '';

    expect(typesSrc).toContain('export interface OntologyCorrectionNearMissCandidate');
    expect(typesSrc).toContain('nearMissCandidates?: readonly OntologyCorrectionNearMissCandidate[]');
    expect(saveModalSrc).toContain('conceptualizeNearMissCandidates?: readonly OntologyCorrectionNearMissCandidate[]');
    expect(classifierSrc).toContain('diagnosticCandidates: result.output.diagnostics.candidateRefs');
    expect(classifierSrc).toContain('conceptualizeNearMissCandidates');
    expect(correctionSaveSrc).toContain('nearMissCandidates: resolved.nearMissCandidates');
    expect(promptBuilderSrc).toContain('diagnostics.candidateRefs');
    expect(promptBuilderSrc).not.toContain('nearMissCandidates');
    expect(publicClassificationBody).toContain('return output.classification;');
    expect(publicClassificationBody).not.toMatch(/diagnostics|candidateRefs|nearMiss/i);
    expect(uncorrectedSaveSrc).not.toMatch(/nearMissCandidates|conceptualizeNearMissCandidates/);
    expect(correctionSaveSrc).not.toMatch(/insertProfileChangeProposal\([^)]*nearMissCandidates/s);
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
      'src/db/migrations/021-user-fit-history-recency-indexes.ts',
      'src/db/migrations/022-profile-change-proposal-target-version.ts',
      'src/db/migrations/023-profile-proposal-event-superseded-action.ts',
      'src/db/migrations/024-profile-change-proposal-target-branch-updated-at.ts',
      'src/db/migrations/index.ts',
      'src/features/ontology/data/schema.ts',
      'src/features/ontology/data/profileBranchRepo.ts',
      'src/features/ontology/data/profileSelectionRepo.ts',
      'src/features/ontology/data/profileDefinitionRepo.ts',
      'src/features/ontology/data/profileChangeProposalRepo.ts',
      'src/features/ontology/data/profileProposalEventRepo.ts',
      'src/features/ontology/data/profileTrustSettingRepo.ts',
      'src/features/ontology/data/userFitHistoryRepo.ts',
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
        return content.includes('profile_proposal_events') || /\bprofileProposalEvents\b/.test(content);
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

describe('Doc 26 scoped meaning and label-targeting guards', () => {
  it('coding profile exposes narrows but not runtime shadows semantics yet', () => {
    const codingProfileSrc = read('src/features/ontology/profiles/codingProfile.ts');
    expect(codingProfileSrc).toContain("'narrows'");
    expect(codingProfileSrc).not.toContain("'shadows'");
  });

  it('proposal/apply paths do not introduce label-only ontology target identifiers', () => {
    const guardedPathPattern = /src\/features\/(?:ontology|learning\/services)\//;
    const forbiddenTargetingPatterns = [
      /\btargetLabel\b/,
      /\btargetNodeLabel\b/,
      /\btargetOntologyLabel\b/,
      /\bcorrectedTypeLabel\b/,
      /\bpreviousTypeLabel\b/,
      /\bproposedTypeLabel\b/,
      /\bfind(?:Ontology)?NodeByLabel\b/,
      /\bresolve(?:Ontology)?NodeByLabel\b/,
      /\bget(?:Ontology)?NodeByLabel\b/,
    ];

    const offenders = sourceFiles()
      .filter((filePath) => guardedPathPattern.test(toRepoPath(filePath)))
      .filter((filePath) => {
        const repoPath = toRepoPath(filePath);
        if (repoPath.includes('/ui/')) return false;
        if (repoPath.endsWith('/scopedMeaning.ts')) return false;
        const content = read(filePath);
        return forbiddenTargetingPatterns.some((pattern) => pattern.test(content));
      })
      .map(toRepoPath);

    expect(offenders).toEqual([]);
  });

  it('doc 26 keeps hybrid identity, narrows, and label-only guard anchors', () => {
    const docRoot = path.join(repoRoot, 'ONTOLOGY_PROFILE_REFACTOR');
    const doc26 = fs.readFileSync(
      path.join(docRoot, '26_SCOPED_MEANING_AND_BRANCH_CORE_SEMANTICS_DECISION.md'),
      'utf8',
    );

    expect(doc26).toContain('Within one composed active profile, `nodeId` is the operational identity and must be unique.');
    expect(doc26).toContain('Across scopes, durable references and documentation should use `(scopeId, nodeId)`');
    expect(doc26).toContain('narrows');
    expect(doc26).toContain('`shadows` is reserved');
    expect(doc26).toContain('Do not store label-only ontology targets.');
  });
});

describe('Kordex context assembly guards', () => {
  it('contextAssembly.ts stays a pure typed projection without runtime dependencies', () => {
    const contextAssemblySrc = read('src/features/ontology/contextAssembly.ts');
    const forbiddenImportPattern =
      /from\s+['"][^'"]*(?:db\/|\/db|features\/backup|features\/learning|features\/graph|ai\/|react|react-native|expo|zustand|@tanstack)[^'"]*['"]/;
    const forbiddenRendererPattern = /render\w*Prompt|toPrompt|SystemPrompt|formatPrompt/i;

    expect(contextAssemblySrc).not.toMatch(forbiddenImportPattern);
    expect(contextAssemblySrc).not.toMatch(forbiddenRendererPattern);
    expect(contextAssemblySrc).not.toContain('renderContextPackToPrompt');
    expect(contextAssemblySrc).not.toContain('prompt renderer');
    expect(contextAssemblySrc).toContain('serializeContextPack');
    expect(contextAssemblySrc).toContain('validateContextPack');
    expect(contextAssemblySrc).toContain('ContextUserFitSection');
    expect(contextAssemblySrc).toContain('userFit: ContextUserFitSection');
  });

  it('contextSelector.ts stays a pure read-only selector without runtime dependencies', () => {
    const contextSelectorSrc = read('src/features/ontology/contextSelector.ts');
    const forbiddenImportPattern =
      /from\s+['"][^'"]*(?:db\/|\/db|features\/backup|features\/learning|features\/graph|ai\/|react|react-native|expo|zustand|@tanstack)[^'"]*['"]/;
    const forbiddenRendererPattern = /render\w*Prompt|toPrompt|SystemPrompt|formatPrompt/i;
    const forbiddenMutationPattern = /\bapplyProfile|applyMutation|mutateProfile\b/;

    expect(contextSelectorSrc).not.toMatch(forbiddenImportPattern);
    expect(contextSelectorSrc).not.toMatch(forbiddenRendererPattern);
    expect(contextSelectorSrc).not.toMatch(forbiddenMutationPattern);
    expect(contextSelectorSrc).toContain('ContextSelection');
    expect(contextSelectorSrc).toContain('createConceptualizeContextSelector');
    expect(contextSelectorSrc).toContain('createCheckerContextSelector');
    expect(contextSelectorSrc).toContain('selectCheckerContext');
    expect(contextSelectorSrc).toContain("selectContext(input, 'checker')");
  });

  it('checker prompt and mapper stay pure, branch-local, insert-only contract helpers', () => {
    const checkerPromptSrc = read('src/features/ontology/checkerPromptBuilder.ts');
    const checkerMapperSrc = read('src/features/ontology/checkerProposalMapper.ts');
    const ontologyIndexSrc = read('src/features/ontology/index.ts');
    const combined = `${checkerPromptSrc}\n${checkerMapperSrc}`;
    const forbiddenImportPattern =
      /from\s+['"][^'"]*(?:db\/|\/db|features\/backup|features\/learning|features\/graph|ai\/|react|react-native|expo|zustand|@tanstack)[^'"]*['"]/;

    expect(checkerPromptSrc).toContain('buildCheckerPrompt');
    expect(checkerPromptSrc).toContain('CheckerPromptOutputSchema');
    expect(checkerPromptSrc).toContain('missing_branch_item_type');
    expect(checkerPromptSrc).toContain('isItemType');
    expect(checkerPromptSrc).toContain('sourceEvidenceIds');
    expect(checkerPromptSrc).toContain('invalid-parent-ref');
    expect(checkerMapperSrc).toContain('mapCheckerOutputToProfileChangeProposals');
    expect(checkerMapperSrc).toContain("sourceBranchId: null");
    expect(checkerMapperSrc).toContain("proposalKind: 'ontology_node_patch'");
    expect(checkerMapperSrc).toContain('sourceEvidenceIds');
    expect(checkerMapperSrc).toContain('expandFindingEvidenceIds');
    expect(checkerMapperSrc).toContain("status: 'active'");
    expect(checkerMapperSrc).toContain("createdBy: 'model'");
    expect(ontologyIndexSrc).toContain('buildCheckerPrompt');
    expect(ontologyIndexSrc).toContain('mapCheckerOutputToProfileChangeProposals');

    expect(combined).not.toMatch(forbiddenImportPattern);
    expect(combined).not.toMatch(/\basync\b|\bPromise\b/);
    expect(combined).not.toMatch(/\b(setInterval|setTimeout|BackgroundFetch|TaskManager|cron|schedule|scheduled)\b/);
    expect(combined).not.toMatch(/\b(compileBranchLocalProposalApplyOperation|compileBaseProfileProposalApplyOperation|applyPending|applyBranchLocal|applyBaseProfile)\b/);
    expect(combined).not.toMatch(/\b(upsertProfileChangeProposal|deleteProfileChangeProposal|updateProfileChangeProposal|updateProfileChangeProposalIfPending)\b/);
    expect(combined).not.toMatch(/\b(profileTrust|ProfileTrust|autoApplyProposalKinds)\b/);
    expect(combined).not.toContain("kind: 'base_profile'");
    expect(combined).not.toMatch(/\b(branch_merge|relationship_patch|classification_patch|manual_draft)\b/);
  });

  it('doc 41 keeps checker runtime mapper pins and acceptance anchors', () => {
    const doc41 = read('ONTOLOGY_PROFILE_REFACTOR/41_CHECKER_RUNTIME_FIRST_SLICE_DECISION.md');

    expect(doc41).toContain('## First Runtime Slice Decision');
    expect(doc41).toContain('### Mapper Contract Pins');
    expect(doc41).toContain('## Acceptance Criteria');
    expect(doc41).toContain('`sourceBranchId = null`');
    expect(doc41).toContain('`proposalKind = \'ontology_node_patch\'`');
    expect(doc41).toContain('minted node `createdBy = \'model\'`');
    expect(doc41).toContain('minted node `status = \'active\'`');
    expect(doc41).toContain('duplicate handling does not update, upsert, delete, or rewrite existing pending proposals');
    expect(doc41).toContain('## Implementation Note - UI Trigger And Model Adapter Seam');
    expect(doc41).toContain('mirror the Conceptualize live-wiring pattern');
    expect(doc41).toContain('validateCheckerPromptOutput(raw, pack)` remains the only semantic gate');
    expect(doc41).toContain('must not fall back to unvalidated prose');
    expect(doc41).toContain('should not retry model calls automatically');
    expect(doc41).toContain('accept an `AbortSignal`');
    expect(doc41).toContain('disabled while a checker run is pending');
    expect(doc41).toContain('show the read-only checker explanation and skipped findings');
    expect(doc41).toContain('refresh pending proposal lists and proposal freshness queries');
    expect(doc41).toContain('## Implementation Update - Checker Quality Hardening');
    expect(doc41).toContain('Repeated correction evidence for the same active-branch correction pattern is aggregated');
    expect(doc41).toContain('`sourceEvidenceIds`');
    expect(doc41).toContain('mapper expands the persisted proposal `evidenceIds`');
    expect(doc41).toContain('`isItemType`');
    expect(doc41).toContain('`invalid-parent-ref`');
  });

  it('doc 42 keeps branch/profile selection UI scope anchors', () => {
    const doc42 = read('ONTOLOGY_PROFILE_REFACTOR/42_BRANCH_PROFILE_SELECTION_UI_DECISION.md');

    expect(doc42).toContain('## Locked Decision');
    expect(doc42).toContain('Build a minimal branch/profile selection UI over existing persistence and runtime seams.');
    expect(doc42).toContain('## Target Branch Rule');
    expect(doc42).toContain('ProfileSelection` describes composition. It is not itself a mutation target.');
    expect(doc42).toContain('If multiple branches are selected, the user must choose the checker target branch for the run.');
    expect(doc42).toContain('## Non-Goals');
    expect(doc42).toContain('Global `getActiveSelection()`');
    expect(doc42).toContain('Multi-base composition.');
    expect(doc42).toContain('Target-layer switching from Doc 39.');
    expect(doc42).toContain('No branch/base mutation occurs except creating an empty branch row or saving the selection row.');
  });

  it('doc 43 keeps second-base forkability demo scope anchors', () => {
    const doc43 = read('ONTOLOGY_PROFILE_REFACTOR/43_SECOND_BASE_PROFILE_FORKABILITY_DEMO_DECISION.md');

    expect(doc43).toContain('## Locked Decision');
    expect(doc43).toContain('Add a minimal second-base-profile forkability demo, using a photography profile.');
    expect(doc43).toContain('## Coupling-Audit Criterion');
    expect(doc43).toContain('Every required production-code change outside the profile fixture should be treated as a discovered coupling.');
    expect(doc43).toContain('## Delivery Mechanism');
    expect(doc43).toContain('Define a deterministic minimal photography `DomainProfile` fixture/source in code.');
    expect(doc43).toContain('round-trip the same profile through `profile_definitions` / `loadDefaultProfileRegistry`');
    expect(doc43).toContain('## Minimal Proof Set');
    expect(doc43).toContain('one eligible branch-local proposal can target-switch to the photography core');
    expect(doc43).toContain('Cross-base `typeNodeId` collisions are part of the audit.');
    expect(doc43).toContain('must not silently treat bare node ids as globally unique across unrelated base profiles');
    expect(doc43).toContain('Backup export/import preserves the photography profile definition alongside coding.');
    expect(doc43).toContain('colliding id such as `composition`');
    expect(doc43).toContain('## Non-Goals');
    expect(doc43).toContain('profile gallery');
    expect(doc43).toContain('cross-base evidence');
    expect(doc43).toContain('new operation vocabulary');
    expect(doc43).toContain('temporary/provisional tag or relationship maturity lifecycle');
    expect(doc43).toContain("the demo's base-apply proof goes through user target-switch, not the checker");
    expect(doc43).toContain('auto-apply');
    expect(doc43).toContain('## Acceptance Criteria');
    expect(doc43).toContain('The coding profile remains the strong default');
    expect(doc43).toContain('## Implementation Update - Initial Forkability Proof');
    expect(doc43).toContain('built-in registry lists `coding` and `photography`');
    expect(doc43).toContain('seeded manual checker runtime creates branch-local photography proposals');
    expect(doc43).toContain('Resolved coupling finding');
    expect(doc43).toContain('LearningConcept`, `RetrievedCapturePayload`, and `RetrievedConceptPayload` carry `profileId`');
    expect(doc43).toContain('`useConceptList` and `RetrieveFilters` expose preferred `profileIds`');
    expect(doc43).toContain('## Implementation Update - Profile-Scoped Learning Filters');
    expect(doc43).toContain('`coding/composition` and `photography/composition` are allowed to coexist as separate meanings');
  });

  it('keeps the photography second-base profile wired through the built-in profile source', () => {
    const photographyProfileSrc = read('src/features/ontology/profiles/photographyProfile.ts');
    const bootstrapSrc = read('src/features/ontology/data/profileRegistryBootstrap.ts');
    const ontologyIndexSrc = read('src/features/ontology/index.ts');

    expect(photographyProfileSrc).toContain("id: 'photography'");
    expect(photographyProfileSrc).toContain("id: 'composition'");
    expect(photographyProfileSrc).toContain('Photo Idea');
    expect(photographyProfileSrc).toContain('Camera Body');
    expect(photographyProfileSrc).toContain('Lightroom');
    expect(bootstrapSrc).toContain('photographyProfile as DomainProfile<string>');
    expect(ontologyIndexSrc).toContain('photographyProfile');
    expect(ontologyIndexSrc).toContain('PhotographyTypeNodeId');
  });

  it('doc 39 keeps target-layer switching scope anchors', () => {
    const doc39 = read('ONTOLOGY_PROFILE_REFACTOR/39_EDIT_THEN_APPLY_DECISION.md');

    expect(doc39).toContain('## Implementation Note - Target-Layer Switching First Slice');
    expect(doc39).toContain('pending branch-local additive new-node proposal');
    expect(doc39).toContain('explicit user chooses "move proposal to base/core"');
    expect(doc39).toContain('Switching creates a replacement proposal and supersedes the old proposal.');
    expect(doc39).toContain('It must not rewrite the old proposal in place.');
    expect(doc39).toContain('preserves the original `sourceKind`');
    expect(doc39).toContain('re-derives `riskScore` from the new target and operation shape');
    expect(doc39).toContain('Risk describes blast radius');
    expect(doc39).toContain("target.kind = 'base_profile'");
    expect(doc39).toContain('targetProfileVersion');
    expect(doc39).toContain('targetBranchUpdatedAt = null');
    expect(doc39).toContain('dry-run through the existing base-profile proposal compiler');
    expect(doc39).toContain('Switching target is not Apply.');
    expect(doc39).toContain('base-to-branch switching');
    expect(doc39).toContain('branch-to-branch or sibling-branch switching');
    expect(doc39).toContain('target switching initiated by a model');
    expect(doc39).toContain('bulk switching multiple proposals');
    expect(doc39).toContain('branch merge/upward promotion of already-applied branch overlay content');
    expect(doc39).toContain('## Implementation Update - Target-Switch Pure Helper');
    expect(doc39).toContain('createProposalTargetSwitchModel(input)');
    expect(doc39).toContain('pure eligibility/blast-radius helper');
    expect(doc39).toContain('## Implementation Update - Target-Switch Data Service');
    expect(doc39).toContain('switchProfileChangeProposalTargetToBase(input)');
    expect(doc39).toContain('data-layer replacement/supersede service');
  });

  it('profile selection draft helper stays pure and selection-scoped', () => {
    const src = read('src/features/ontology/profileSelectionDraft.ts');

    expect(src).toContain('createProfileSelectionDraftModel');
    expect(src).toContain('project_id_required');
    expect(src).toContain('requires_choice');
    expect(src).toContain('single_preselected');

    expect(src).not.toMatch(/\b(db|executor|transaction|profileSelectionRepo|profileBranchRepo)\b/);
    expect(src).not.toMatch(/\b(React|useState|useEffect|@tanstack|zustand|AsyncStorage)\b/);
    expect(src).not.toMatch(/\b(getActiveSelection|setActiveSelection|useActiveSelection|currentSelection|activeSelectionStore)\b/);
    expect(src).not.toMatch(/\b(composeRuntimeDomainProfile|persistedRuntimeProfile|composed.*profile.*persist)\b/);
    expect(src).not.toMatch(/\b(deleteProfileBranch|updateProfileBranch|branch_merge|upward promotion|sibling propagation)\b/);
    expect(src).not.toContain("kind: 'base_profile'");
    expect(src).not.toMatch(/\b(async|Promise|fetch|complete|enqueue)\b/);
  });

  it('proposal target-switch helper stays pure, explicit, and branch-to-base only', () => {
    const src = read('src/features/ontology/profileProposalTargetSwitch.ts');
    const ontologyIndexSrc = read('src/features/ontology/index.ts');

    expect(src).toContain('createProposalTargetSwitchModel');
    expect(src).toContain('targetSwitchBlockReason');
    expect(src).toContain('BASE_PROFILE_ADDITIVE_TARGET_SWITCH_RISK_SCORE');
    expect(src).toContain("targetProfileVersion: input.baseProfileVersion");
    expect(src).toContain('targetBranchUpdatedAt: null');
    expect(src).toContain('sourceKind: input.proposal.sourceKind');
    expect(src).toContain('riskScore: BASE_PROFILE_ADDITIVE_TARGET_SWITCH_RISK_SCORE');
    expect(src).toContain('Switching target is not Apply');
    expect(ontologyIndexSrc).toContain('createProposalTargetSwitchModel');

    expect(src).not.toMatch(/from\s+['"][^'"]*(?:db\/|\/db|\/data\/|features\/backup|features\/learning|features\/graph|ai\/|react|react-native|expo|zustand|@tanstack)[^'"]*['"]/);
    expect(src).not.toMatch(/\b(async|Promise|fetch|complete|enqueue)\b/);
    expect(src).not.toMatch(/\b(compileBranchLocalProposalApplyOperation|compileBaseProfileProposalApplyOperation|applyPending|applyBranchLocal|applyBaseProfile)\b/);
    expect(src).not.toMatch(/\b(insertProfileChangeProposal|upsertProfileChangeProposal|deleteProfileChangeProposal|updateProfileChangeProposal|supersedePendingProfileChangeProposal)\b/);
    expect(src).not.toMatch(/\b(branch_merge|relationship_patch|classification_patch|manual_draft)\b/);
    expect(src).not.toMatch(/\b(base-to-branch|branch-to-branch|sibling|bulk)\b/i);
    expect(src).not.toMatch(/\b(profileTrust|ProfileTrust|autoApplyProposalKinds)\b/);
  });

  it('profile selection hooks stay scoped to selection save and empty branch creation', () => {
    const src = read('src/features/ontology/hooks/useProfileSelection.ts');

    expect(src).toContain('useProjectProfileSelection');
    expect(src).toContain('useOntologyProfileSummaries');
    expect(src).toContain('useProfileBranchesForParent');
    expect(src).toContain('useSaveProjectProfileSelection');
    expect(src).toContain('useCreateEmptyProfileBranch');
    expect(src).toContain('loadDefaultProfileRegistry');
    expect(src).toContain('upsertProjectProfileSelection');
    expect(src).toContain('insertProfileBranch');

    expect(src).not.toMatch(/\b(deleteProjectProfileSelectionForProject|deleteProfileBranch|upsertProfileBranch|updateProfileBranch)\b/);
    expect(src).not.toMatch(/\b(getActiveSelection|setActiveSelection|useActiveSelection|currentSelection|activeSelectionStore)\b/);
    expect(src).not.toMatch(/\b(composeRuntimeDomainProfile|persistedRuntimeProfile|composed.*profile.*persist)\b/);
    expect(src).not.toMatch(/\b(branch_merge|upward promotion|sibling propagation|target-layer|target switching)\b/i);
    expect(src).not.toMatch(/\b(applyPending|applyBranchLocal|applyBaseProfile|compileBranchLocalProposalApplyOperation|compileBaseProfileProposalApplyOperation)\b/);
    expect(src).not.toMatch(/\b(profileTrust|ProfileTrust|autoApplyProposalKinds)\b/);
    expect(src).not.toContain("kind: 'base_profile'");
  });

  it('profile selection panel stays explicit, local, and non-destructive', () => {
    const panelSrc = read('src/features/ontology/ui/ProfileSelectionPanel.tsx');
    const screenSrc = read('src/features/ontology/ui/ProfileProposalReviewScreen.tsx');
    const learningRouteSrc = read('app/learning/index.tsx');
    const learningHubSrc = read('src/features/learning/ui/LearningHubScreen.tsx');
    const projectRouteSrc = read('app/project/[id].tsx');

    expect(panelSrc).toContain('ProfileSelectionPanel');
    expect(panelSrc).toContain('createProfileSelectionDraftModel');
    expect(panelSrc).toContain('useProjectProfileSelection');
    expect(panelSrc).toContain('useOntologyProfileSummaries');
    expect(panelSrc).toContain('useProfileBranchesForParent');
    expect(panelSrc).toContain('useSaveProjectProfileSelection');
    expect(panelSrc).toContain('useCreateEmptyProfileBranch');
    expect(panelSrc).toContain('onCheckerTargetChange');
    expect(panelSrc).toContain('onSelectionInteraction');
    expect(panelSrc).toContain('selectionRow?.updatedAt');
    expect(panelSrc).toContain('only persisted');
    expect(panelSrc).toContain('removeProfileSelectionBranch');
    expect(screenSrc).toContain('<ProfileSelectionPanel');
    expect(screenSrc).toContain('canRunChecker');
    expect(screenSrc).toContain('selectionTargetInteracted');
    expect(screenSrc).toContain('selectionCheckerTarget ?? checkerTarget');
    expect(screenSrc).toContain('Select a branch target before running the checker.');
    expect(learningRouteSrc).toContain('useLocalSearchParams');
    expect(learningRouteSrc).toContain('<LearningHubScreen projectId={projectId}');
    expect(learningHubSrc).toContain('projectId?: string | null | undefined');
    expect(learningHubSrc).toContain('<ProfileProposalReviewScreen projectId={projectId ?? null}');
    expect(projectRouteSrc).toContain("pathname: '/learning'");
    expect(projectRouteSrc).toContain('params: { projectId }');

    expect(panelSrc).not.toMatch(/from\s+['"][^'"]*\/data\/[^'"]*['"]/);
    expect(panelSrc).not.toMatch(/\b(deleteProfileBranch|upsertProfileBranch|updateProfileBranch|deleteProjectProfileSelectionForProject)\b/);
    expect(panelSrc).not.toMatch(/\b(getActiveSelection|setActiveSelection|useActiveSelection|currentSelection|activeSelectionStore)\b/);
    expect(panelSrc).not.toMatch(/\b(composeRuntimeDomainProfile|persistedRuntimeProfile|composed.*profile.*persist)\b/);
    expect(panelSrc).not.toMatch(/\b(branch_merge|upward promotion|sibling propagation|target-layer|target switching)\b/i);
    expect(panelSrc).not.toMatch(/\b(runManualOntologyChecker|insertProfileChangeProposal|upsertProfileChangeProposal|deleteProfileChangeProposal)\b/);
    expect(panelSrc).not.toContain("kind: 'base_profile'");
    expect(`${screenSrc}\n${learningHubSrc}`).not.toMatch(/\b(getCurrentProject|useCurrentProject|activeProjectStore|currentProjectStore)\b/);
    expect(screenSrc).not.toMatch(/proposals\.find\(\(proposal\)\s*=>\s*proposal\.target\.kind\s*===\s*'profile_branch'\)/);
  });

  it('manual checker runtime service stays data-boundary, branch-local, and insert-only', () => {
    const serviceSrc = read('src/features/ontology/data/checkerRunService.ts');
    const ontologyDataIndexSrc = read('src/features/ontology/data/index.ts');
    const ontologyRootIndexSrc = read('src/features/ontology/index.ts');

    expect(serviceSrc).toContain('runManualOntologyChecker');
    expect(serviceSrc).toContain('buildCheckerPrompt');
    expect(serviceSrc).toContain('validateCheckerPromptOutput');
    expect(serviceSrc).toContain('mapCheckerOutputToProfileChangeProposals');
    expect(serviceSrc).toContain('aggregateCorrectionEvidenceClaims');
    expect(serviceSrc).toContain('sourceEvidenceIds');
    expect(serviceSrc).toContain('isItemType');
    expect(serviceSrc).toContain('compileBranchLocalProposalApplyOperation');
    expect(serviceSrc).toContain('insertProfileChangeProposal');
    expect(ontologyDataIndexSrc).toContain('runManualOntologyChecker');
    expect(ontologyRootIndexSrc).not.toContain('runManualOntologyChecker');

    expect(serviceSrc).not.toMatch(/from\s+['"][^'"]*(?:features\/backup|features\/learning|features\/graph|react|react-native|expo|zustand|@tanstack)[^'"]*['"]/);
    expect(serviceSrc).not.toMatch(/\b(setInterval|setTimeout|BackgroundFetch|TaskManager|cron|scheduled)\b/);
    expect(serviceSrc).not.toMatch(/\b(compileBaseProfileProposalApplyOperation|applyPendingBranchLocalProfileChangeProposal|applyPendingBaseProfileChangeProposal|applyBaseProfile)\b/);
    expect(serviceSrc).not.toMatch(/\b(upsertProfileChangeProposal|deleteProfileChangeProposal|updateProfileChangeProposal|updateProfileChangeProposalIfPending)\b/);
    expect(serviceSrc).not.toMatch(/\b(insertProfileProposalEvent|profileTrust|ProfileTrust|autoApplyProposalKinds)\b/);
    expect(serviceSrc).not.toMatch(/\b(supersedePendingProfileChangeProposal|refreshStaleProfileChangeProposal|createEditedProfileChangeProposalReplacement)\b/);
  });

  it('manual checker UI adapter stays manual, abortable, no-retry, and review-surface only', () => {
    const adapterSrc = read('src/features/ontology/hooks/manualCheckerReviewAdapter.ts');
    const hookSrc = read('src/features/ontology/hooks/useRunManualOntologyChecker.ts');
    const screenSrc = read('src/features/ontology/ui/ProfileProposalReviewScreen.tsx');
    const saveModalSrc = read('src/features/learning/ui/SaveAsLearningModal.tsx');
    const combinedAdapter = `${adapterSrc}\n${hookSrc}`;

    expect(adapterSrc).toContain('runManualOntologyCheckerForReview');
    expect(adapterSrc).toContain('completeManualCheckerPrompt');
    expect(adapterSrc).toContain('ManualCheckerRunServiceError');
    expect(adapterSrc).toContain('checker_output_invalid');
    expect(adapterSrc).toContain('KORDEX_CHECKER_CONTEXT_PAYLOAD_JSON');
    expect(adapterSrc).toContain('AbortSignal');
    expect(hookSrc).toContain('retry: false');
    expect(hookSrc).toContain('AbortController');
    expect(hookSrc).toContain('profileProposalKeys.all()');
    expect(hookSrc).toContain('profileProposalFreshnessKeys.all()');
    expect(hookSrc).not.toMatch(/\b(profileBranchKeys|profileProposalEventKeys)\b/);
    expect(combinedAdapter).not.toMatch(/\b(RETRY_INSTRUCTION|retryInstruction|attempt|for\s*\(\s*let\s+attempt|while\s*\()/);

    expect(screenSrc).toContain('Run checker now');
    expect(screenSrc).toContain('checkerMutation.isPending');
    expect(screenSrc).toContain('formatCheckerRunSummary');
    expect(screenSrc).toContain('formatCheckerSkipReason');
    expect(screenSrc).toContain('DEFAULT_RUNTIME_PROFILE_BASE_PROFILE_ID');
    expect(screenSrc).not.toMatch(/\b(setInterval|setTimeout|BackgroundFetch|TaskManager|cron|scheduled)\b/);
    expect(screenSrc).not.toMatch(/useEffect[\s\S]{0,300}runChecker/);
    expect(screenSrc).not.toMatch(/\b(applyPendingBranchLocalProfileChangeProposal|applyPendingBaseProfileChangeProposal|insertProfileChangeProposal|upsertProfileChangeProposal|deleteProfileChangeProposal)\b/);

    expect(saveModalSrc).toContain('checkerTarget={profileContext.proposalTarget.kind === \'profile_branch\'');
  });

  it('Conceptualize ContextPack shadow wiring does not render prompts, call models, or mutate ontology state', () => {
    const shadowSrc = read('src/features/learning/services/conceptualizeContextPack.ts');

    expect(shadowSrc).toContain('buildConceptualizeContextPackShadow');
    expect(shadowSrc).toContain('assembleContextPack');
    expect(shadowSrc).toContain('validateContextPack');
    expect(shadowSrc).toContain('selectConceptualizeContext');
    expect(shadowSrc).toContain('userFitActiveSelectionScopeKey');
    expect(shadowSrc).not.toContain('loadUserFitProjectionFacts');
    expect(shadowSrc).not.toMatch(/buildExtractorSystemPrompt|runExtractor|ExtractorComplete/);
    expect(shadowSrc).not.toMatch(/insertProfileChangeProposal|insertOntologyCorrectionEvidence|saveCapture/);
    expect(shadowSrc).not.toMatch(/render\w*Prompt|toPrompt|SystemPrompt|formatPrompt/i);
    expect(shadowSrc).not.toMatch(/from\s+['"][^'"]*(?:db\/|\/db|ai\/|react|react-native|expo|zustand|@tanstack)[^'"]*['"]/);
  });

  it('Conceptualize prompt builder consumes ContextPack without fetching, selecting, calling models, or mutating', () => {
    const promptBuilderSrc = read('src/features/learning/services/conceptualizePromptBuilder.ts');

    expect(promptBuilderSrc).toContain('buildConceptualizePrompt');
    expect(promptBuilderSrc).toContain('ConceptualizePromptOutputSchema');
    expect(promptBuilderSrc).toContain('validateConceptualizePromptOutput');
    expect(promptBuilderSrc).toContain('assertValidContextPack');
    expect(promptBuilderSrc).toContain('diagnostics.candidateRefs');
    expect(promptBuilderSrc).toContain('getConceptualizePublicClassification');
    expect(promptBuilderSrc).toContain('userFit.nodeSignals');
    expect(promptBuilderSrc).not.toContain('additionalNodeRefs');
    expect(promptBuilderSrc).not.toContain('maxAdditionalNodeRefs');
    expect(promptBuilderSrc).not.toMatch(/selectConceptualizeContext|assembleContextPack|prepareSaveCandidates/);
    expect(promptBuilderSrc).not.toMatch(/buildExtractorSystemPrompt|runExtractor|ExtractorComplete/);
    expect(promptBuilderSrc).not.toMatch(/insertProfileChangeProposal|insertOntologyCorrectionEvidence|saveCapture/);
    expect(promptBuilderSrc).not.toMatch(/enqueue|complete|chatCompletion|model|provider/i);
    expect(promptBuilderSrc).not.toMatch(/from\s+['"][^'"]*(?:db\/|\/db|ai\/|react|react-native|expo|zustand|@tanstack)[^'"]*['"]/);
  });

  it('Conceptualize diagnostic internals stay out of the public learning barrel', () => {
    const promptBuilderSrc = read('src/features/learning/services/conceptualizePromptBuilder.ts');
    const learningIndexSrc = read('src/features/learning/index.ts');
    const internalSymbols = [
      'MAX_DIAGNOSTIC_CANDIDATE_REFS_HARD_CAP',
      'ConceptualizePromptDiagnosticCandidate',
      'ConceptualizeDiagnosticCandidatePolicy',
      'deriveConceptualizeDiagnosticCandidatePolicy',
    ];

    for (const symbol of internalSymbols) {
      expect(promptBuilderSrc).toContain(symbol);
      expect(learningIndexSrc).not.toContain(symbol);
    }

    expect(promptBuilderSrc).toMatch(/\/\*\* @internal \*\/\s*export const MAX_DIAGNOSTIC_CANDIDATE_REFS_HARD_CAP/);
    expect(promptBuilderSrc).toMatch(/\/\*\* @internal \*\/\s*export type ConceptualizePromptDiagnosticCandidate/);
    expect(promptBuilderSrc).toMatch(/\/\*\* @internal \*\/\s*export interface ConceptualizeDiagnosticCandidatePolicy/);
    expect(promptBuilderSrc).toMatch(/\/\*\* @internal \*\/\s*export function deriveConceptualizeDiagnosticCandidatePolicy/);
  });

  it('Extractor Flip classifier is a model/adapter seam, not a persistence or mutation seam', () => {
    const classifierSrc = read('src/features/learning/services/conceptualizeClassification.ts');
    const modalSrc = read('src/features/learning/ui/SaveAsLearningModal.tsx');

    expect(classifierSrc).toContain('runConceptualizeClassification');
    expect(classifierSrc).toContain('buildConceptualizePrompt');
    expect(classifierSrc).toContain('validateConceptualizePromptOutput');
    expect(classifierSrc).toContain('applyConceptualizeClassificationToCandidate');
    expect(classifierSrc).toContain('buildConceptualizeContextPackShadow');
    expect(classifierSrc).not.toMatch(/insertProfileChangeProposal|insertOntologyCorrectionEvidence|saveCapture|saveConceptualizedCapture/);
    expect(classifierSrc).not.toMatch(/from\s+['"][^'"]*(?:db\/|\/db|features\/backup|react|react-native|expo|zustand|@tanstack)[^'"]*['"]/);
    expect(modalSrc).not.toContain('buildConceptualizeContextPackShadow');
  });

  it('missing-concept UX is explicit review metadata, not automatic ontology apply', () => {
    const saveModalTypesSrc = read('src/features/learning/types/saveModal.ts');
    const classifierSrc = read('src/features/learning/services/conceptualizeClassification.ts');
    const storeSrc = read('src/features/learning/state/save-learning.ts');
    const cardSrc = read('src/features/learning/ui/cards/CandidateCaptureCard.tsx');
    const correctionControlsSrc = read('src/features/learning/ui/ConceptualizeCorrectionControls.tsx');

    expect(saveModalTypesSrc).toContain('export interface ConceptualizeMissingConceptReview');
    expect(saveModalTypesSrc).toContain("status: 'no_strong_match'");
    expect(classifierSrc).toContain('conceptualizeMissingConcept: toMissingConceptReview(classification, pack)');
    expect(classifierSrc).not.toMatch(/suggestedNewConcept[\s\S]{0,200}proposedConceptType/);
    expect(storeSrc).toContain("newTypeLabel: ''");
    expect(cardSrc).toContain('Needs type review');
    expect(correctionControlsSrc).toContain('Use suggestion');
    expect(correctionControlsSrc).toContain('newTypeLabel: suggested.label');
    expect(correctionControlsSrc).not.toMatch(/insertProfileChangeProposal|saveConceptualizedCapture|saveCapture/);
  });

  it('raw proposed type identity stays structured with a legacy string projection only', () => {
    const saveModalSrc = read('src/features/learning/types/saveModal.ts');
    const identitySrc = read('src/features/learning/types/rawProposedTypeIdentity.ts');
    const prepareSrc = read('src/features/learning/services/prepareSaveCandidates.ts');
    const classifierSrc = read('src/features/learning/services/conceptualizeClassification.ts');
    const correctionSaveSrc = read('src/features/learning/services/saveConceptualizedCapture.ts');

    expect(saveModalSrc).toContain('rawProposedTypeIdentity?: RawProposedTypeIdentity');
    expect(identitySrc).toContain("kind: 'scoped_ref'");
    expect(identitySrc).toContain("kind: 'unresolved_raw'");
    expect(identitySrc).toContain('rawProposedTypeIdentityToLegacyString');
    expect(prepareSrc).toContain('createUnresolvedRawProposedTypeIdentity');
    expect(prepareSrc).toContain('rawProposedTypeIdentityToLegacyString');
    expect(classifierSrc).toContain('createScopedRawProposedTypeIdentity');
    expect(classifierSrc).toContain('rawProposedTypeIdentityToLegacyString');
    expect(correctionSaveSrc).toContain('rawProposedTypeIdentityToLegacyString(candidate.rawProposedTypeIdentity)');
    expect(correctionSaveSrc).not.toContain('normalizeNullableText(candidate.rawProposedTypeNodeId)');
  });

  it('user-fit projection stays a pure bounded projection over supplied facts', () => {
    const projectionSrc = read('src/features/ontology/userFitProjection.ts');
    const ontologyIndexSrc = read('src/features/ontology/index.ts');

    expect(projectionSrc).toContain('projectUserFitSignals');
    expect(projectionSrc).toContain('correctionEvidence?: readonly OntologyCorrectionEvidence[]');
    expect(projectionSrc).toContain('proposalEvents?: readonly ProfileProposalEvent[]');
    expect(projectionSrc).toContain('omittedNodeSignalCount');
    expect(projectionSrc).toContain('omittedProposalSignalCount');
    expect(projectionSrc).toContain('userFitActiveSelectionScopeKey');
    expect(projectionSrc).toContain('activeSelectionSnapshot: UserFitNormalizedActiveSelectionSnapshot');
    expect(projectionSrc).toContain('nearMissHitCount');
    expect(projectionSrc).toContain('missingConceptCorrectionCount');
    expect(ontologyIndexSrc).toContain('projectUserFitSignals');
    expect(ontologyIndexSrc).toContain('userFitActiveSelectionScopeKey');
    expect(ontologyIndexSrc).toContain('UserFitProjection');

    expect(projectionSrc).not.toMatch(/from\s+['"][^'"]*(?:db\/|\/db|features\/backup|features\/learning|features\/graph|ai\/|react|react-native|expo|zustand|@tanstack)[^'"]*['"]/);
    expect(projectionSrc).not.toMatch(/ontologyCorrectionEvidenceRepo|profileProposalEventRepo/);
    expect(projectionSrc).not.toMatch(/\basync\b|\bPromise\b/);
    expect(projectionSrc).not.toMatch(/insertProfileChangeProposal|insertOntologyCorrectionEvidence|saveCapture|saveConceptualizedCapture/);
    expect(projectionSrc).not.toMatch(/\b(applyProfilePatch|applyBranchLocal|mutateProfile|autoApply|runExtractor|buildConceptualizePrompt|enqueue|complete)\b/);

    const boundedWeights = [
      'MISSING_CONCEPT_POSITIVE_WEIGHT',
      'NEAR_MISS_POSITIVE_WEIGHT',
      'POSTPONED_NEGATIVE_WEIGHT',
    ];
    for (const constantName of boundedWeights) {
      const match = projectionSrc.match(new RegExp(`const ${constantName} = ([0-9.]+);`));
      expect(match).toBeTruthy();
      expect(Number(match![1])).toBeGreaterThanOrEqual(0);
      expect(Number(match![1])).toBeLessThanOrEqual(1);
    }
  });

  it('user-fit history reader stays a data-layer facts loader, not a projection or runtime seam', () => {
    const historyRepoSrc = read('src/features/ontology/data/userFitHistoryRepo.ts');
    const ontologyDataIndexSrc = read('src/features/ontology/data/index.ts');
    const ontologyRootIndexSrc = read('src/features/ontology/index.ts');

    expect(historyRepoSrc).toContain('loadUserFitProjectionFacts');
    expect(historyRepoSrc).toContain('DEFAULT_USER_FIT_CORRECTION_EVIDENCE_LIMIT');
    expect(historyRepoSrc).toContain('DEFAULT_USER_FIT_PROPOSAL_EVENT_LIMIT');
    expect(historyRepoSrc).toContain('ontologyCorrectionEvidence');
    expect(historyRepoSrc).toContain('profileProposalEvents');
    expect(ontologyDataIndexSrc).toContain('loadUserFitProjectionFacts');
    expect(ontologyRootIndexSrc).not.toContain('loadUserFitProjectionFacts');

    expect(historyRepoSrc).not.toMatch(/projectUserFitSignals|userFitProjection/);
    expect(historyRepoSrc).not.toMatch(/insertProfileChangeProposal|insertOntologyCorrectionEvidence|saveCapture|saveConceptualizedCapture/);
    expect(historyRepoSrc).not.toMatch(/\b(applyProfilePatch|applyBranchLocal|mutateProfile|autoApply|runExtractor|buildConceptualizePrompt|enqueue|complete)\b/);
    expect(historyRepoSrc).not.toMatch(/from\s+['"][^'"]*(?:features\/backup|features\/learning|features\/graph|ai\/|react|react-native|expo|zustand|@tanstack)[^'"]*['"]/);
  });

  it('base profile versioning guard stays pure and apply-free', () => {
    const versioningSrc = read('src/features/ontology/baseProfileVersioning.ts');
    const ontologyIndexSrc = read('src/features/ontology/index.ts');

    expect(versioningSrc).toContain('assertBaseProfileProposalTargetsCurrentVersion');
    expect(versioningSrc).toContain('target_profile_version_missing');
    expect(versioningSrc).toContain('target_profile_version_stale');
    expect(ontologyIndexSrc).toContain('assertBaseProfileProposalTargetsCurrentVersion');

    expect(versioningSrc).not.toMatch(/from\s+['"][^'"]*(?:db\/|\/db|features\/backup|features\/learning|features\/graph|ai\/|react|react-native|expo|zustand|@tanstack)[^'"]*['"]/);
    expect(versioningSrc).not.toMatch(/\basync\b|\bPromise\b/);
    expect(versioningSrc).not.toMatch(/\b(insert|update|delete|transaction|saveCapture|saveConceptualizedCapture)\b/);
    expect(versioningSrc).not.toMatch(/\b(applyProfilePatch|applyBranchLocal|mutateProfile|autoApply|runExtractor|buildConceptualizePrompt|enqueue|complete)\b/);
  });

  it('proposal freshness stays a pure read-only classifier, not refresh/apply logic', () => {
    const freshnessSrc = read('src/features/ontology/profileProposalFreshness.ts');
    const ontologyIndexSrc = read('src/features/ontology/index.ts');

    expect(freshnessSrc).toContain('evaluateProfileProposalFreshness');
    expect(freshnessSrc).toContain("stale_refreshable");
    expect(freshnessSrc).toContain("patch_validation_unknown");
    expect(ontologyIndexSrc).toContain('evaluateProfileProposalFreshness');

    expect(freshnessSrc).not.toMatch(/from\s+['"][^'"]*(?:db\/|\/db|features\/backup|features\/learning|features\/graph|ai\/|react|react-native|expo|zustand|@tanstack)[^'"]*['"]/);
    expect(freshnessSrc).not.toMatch(/\basync\b|\bPromise\b/);
    expect(freshnessSrc).not.toMatch(/\b(insert|update|delete|transaction|saveCapture|saveConceptualizedCapture)\b/);
    expect(freshnessSrc).not.toMatch(/\b(applyProfilePatch|applyBranchLocal|mutateProfile|autoApply|runExtractor|buildConceptualizePrompt|enqueue|complete|refresh|rebase)\b/);
  });

  it('proposal freshness service stays a read-only data seam, not a refresh/apply writer', () => {
    const serviceSrc = read('src/features/ontology/data/profileProposalFreshnessService.ts');
    const hookSrc = read('src/features/ontology/hooks/useProfileProposalFreshness.ts');
    const ontologyDataIndexSrc = read('src/features/ontology/data/index.ts');
    const ontologyRootIndexSrc = read('src/features/ontology/index.ts');

    expect(serviceSrc).toContain('loadProfileProposalFreshness');
    expect(serviceSrc).toContain('evaluateProfileProposalFreshness');
    expect(serviceSrc).toContain('compileBranchLocalProposalApplyOperation');
    expect(serviceSrc).toContain('compileBaseProfileProposalApplyOperation');
    expect(hookSrc).toContain('useProfileProposalFreshness');
    expect(ontologyDataIndexSrc).toContain('loadProfileProposalFreshness');
    expect(ontologyRootIndexSrc).not.toContain('loadProfileProposalFreshness');

    expect(serviceSrc).not.toMatch(/from\s+['"][^'"]*(?:features\/backup|features\/learning|features\/graph|ai\/|react|react-native|expo|zustand|@tanstack)[^'"]*['"]/);
    expect(serviceSrc).not.toMatch(/\b(insert|upsert|update|delete|transaction|saveProposalIfPending|saveBranchIfUnchanged|saveProfileDefinitionIfUnchanged)\b/);
    expect(serviceSrc).not.toMatch(/\b(supersede|supersededByProposalId|autoApply|runExtractor|buildConceptualizePrompt|enqueue|complete|refresh|rebase)\b/);
    expect(hookSrc).not.toMatch(/\b(useMutation|mutateAsync|applyPending|supersedePending|setPending|recordPending)\b/);
  });

  it('proposal edit replacement service stays behind the ontology data boundary', () => {
    const serviceSrc = read('src/features/ontology/data/profileChangeProposalEditService.ts');
    const hookSrc = read('src/features/ontology/hooks/useEditProfileChangeProposal.ts');
    const ontologyDataIndexSrc = read('src/features/ontology/data/index.ts');
    const ontologyRootIndexSrc = read('src/features/ontology/index.ts');

    expect(serviceSrc).toContain('createEditedProfileChangeProposalReplacement');
    expect(serviceSrc).toContain('insertProposal');
    expect(serviceSrc).toContain('supersedePendingProfileChangeProposal');
    expect(serviceSrc).toContain('compileBranchLocalProposalApplyOperation');
    expect(serviceSrc).toContain('compileBaseProfileProposalApplyOperation');
    expect(hookSrc).toContain('useEditProfileChangeProposal');
    expect(ontologyDataIndexSrc).toContain('createEditedProfileChangeProposalReplacement');
    expect(ontologyRootIndexSrc).not.toContain('createEditedProfileChangeProposalReplacement');

    expect(serviceSrc).not.toMatch(/from\s+['"][^'"]*(?:features\/backup|features\/learning|features\/graph|ai\/|react|react-native|expo|zustand|@tanstack)[^'"]*['"]/);
    expect(serviceSrc).not.toMatch(/\b(autoApply|runExtractor|buildConceptualizePrompt|enqueue|complete)\b/);
    expect(hookSrc).not.toMatch(/from\s+['"][^'"]*(?:features\/learning|features\/graph|ai\/|react-native|expo|zustand)[^'"]*['"]/);
  });

  it('proposal target-switch service stays data-boundary, branch-to-base, and apply-free', () => {
    const serviceSrc = read('src/features/ontology/data/profileChangeProposalTargetSwitchService.ts');
    const ontologyDataIndexSrc = read('src/features/ontology/data/index.ts');
    const ontologyRootIndexSrc = read('src/features/ontology/index.ts');

    expect(serviceSrc).toContain('switchProfileChangeProposalTargetToBase');
    expect(serviceSrc).toContain('createProposalTargetSwitchModel');
    expect(serviceSrc).toContain('compileBaseProfileProposalApplyOperation');
    expect(serviceSrc).toContain('insertProposal');
    expect(serviceSrc).toContain('supersedePendingProfileChangeProposal');
    expect(serviceSrc).toContain("kind: 'base_profile'");
    expect(serviceSrc).toContain('targetBranchUpdatedAt: null');
    expect(serviceSrc).toContain('sourceKind');
    expect(serviceSrc).toContain('riskScore');
    expect(ontologyDataIndexSrc).toContain('switchProfileChangeProposalTargetToBase');
    expect(ontologyRootIndexSrc).not.toContain('switchProfileChangeProposalTargetToBase');

    expect(serviceSrc).not.toMatch(/from\s+['"][^'"]*(?:features\/backup|features\/learning|features\/graph|ai\/|react|react-native|expo|zustand|@tanstack)[^'"]*['"]/);
    expect(serviceSrc).not.toMatch(/\b(compileBranchLocalProposalApplyOperation|applyPendingBranchLocalProfileChangeProposal|applyPendingBaseProfileChangeProposal|applyBaseProfile)\b/);
    expect(serviceSrc).not.toMatch(/\b(upsertProfileChangeProposal|deleteProfileChangeProposal|updateProfileChangeProposal\()\b/);
    expect(serviceSrc).not.toMatch(/\b(profileTrust|ProfileTrust|autoApplyProposalKinds)\b/);
    expect(serviceSrc).not.toMatch(/\b(runManualOntologyChecker|buildCheckerPrompt|validateCheckerPromptOutput|mapCheckerOutputToProfileChangeProposals)\b/);
    expect(serviceSrc).not.toMatch(/\b(setInterval|setTimeout|BackgroundFetch|TaskManager|cron|scheduled)\b/);
    expect(serviceSrc).not.toMatch(/\b(branch_merge|relationship_patch|classification_patch|manual_draft)\b/);
  });

  it('proposal target-switch hook and review control stay review-only', () => {
    const hookSrc = read('src/features/ontology/hooks/useSwitchProfileChangeProposalTarget.ts');
    const screenSrc = read('src/features/ontology/ui/ProfileProposalReviewScreen.tsx');

    expect(hookSrc).toContain('useSwitchProfileChangeProposalTarget');
    expect(hookSrc).toContain('switchProfileChangeProposalTargetToBase');
    expect(hookSrc).toContain('profileProposalKeys.all()');
    expect(hookSrc).toContain('profileProposalEventKeys.byProposal(input.proposalId)');
    expect(hookSrc).toContain('profileProposalEventKeys.byProposal(result.proposal.id)');
    expect(hookSrc).toContain('profileProposalFreshnessKeys.all()');
    expect(screenSrc).toContain('useSwitchProfileChangeProposalTarget');
    expect(screenSrc).toContain('createProposalTargetSwitchModel');
    expect(screenSrc).toContain('switchTargetToCore');
    expect(screenSrc).toContain('targetSwitchModel.confirmationBody');
    expect(screenSrc).toContain('formatTargetSwitchFailureMessage');
    expect(screenSrc).toContain('Created core-targeted proposal');

    expect(hookSrc).not.toMatch(/\b(profileBranchKeys|profileSelectionKeys|profileBaseProfileKeys)\b/);
    expect(hookSrc).not.toMatch(/\b(applyPendingBranchLocalProfileChangeProposal|applyPendingBaseProfileChangeProposal|applyBaseProfile|compileBaseProfileProposalApplyOperation)\b/);
    expect(hookSrc).not.toMatch(/\b(runManualOntologyChecker|buildCheckerPrompt|enqueue|complete|autoApply)\b/);
    expect(screenSrc).not.toMatch(/\b(switchProfileChangeProposalTargetToBase|compileBaseProfileProposalApplyOperation|applyPendingBaseProfileChangeProposal)\b/);
  });

  it('base profile apply helper stays a pure patch compiler, not a data/UI seam', () => {
    const applySrc = read('src/features/ontology/baseProfileProposalApply.ts');
    const ontologyIndexSrc = read('src/features/ontology/index.ts');

    expect(applySrc).toContain('compileBaseProfileProposalApplyOperation');
    expect(applySrc).toContain('applyBaseProfileChangeProposal');
    expect(applySrc).toContain('assertBaseProfileProposalTargetsCurrentVersion');
    expect(applySrc).toContain('composeDomainProfile');
    expect(applySrc).toContain('apply_profile_patch_to_base_profile');
    expect(ontologyIndexSrc).toContain('compileBaseProfileProposalApplyOperation');
    expect(ontologyIndexSrc).toContain('applyBaseProfileChangeProposal');

    expect(applySrc).not.toMatch(/from\s+['"][^'"]*(?:db\/|\/db|features\/backup|features\/learning|features\/graph|ai\/|react|react-native|expo|zustand|@tanstack)[^'"]*['"]/);
    expect(applySrc).not.toMatch(/\basync\b|\bPromise\b/);
    expect(applySrc).not.toMatch(/\b(insert|update|delete|transaction|saveCapture|saveConceptualizedCapture)\b/);
    expect(applySrc).not.toMatch(/\b(autoApply|runExtractor|buildConceptualizePrompt|enqueue|complete)\b/);
  });

  it('base profile apply service stays behind the ontology data boundary', () => {
    const serviceSrc = read('src/features/ontology/data/baseProfileProposalApplyService.ts');
    const ontologyDataIndexSrc = read('src/features/ontology/data/index.ts');
    const ontologyRootIndexSrc = read('src/features/ontology/index.ts');

    expect(serviceSrc).toContain('applyPendingBaseProfileChangeProposal');
    expect(serviceSrc).toContain('updateProfileDefinitionIfUnchanged');
    expect(serviceSrc).toContain('updateProfileChangeProposalIfPending');
    expect(serviceSrc).toContain('insertProfileProposalEvent');
    expect(serviceSrc).toContain('transaction');
    expect(ontologyDataIndexSrc).toContain('applyPendingBaseProfileChangeProposal');
    expect(ontologyRootIndexSrc).not.toContain('applyPendingBaseProfileChangeProposal');

    expect(serviceSrc).not.toMatch(/from\s+['"][^'"]*(?:features\/backup|features\/learning|features\/graph|ai\/|react|react-native|expo|zustand|@tanstack)[^'"]*['"]/);
    expect(serviceSrc).not.toMatch(/\b(autoApply|runExtractor|buildConceptualizePrompt|enqueue|complete)\b/);
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
    expect(retrievalTypes).toMatch(/profileId:\s*string/);
    // Must not have conceptType as a field on RetrievedConceptPayload
    // (allowing conceptTypes as the legacy filter alias on RetrieveFilters)
    expect(retrievalTypes).not.toMatch(/^\s+conceptType:\s*ConceptType/m);
    // RetrieveFilters must keep profileIds as the preferred scope filter.
    expect(retrievalTypes).toMatch(/profileIds\?:\s*string\[\]/);
    expect(retrievalTypes).toMatch(/profileId\?:\s*string/);
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
    const conceptRepoSrc = read('src/features/learning/data/conceptRepo.ts');
    const learningTypesSrc = read('src/features/learning/types/learning.ts');
    const saveModalTypesSrc = read('src/features/learning/types/saveModal.ts');
    const captureRepoSrc = read('src/features/learning/data/captureRepo.ts');
    const prepareSaveSrc = read('src/features/learning/services/prepareSaveCandidates.ts');
    // ConceptListFilters must expose profileIds so equal node ids in different
    // base profiles can be filtered without global-id assumptions.
    expect(hookSrc).toMatch(/profileIds\?:\s*string\[\]/);
    expect(hookSrc).toMatch(/profileId\?:\s*string/);
    // ConceptListFilters must expose typeNodeIds as the preferred filter
    expect(hookSrc).toMatch(/typeNodeIds\?:\s*ConceptType\[\]/);
    // ConceptListFilters must keep conceptType as the legacy alias
    expect(hookSrc).toMatch(/conceptType\?:\s*ConceptType/);
    // The filter logic must not be a single-field branch like:
    //   if (filters.conceptType) { ... }
    // It must consider both fields (typeNodeIds and conceptType)
    expect(hookSrc).toMatch(/filters\.typeNodeIds/);
    expect(hookSrc).toMatch(/filters\.conceptType/);
    expect(hookSrc).toMatch(/filters\.profileIds/);
    expect(hookSrc).toMatch(/filters\.profileId/);
    // The filtering helper must use a union/Set pattern
    expect(hookSrc).toMatch(/new Set<ConceptType>/);
    expect(hookSrc).toMatch(/new Set<string>/);
    expect(conceptRepoSrc).toContain('profileId: validConcept.profileId');
    expect(conceptRepoSrc).not.toContain("profileId: 'coding'");
    expect(learningTypesSrc).toMatch(/export interface LearningCapture\s*\{[\s\S]*profileId:\s*string/);
    expect(saveModalTypesSrc).toMatch(/export interface SaveModalCandidateData\s*\{[\s\S]*profileId:\s*string/);
    expect(captureRepoSrc).toContain('profileId: validCapture.profileId');
    expect(captureRepoSrc).not.toContain("profileId: 'coding'");
    expect(prepareSaveSrc).toContain('.filter((match) => match.concept.profileId === profile.id)');
    expect(prepareSaveSrc).toContain('profileId: profile.id');
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
    expect(antiRegressionRules).toContain('### Bounded LLM Worker Harness');
    expect(antiRegressionRules).toContain('Worker output must be strict-schema data that passes validation');
    expect(antiRegressionRules).toContain('Future photography/media analyzers may emit bounded observations');
    expect(antiRegressionRules).toContain('REGRESSION BAN FABLE-009');
    expect(antiRegressionRules).toContain('REGRESSION BAN FABLE-010');
    expect(antiRegressionRules).toContain('worker output is intermediate data only, not a mutation path');
    expect(antiRegressionRules).toContain('media analysis is an observation source, not a profile mutation path');
    expect(antiRegressionRules).toContain('### Self-Building App Framework');
    expect(antiRegressionRules).toContain('### Language/DSL Direction');
    expect(antiRegressionRules).toContain('### Overlay Over Existing Systems');
    expect(antiRegressionRules).toContain('### Active-Profile Overlays');
  });

  it('keeps the bounded LLM worker harness note in root architecture docs', () => {
    const architecture = fs.readFileSync(path.join(repoRoot, 'ARCHITECTURE.md'), 'utf8');

    expect(architecture).toContain('### Bounded LLM worker harness');
    expect(architecture).toContain('deterministic selector / ContextPack');
    expect(architecture).toContain('strict schema output');
    expect(architecture).toContain('Worker output is intermediate data, not a mutation path');
    expect(architecture).toContain('Future photography/media analyzers follow the same rule.');
    expect(architecture).toContain('photo pixels, EXIF, edits, or user captions');
    expect(architecture).toContain('proposal/review/apply boundaries');
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
