import { describe, expect, it, vi } from 'vitest';
import { prepareSaveCandidates } from '../prepareSaveCandidates';
import { unsafeConceptId } from '../../types/ids';
import { composeDomainProfile, codingProfile, photographyProfile, type DomainProfile, type ProfileOverlay, type OntologyNode } from '../../../ontology';
import type { ConceptMatch } from '../conceptMatchPreCheck';
import {
  CONCEPTUALIZE_PROMPT_OUTPUT_VERSION,
} from '../conceptualizePromptBuilder';
import type { ConceptualizeProfileContext } from '../conceptualizeProfileContext';

vi.mock('../../../../ai/queue', () => ({
  enqueue: vi.fn(),
}));

vi.mock('../conceptMatchPreCheck', () => ({
  conceptMatchPreCheck: vi.fn(),
}));

const conceptId = unsafeConceptId('c_123456789012345678901');

function conceptualizeContext(profile: DomainProfile = codingProfile): ConceptualizeProfileContext {
  return {
    profile,
    baseProfile: codingProfile,
    branches: [],
    selectionSnapshot: { baseProfileId: codingProfile.id },
    proposalTarget: { kind: 'base_profile', profileId: codingProfile.id },
    compositionStamp: {
      baseProfileId: codingProfile.id,
      activeProfileId: profile.id,
      branchOrder: [],
      compositionHash: 'fnv1a32:testhash',
    },
    scopeLegend: {
      activeScopeId: codingProfile.id,
      scopes: [{ scopeId: codingProfile.id, label: codingProfile.label, kind: 'baseProfile' }],
    },
  };
}

