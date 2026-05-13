import { describe, expect, it, vi } from 'vitest';
import { prepareSaveCandidates } from '../prepareSaveCandidates';
import { unsafeConceptId } from '../../types/ids';
import { composeDomainProfile, codingProfile, type DomainProfile, type ProfileOverlay, type OntologyNode } from '../../../ontology';
import type { ConceptMatch } from '../conceptMatchPreCheck';

vi.mock('../../../../ai/queue', () => ({
  enqueue: vi.fn(),
}));

vi.mock('../conceptMatchPreCheck', () => ({
  conceptMatchPreCheck: vi.fn(),
}));

const conceptId = unsafeConceptId('c_123456789012345678901');

describe('Stage 2 prepareSaveCandidates', () => {
  it('maps extractor output to save modal candidate data with match similarity', async () => {
    const matches: ConceptMatch[] = [
      {
        similarity: 0.72,
        concept: {
          id: conceptId,
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
      linkedConceptId: conceptId,
      matchSimilarity: 0.72,
      snippetLang: 'typescript',
      isNewLanguageForExistingConcept: true,
      keywords: ['closure', 'scope'],
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
    expect(candidates[0]?.rawProposedTypeNodeId).toBe('hallucinated_runtime_kind');
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