describe('Stage 2 prepareSaveCandidates', () => {
  it('maps extractor output to save modal candidate data with match similarity', async () => {
    const matches: ConceptMatch[] = [
      {
        similarity: 0.72,
        concept: {
        id: conceptId,
        profileId: 'coding',
        name: 'Closure',
          normalizedKey: 'closure',
          canonicalSummary: null,
          conceptType: 'mechanism',
          coreConcept: 'lexical scope',
          architecturalPattern: null,
          programmingParadigm: null,
          languageOrRuntime: ['javascript'],
          surfaceFeatures: [],
          prerequisites: [],
          relatedConcepts: [],
          contrastConcepts: [],
          representativeCaptureIds: [],
          familiarityScore: 0,
          importanceScore: 0,
          createdAt: 0,
          updatedAt: 0,
        },
      },
    ];

    const candidates = await prepareSaveCandidates(
      {
        selectedText: 'const value = 1; return () => value;',
        snippetLang: 'typescript',
      },
      {
        preCheck: async () => matches,
        complete: async () =>
          JSON.stringify({
            candidates: [
              {
                title: 'Closure keeps outer state',
                whatClicked: 'The returned function can still read the outer variable.',
                whyItMattered: null,
                rawSnippet: 'const value = 1; return () => value;',
                keywords: ['closure', 'scope'],
                conceptHint: {
                  proposedName: 'Closure',
                  proposedNormalizedKey: 'closure',
                  proposedConceptType: 'mechanism',
                  extractionConfidence: 0.9,
                  linkedConceptId: conceptId,
                  linkedConceptName: 'Closure',
                  linkedConceptLanguages: ['javascript'],
                  isNewLanguageForExistingConcept: true,
                },
              },
            ],
          }),
      },
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      profileId: 'coding',
      linkedConceptId: conceptId,
      matchSimilarity: 0.72,
      snippetLang: 'typescript',
      isNewLanguageForExistingConcept: true,
      keywords: ['closure', 'scope'],
    });
  });

  it('filters concept pre-check matches to the active profile before prompt and linking', async () => {
    let capturedPrompt = '';
    const matches: ConceptMatch[] = [
      {
        similarity: 0.91,
        concept: {
          id: conceptId,
          profileId: 'coding',
          name: 'Coding Composition',
          normalizedKey: 'composition',
          canonicalSummary: null,
          conceptType: 'composition',
          coreConcept: null,
          architecturalPattern: null,
          programmingParadigm: null,
          languageOrRuntime: [],
          surfaceFeatures: [],
          prerequisites: [],
          relatedConcepts: [],
          contrastConcepts: [],
          representativeCaptureIds: [],
          familiarityScore: 0,
          importanceScore: 0,
          createdAt: 0,
          updatedAt: 0,
        },
      },
    ];

    const candidates = await prepareSaveCandidates(
      { selectedText: 'Frame this shot with foreground balance.' },
      {
        profile: photographyProfile,
        preCheck: async () => matches,
        complete: async (prompt) => {
          capturedPrompt = prompt;
          return JSON.stringify({
            candidates: [
              {
                title: 'Foreground composition',
                whatClicked: 'The subject is framed by foreground elements.',
                whyItMattered: null,
                rawSnippet: 'Frame this shot with foreground balance.',
                keywords: ['composition'],
                conceptHint: {
                  proposedName: 'Foreground composition',
                  proposedNormalizedKey: 'foreground composition',
                  proposedConceptType: 'composition',
                  extractionConfidence: 0.8,
                  linkedConceptId: conceptId,
                  linkedConceptName: 'Coding Composition',
                  linkedConceptLanguages: null,
                  isNewLanguageForExistingConcept: false,
                },
              },
            ],
          });
        },
      },
    );

    expect(capturedPrompt).not.toContain('Coding Composition');
    expect(candidates[0]).toMatchObject({
      profileId: 'photography',
      linkedConceptId: null,
      matchSimilarity: null,
    });
  });

  it('uses the coding profile by default when no profile option is passed', async () => {
    let capturedPrompt = '';
    const matches: ConceptMatch[] = [];

    await prepareSaveCandidates(
      { selectedText: 'some code here' },
      {
        preCheck: async () => matches,
        complete: async (prompt) => {
          capturedPrompt = prompt;
          return JSON.stringify({
            candidates: [
              {
                title: 'Test',
                whatClicked: 'Something clicked',
                whyItMattered: null,
                rawSnippet: 'some code here',
                keywords: ['test'],
                conceptHint: {
                  proposedName: 'Test',
                  proposedNormalizedKey: 'test',
                  proposedConceptType: 'mechanism',
                  extractionConfidence: 0.5,
                  linkedConceptId: null,
                  linkedConceptName: null,
                  linkedConceptLanguages: [],
                  isNewLanguageForExistingConcept: false,
                },
              },
            ],
          });
        },
      },
    );

    // Coding profile ontology nodes should be present in the prompt
    expect(capturedPrompt).toContain('mechanism:');
    expect(capturedPrompt).toContain('mental_model:');
    expect(capturedPrompt).toContain('pattern:');
    // Overlay-only node should NOT be present
    expect(capturedPrompt).not.toContain('project_runtime_node');
  });

  it('falls back to the profile default when the extractor invents an unknown type id', async () => {
    const candidates = await prepareSaveCandidates(
      { selectedText: 'some code here' },
      {
        preCheck: async () => [],
        complete: async () =>
          JSON.stringify({
            candidates: [
              {
                title: 'Test',
                whatClicked: 'Something clicked',
                whyItMattered: null,
                rawSnippet: 'some code here',
                keywords: ['test'],
                conceptHint: {
                  proposedName: 'Test',
                  proposedNormalizedKey: 'test',
                  proposedConceptType: 'hallucinated_runtime_kind',
                  extractionConfidence: 0.5,
                  linkedConceptId: null,
                  linkedConceptName: null,
                  linkedConceptLanguages: [],
                  isNewLanguageForExistingConcept: false,
                },
              },
            ],
          }),
      },
    );

    expect(candidates[0]?.conceptHint?.proposedConceptType)
      .toBe(codingProfile.promotion.defaultTypeNodeId);
    expect(candidates[0]?.rawProposedTypeIdentity).toEqual({
      kind: 'unresolved_raw',
      rawNodeId: 'hallucinated_runtime_kind',
      source: 'extractor',
      activeScopeId: 'coding',
    });
    expect(candidates[0]?.rawProposedTypeNodeId).toBe('hallucinated_runtime_kind');
  });

  it('uses Conceptualize classification to replace only the ontology placement', async () => {
    const candidates = await prepareSaveCandidates(
      { selectedText: 'some code here' },
      {
        preCheck: async () => [],
        conceptualizeContext: conceptualizeContext(),
        complete: async () =>
          JSON.stringify({
            candidates: [
              {
                title: 'Test',
                whatClicked: 'Something clicked',
                whyItMattered: null,
                rawSnippet: 'some code here',
                keywords: ['test'],
                conceptHint: {
                  proposedName: 'Test',
                  proposedNormalizedKey: 'test',
                  proposedConceptType: 'mechanism',
                  extractionConfidence: 0.5,
                  linkedConceptId: null,
                  linkedConceptName: null,
                  linkedConceptLanguages: null,
                  isNewLanguageForExistingConcept: false,
                },
              },
            ],
          }),
        conceptualizeComplete: async () =>
          JSON.stringify({
            schemaVersion: CONCEPTUALIZE_PROMPT_OUTPUT_VERSION,
            classification: {
              primaryNodeRef: { scopeId: 'coding', nodeId: 'pattern' },
              noStrongMatch: false,
              suggestedNewConcept: null,
              confidence: 0.86,
              rationale: 'The capture describes a reusable coding pattern.',
            },
            diagnostics: {
              candidateRefs: [
                { ref: { scopeId: 'coding', nodeId: 'mechanism' }, rank: 2, score: 0.44 },
              ],
            },
          }),
      },
    );

    expect(candidates[0]).toMatchObject({
      title: 'Test',
      whatClicked: 'Something clicked',
      rawSnippet: 'some code here',
      extractionConfidence: 0.86,
      rawProposedTypeIdentity: {
        kind: 'scoped_ref',
        scopeId: 'coding',
        nodeId: 'pattern',
        source: 'conceptualize',
      },
      rawProposedTypeNodeId: 'coding:pattern',
    });
    expect(candidates[0]?.conceptHint?.proposedConceptType).toBe('pattern');
  });

  it('keeps noStrongMatch as an explicit missing placement instead of inventing a fallback type', async () => {
    const candidates = await prepareSaveCandidates(
      { selectedText: 'some code here' },
      {
        preCheck: async () => [],
        conceptualizeContext: conceptualizeContext(),
        complete: async () =>
          JSON.stringify({
            candidates: [
              {
                title: 'Test',
                whatClicked: 'Something clicked',
                whyItMattered: null,
                rawSnippet: 'some code here',
                keywords: ['test'],
                conceptHint: {
                  proposedName: 'Test',
                  proposedNormalizedKey: 'test',
                  proposedConceptType: 'mechanism',
                  extractionConfidence: 0.5,
                  linkedConceptId: null,
                  linkedConceptName: null,
                  linkedConceptLanguages: null,
                  isNewLanguageForExistingConcept: false,
                },
              },
            ],
          }),
        conceptualizeComplete: async () =>
          JSON.stringify({
            schemaVersion: CONCEPTUALIZE_PROMPT_OUTPUT_VERSION,
            classification: {
              primaryNodeRef: null,
              noStrongMatch: true,
              suggestedNewConcept: {
                label: 'Unmodeled Save State',
                kind: 'subcategory',
                parentNodeRef: { scopeId: 'coding', nodeId: 'mechanism' },
                meaning: 'The capture needs a more specific save-state concept.',
                reason: 'No existing node is specific enough.',
              },
              confidence: 0.34,
              rationale: 'The supplied taxonomy does not contain a strong fit.',
            },
            diagnostics: {
              candidateRefs: [
                { ref: { scopeId: 'coding', nodeId: 'mechanism' }, rank: 2, score: 0.41 },
              ],
            },
          }),
      },
    );

    expect(candidates[0]?.conceptHint).toBeNull();
    expect(candidates[0]?.rawProposedTypeIdentity).toBeNull();
    expect(candidates[0]?.rawProposedTypeNodeId).toBeNull();
    expect(candidates[0]?.extractionConfidence).toBe(0.34);
    expect(candidates[0]?.conceptualizeMissingConcept).toMatchObject({
      status: 'no_strong_match',
      confidence: 0.34,
      suggestedNewConcept: {
        label: 'Unmodeled Save State',
        parentLabel: 'Mechanism',
      },
    });
  });

  it('passes the caller abort signal through to Conceptualize classification', async () => {
    const controller = new AbortController();
    let capturedSignal: AbortSignal | undefined;

    await prepareSaveCandidates(
      { selectedText: 'some code here' },
      {
        signal: controller.signal,
        preCheck: async () => [],
        conceptualizeContext: conceptualizeContext(),
        complete: async () =>
          JSON.stringify({
            candidates: [
              {
                title: 'Test',
                whatClicked: 'Something clicked',
                whyItMattered: null,
                rawSnippet: 'some code here',
                keywords: ['test'],
                conceptHint: {
                  proposedName: 'Test',
                  proposedNormalizedKey: 'test',
                  proposedConceptType: 'mechanism',
                  extractionConfidence: 0.5,
                  linkedConceptId: null,
                  linkedConceptName: null,
                  linkedConceptLanguages: null,
                  isNewLanguageForExistingConcept: false,
                },
              },
            ],
          }),
        conceptualizeComplete: async (_prompt, _input, signal) => {
          capturedSignal = signal;
          return JSON.stringify({
            schemaVersion: CONCEPTUALIZE_PROMPT_OUTPUT_VERSION,
            classification: {
              primaryNodeRef: { scopeId: 'coding', nodeId: 'pattern' },
              noStrongMatch: false,
              suggestedNewConcept: null,
              confidence: 0.86,
              rationale: 'The capture describes a reusable coding pattern.',
            },
            diagnostics: {
              candidateRefs: [
                { ref: { scopeId: 'coding', nodeId: 'mechanism' }, rank: 2, score: 0.44 },
              ],
            },
          });
        },
      },
    );

    expect(capturedSignal).toBe(controller.signal);
  });

  it('propagates Conceptualize aborts instead of falling back to extractor placement', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const abort = new Error('The operation was aborted');
    abort.name = 'AbortError';
    let conceptualizeCalls = 0;

    await expect(prepareSaveCandidates(
      { selectedText: 'some code here' },
      {
        preCheck: async () => [],
        conceptualizeContext: conceptualizeContext(),
        complete: async () =>
          JSON.stringify({
            candidates: [
              {
                title: 'Test',
                whatClicked: 'Something clicked',
                whyItMattered: null,
                rawSnippet: 'some code here',
                keywords: ['test'],
                conceptHint: {
                  proposedName: 'Test',
                  proposedNormalizedKey: 'test',
                  proposedConceptType: 'mechanism',
                  extractionConfidence: 0.5,
                  linkedConceptId: null,
                  linkedConceptName: null,
                  linkedConceptLanguages: null,
                  isNewLanguageForExistingConcept: false,
                },
              },
            ],
          }),
        conceptualizeComplete: async () => {
          conceptualizeCalls += 1;
          throw abort;
        },
      },
    )).rejects.toBe(abort);

    expect(conceptualizeCalls).toBe(1);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('keeps the extractor placement when Conceptualize classification fails validation', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const conceptualizeCalls: string[] = [];

    const candidates = await prepareSaveCandidates(
      { selectedText: 'some code here' },
      {
        preCheck: async () => [],
        conceptualizeContext: conceptualizeContext(),
        complete: async () =>
          JSON.stringify({
            candidates: [
              {
                title: 'Test',
                whatClicked: 'Something clicked',
                whyItMattered: null,
                rawSnippet: 'some code here',
                keywords: ['test'],
                conceptHint: {
                  proposedName: 'Test',
                  proposedNormalizedKey: 'test',
                  proposedConceptType: 'mechanism',
                  extractionConfidence: 0.5,
                  linkedConceptId: null,
                  linkedConceptName: null,
                  linkedConceptLanguages: null,
                  isNewLanguageForExistingConcept: false,
                },
              },
            ],
          }),
        conceptualizeComplete: async (_prompt, input) => {
          conceptualizeCalls.push(input);
          return JSON.stringify({
            schemaVersion: CONCEPTUALIZE_PROMPT_OUTPUT_VERSION,
            classification: {
              primaryNodeRef: { scopeId: 'coding', nodeId: 'not_real' },
              noStrongMatch: false,
              suggestedNewConcept: null,
              confidence: 0.86,
              rationale: 'Invalid ref.',
            },
            diagnostics: { candidateRefs: [] },
          });
        },
      },
    );

    expect(conceptualizeCalls).toHaveLength(2);
    expect(conceptualizeCalls[1]).toContain('Validation error:');
    expect(candidates[0]?.conceptHint?.proposedConceptType).toBe('mechanism');
    expect(candidates[0]?.extractionConfidence).toBe(0.5);
    expect(warn).toHaveBeenCalledWith(
      '[learning] Conceptualize classification failed; keeping extractor placement',
      expect.any(Error),
    );
    warn.mockRestore();
  });

  it('includes an overlay-added ontology node in the prompt when a composed profile is passed', async () => {
    const overlayNode: OntologyNode = {
      id: 'project_runtime_node',
      label: 'Project Runtime Node',
      kind: 'category',
      parentId: null,
      meaning: 'A project-specific runtime concept for the current codebase.',
      useWhen: ['The insight is specific to the current project runtime'],
      doNotUseWhen: [],
      examples: ['custom event loop variant'],
      relatedNodeIds: [],
      contrastNodeIds: [],
      status: 'active',
      createdBy: 'user',
      createdAt: 1000,
      updatedAt: 1000,
    };

    const overlay: ProfileOverlay<string> = {
      kind: 'project',
      id: 'test_project_overlay',
      addOntologyNodes: [overlayNode],
      addItemTypeNodeIds: ['project_runtime_node'],
    };

    const composedProfile = composeDomainProfile(
      codingProfile as DomainProfile<string>,
      [overlay],
    );

    let capturedPrompt = '';
    const matches: ConceptMatch[] = [];

    await prepareSaveCandidates(
      { selectedText: 'some code here' },
      {
        preCheck: async () => matches,
        profile: composedProfile,
        complete: async (prompt) => {
          capturedPrompt = prompt;
          return JSON.stringify({
            candidates: [
              {
                title: 'Test',
                whatClicked: 'Something clicked',
                whyItMattered: null,
                rawSnippet: 'some code here',
                keywords: ['test'],
                conceptHint: {
                  proposedName: 'Test',
                  proposedNormalizedKey: 'test',
                  proposedConceptType: 'mechanism',
                  extractionConfidence: 0.5,
                  linkedConceptId: null,
                  linkedConceptName: null,
                  linkedConceptLanguages: [],
                  isNewLanguageForExistingConcept: false,
                },
              },
            ],
          });
        },
      },
    );

    // The overlay-added node should appear in the prompt
    expect(capturedPrompt).toContain('project_runtime_node');
    expect(capturedPrompt).toContain('Project Runtime Node');
    expect(capturedPrompt).toContain('A project-specific runtime concept for the current codebase.');
  });

  it('does not mutate the base profile or overlay when a composed profile is passed', async () => {
    const overlayNode: OntologyNode = {
      id: 'project_runtime_node',
      label: 'Project Runtime Node',
      kind: 'category',
      parentId: null,
      meaning: 'A project-specific runtime concept.',
      useWhen: ['The insight is project-specific'],
      doNotUseWhen: [],
      examples: [],
      relatedNodeIds: [],
      contrastNodeIds: [],
      status: 'active',
      createdBy: 'user',
      createdAt: 2000,
      updatedAt: 2000,
    };

    const baseProfile = {
      ...codingProfile,
      ontology: {
        ...codingProfile.ontology,
        nodes: codingProfile.ontology.nodes.map((n) => ({ ...n })),
      },
    } as DomainProfile<string>;

    const overlay: ProfileOverlay<string> = {
      kind: 'project',
      id: 'mutation_test_overlay',
      addOntologyNodes: [overlayNode],
    };

    const composedProfile = composeDomainProfile(baseProfile, [overlay]);

    // Snapshot values before calling prepareSaveCandidates
    const baseNodeCountBefore = baseProfile.ontology.nodes.length;
    const overlayNodeCountBefore = overlay.addOntologyNodes?.length ?? 0;
    const baseNodeIdsBefore = new Set(baseProfile.ontology.nodes.map((n) => n.id));
    const overlayNodeIdsBefore = new Set(
      overlay.addOntologyNodes?.map((n) => n.id) ?? [],
    );

    const matches: ConceptMatch[] = [];

    await prepareSaveCandidates(
      { selectedText: 'some code here' },
      {
        preCheck: async () => matches,
        profile: composedProfile,
        complete: async () =>
          JSON.stringify({
            candidates: [
              {
                title: 'Test',
                whatClicked: 'Something clicked',
                whyItMattered: null,
                rawSnippet: 'some code here',
                keywords: ['test'],
                conceptHint: {
                  proposedName: 'Test',
                  proposedNormalizedKey: 'test',
                  proposedConceptType: 'mechanism',
                  extractionConfidence: 0.5,
                  linkedConceptId: null,
                  linkedConceptName: null,
                  linkedConceptLanguages: [],
                  isNewLanguageForExistingConcept: false,
                },
              },
            ],
          }),
      },
    );

    // Verify base profile was not mutated
    expect(baseProfile.ontology.nodes.length).toBe(baseNodeCountBefore);
    expect(new Set(baseProfile.ontology.nodes.map((n) => n.id))).toEqual(baseNodeIdsBefore);

    // Verify overlay was not mutated
    expect(overlay.addOntologyNodes?.length).toBe(overlayNodeCountBefore);
    expect(
      new Set(overlay.addOntologyNodes?.map((n) => n.id) ?? []),
    ).toEqual(overlayNodeIdsBefore);
  });
});
