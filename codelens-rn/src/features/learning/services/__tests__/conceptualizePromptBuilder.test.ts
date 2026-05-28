import { describe, expect, it } from 'vitest';
import {
  assembleContextPack,
  scopedNodeRefKey,
  type AssembleContextPackInput,
  type ContextOntologyNodeInput,
  type ContextPack,
  type ContextPolicy,
  type ScopedNodeRef,
} from '../../../ontology';
import {
  CONCEPTUALIZE_PROMPT_OUTPUT_VERSION,
  buildConceptualizePrompt,
  deriveConceptualizeDiagnosticCandidatePolicy,
  getConceptualizePublicClassification,
  validateConceptualizePromptOutput,
  type ConceptualizePromptOutput,
} from '../conceptualizePromptBuilder';

function ref(scopeId: string, nodeId: string): ScopedNodeRef {
  return { scopeId, nodeId };
}

function node(
  scopeId: string,
  nodeId: string,
  label: string,
  overrides: Partial<ContextOntologyNodeInput> = {},
): ContextOntologyNodeInput {
  return {
    ref: ref(scopeId, nodeId),
    label,
    meaning: `Meaning for ${scopeId}/${nodeId}`,
    useWhen: [`use ${nodeId}`, `prefer ${nodeId}`],
    doNotUseWhen: [`do not use ${nodeId}`],
    examples: [`example ${nodeId}`],
    relationshipRefs: [],
    ...overrides,
  };
}

const policy: ContextPolicy = {
  trustMode: 'suggest_first',
  autoApplyEnabled: false,
  maxAutoApplyRiskScore: 0,
  approvalRequiredFor: ['base_profile_mutation', 'profile_branch_mutation'],
  forbiddenSilentMutations: ['base_profile', 'profile_branch', 'old_captures'],
  coreMutationRule: 'explicitUserIntentOrCrossScopeEvidenceOnly',
  opsMustUseNodeRef: true,
};

function packInput(overrides: Partial<AssembleContextPackInput> = {}): AssembleContextPackInput {
  return {
    packId: 'conceptualize-shadow:candidate-0',
    createdAt: 123,
    consumer: 'conceptualize',
    focal: {
      kind: 'capture',
      id: 'draft:candidate-0',
      summary: 'Long exposure created city-light noise, stacking reduced it.',
      nodeRefs: [ref('night-photo', 'sensor_noise')],
      sourceIds: ['message-1'],
    },
    compositionStamp: {
      baseProfileId: 'photography',
      activeProfileId: 'photography',
      branchOrder: [{ branchId: 'night-photo', kind: 'project' }],
      compositionHash: 'fnv1a32:12345678',
    },
    scopeLegend: {
      activeScopeId: 'night-photo',
      scopes: [
        { scopeId: 'photography', label: 'Photography', kind: 'baseProfile' },
        { scopeId: 'night-photo', label: 'Night Photography', kind: 'branch' },
      ],
    },
    ontologyNodes: [
      node('photography', 'noise', 'Noise', {
        meaning: 'Visual artifacts in an image.',
        pinned: true,
      }),
      node('night-photo', 'sensor_noise', 'Noise', {
        meaning: 'Noise caused by sensor/ISO behavior in night photography.',
        pinned: true,
      }),
      node('night-photo', 'stacking', 'Stacking', {
        meaning: 'Combining multiple frames to reduce noise.',
      }),
    ],
    evidenceClaims: [],
    proposalSnapshots: [],
    proposalEventSignals: [],
    policy,
    caps: {
      maxNodes: 3,
      maxEvidenceClaims: 1,
      maxProposals: 1,
      maxProposalEvents: 1,
      maxGraphNeighbors: 1,
    },
    ...overrides,
  };
}

function validOutput(
  overrides: Partial<ConceptualizePromptOutput['classification']> = {},
  diagnosticOverrides: Partial<ConceptualizePromptOutput['diagnostics']> = {},
): ConceptualizePromptOutput {
  const base = baseOutput();
  return {
    ...base,
    classification: {
      ...base.classification,
      ...overrides,
    },
    diagnostics: {
      ...base.diagnostics,
      ...diagnosticOverrides,
    },
  };
}

function baseOutput(): ConceptualizePromptOutput {
  return {
    schemaVersion: CONCEPTUALIZE_PROMPT_OUTPUT_VERSION,
    classification: {
      primaryNodeRef: ref('night-photo', 'sensor_noise'),
      noStrongMatch: false,
      suggestedNewConcept: null,
      confidence: 0.82,
      rationale: 'The capture is about sensor noise; stacking was a close but secondary internal candidate.',
    },
    diagnostics: {
      candidateRefs: [
        { ref: ref('night-photo', 'stacking'), rank: 2, score: 0.64 },
      ],
    },
  };
}

describe('Conceptualize prompt builder', () => {
  it('renders a deterministic instruction shell plus compact ontology data payload from a ContextPack', () => {
    const pack = assembleContextPack(packInput());
    const before = JSON.stringify(pack);

    const result = buildConceptualizePrompt({ pack });

    expect(result.outputSchemaName).toBe('ConceptualizePromptOutputSchema');
    expect(result.instructionShell).toContain('Use the KORDEX_CONTEXT_PAYLOAD_JSON as the only ontology map');
    expect(result.instructionShell).toContain('Do not invent, pluralize, rename, or coerce refs');
    expect(result.instructionShell).toContain('Do not return public extra tags or visible alternative placements.');
    expect(result.instructionShell).toContain('diagnostics.candidateRefs is internal calibration data only');
    expect(result.promptText).toContain('KORDEX_CONTEXT_PAYLOAD_JSON');
    expect(result.dataPayload.ontology.allowedNodeRefKeys).toEqual([
      'photography:noise',
      'night-photo:sensor_noise',
      'night-photo:stacking',
    ]);
    expect(result.dataPayload.ontology.nodes[1]).toMatchObject({
      refKey: 'night-photo:sensor_noise',
      label: 'Noise',
      meaning: 'Noise caused by sensor/ISO behavior in night photography.',
    });
    expect(result.dataPayload.diagnostics.candidatePolicy).toMatchObject({
      visibility: 'internalOnly',
      persistence: 'correctionEvidenceOnly',
      selectionRule: 'closestDecisionRelevantRefsOnly',
      maxCandidateRefs: 2,
    });
    expect(JSON.stringify(pack)).toBe(before);
  });

  it('derives diagnostic candidate policy from ambiguity pressure instead of a public fixed extra-tag count', () => {
    const pack = assembleContextPack(packInput({
      ontologyNodes: [
        node('photography', 'noise', 'Noise', { pinned: true }),
        node('night-photo', 'sensor_noise', 'Noise', { pinned: true }),
        node('night-photo', 'stacking', 'Stacking'),
        node('night-photo', 'long_exposure', 'Long Exposure'),
        node('night-photo', 'star_trails', 'Star Trails'),
      ],
      evidenceClaims: [
        {
          evidenceId: 'evidence-1',
          subjectNodeRef: ref('night-photo', 'star_trails'),
          previousNodeRef: ref('night-photo', 'star_trails'),
          correctedNodeRef: ref('night-photo', 'long_exposure'),
          reason: 'The correction was about the exposure setting.',
          patternFrequency: 3,
          latestAt: 456,
          crossScope: false,
          sourceIds: ['capture-1'],
        },
      ],
      proposalSnapshots: [
        {
          proposalId: 'proposal-1',
          proposalKind: 'classification_patch',
          target: { kind: 'profile_branch', branchId: 'night-photo' },
          status: 'pending',
          title: 'Prefer long exposure in settings notes',
          summary: 'Branch-local ranking proposal.',
          riskScore: 18,
          evidenceIds: ['evidence-1'],
          nodeRefs: [ref('night-photo', 'long_exposure')],
        },
      ],
      caps: {
        maxNodes: 5,
        maxEvidenceClaims: 3,
        maxProposals: 3,
        maxProposalEvents: 1,
        maxGraphNeighbors: 1,
      },
    }));

    const policyResult = deriveConceptualizeDiagnosticCandidatePolicy(pack);

    expect(policyResult.maxCandidateRefs).toBeGreaterThan(2);
    expect(policyResult.maxCandidateRefs).toBeLessThanOrEqual(4);
    expect(policyResult.derivedFrom).toMatchObject({
      ontologyNodeCount: 5,
      sameLabelAmbiguityCount: 1,
      correctionEvidenceCount: 1,
      proposalSnapshotCount: 1,
      trustMode: 'suggest_first',
    });
  });

  it('renders user-fit as advisory history without turning it into ontology truth', () => {
    const pack = assembleContextPack(packInput({
      userFitNodeSignals: [
        {
          signalId: 'node:night-photo:sensor_noise',
          baseProfileId: 'photography',
          activeSelectionKey: 'base:photography|project:night-photo|learning:-|personal:-',
          activeSelectionSnapshot: {
            baseProfileId: 'photography',
            projectBranchIds: ['night-photo'],
            learningBranchIds: [],
            personalBranchIds: [],
          },
          nodeId: 'sensor_noise',
          nodeRefs: [ref('night-photo', 'sensor_noise')],
          userFitConfidence: 0.82,
          score: 0.64,
          positiveCorrectionCount: 3,
          negativeCorrectionCount: 0,
          missingConceptCorrectionCount: 1,
          nearMissHitCount: 1,
          evidenceIds: ['evidence-1'],
          latestAt: 456,
        },
      ],
      caps: {
        maxNodes: 3,
        maxEvidenceClaims: 1,
        maxProposals: 1,
        maxProposalEvents: 1,
        maxUserFitNodeSignals: 1,
        maxUserFitProposalSignals: 1,
        maxGraphNeighbors: 1,
      },
    }));

    const result = buildConceptualizePrompt({ pack });

    expect(result.instructionShell).toContain('Use userFit.nodeSignals as user correction history, not semantic truth');
    expect(result.dataPayload.userFit.nodeSignals).toEqual([
      {
        signalId: 'node:night-photo:sensor_noise',
        activeSelectionKey: 'base:photography|project:night-photo|learning:-|personal:-',
        nodeId: 'sensor_noise',
        nodeRefKeys: ['night-photo:sensor_noise'],
        confidence: 0.82,
        score: 0.64,
        positiveCorrectionCount: 3,
        negativeCorrectionCount: 0,
        missingConceptCorrectionCount: 1,
        nearMissHitCount: 1,
        evidenceIds: ['evidence-1'],
        latestAt: 456,
      },
    ]);
  });

  it('preserves same-label scoped categories so the model cannot flatten branch meaning into the core label', () => {
    const pack = assembleContextPack(packInput());
    const result = buildConceptualizePrompt({ pack });

    expect(result.dataPayload.ontology.sameLabelSiblings).toEqual([
      {
        label: 'Noise',
        normalizedLabel: 'noise',
        refKeys: ['photography:noise', 'night-photo:sensor_noise'],
      },
    ]);
    expect(result.dataPayloadJson).toContain('"photography:noise"');
    expect(result.dataPayloadJson).toContain('"night-photo:sensor_noise"');
  });

  it('accepts one public primary ref and internal diagnostic refs only when they exist in the pack', () => {
    const pack = assembleContextPack(packInput());

    const result = validateConceptualizePromptOutput(validOutput(), pack);

    expect(result).toMatchObject({ valid: true, errors: [] });
    expect(result.output?.classification.primaryNodeRef)
      .toEqual(ref('night-photo', 'sensor_noise'));
    expect(getConceptualizePublicClassification(result.output!)).not.toHaveProperty('additionalNodeRefs');
    expect(result.output?.diagnostics.candidateRefs).toEqual([
      { ref: ref('night-photo', 'stacking'), rank: 2, score: 0.64 },
    ]);
  });

  it('rejects public additional refs so Conceptualize stays singular at the UI contract', () => {
    const pack = assembleContextPack(packInput());
    const raw = {
      ...validOutput(),
      classification: {
        ...validOutput().classification,
        additionalNodeRefs: [ref('night-photo', 'stacking')],
      },
    };

    const result = validateConceptualizePromptOutput(raw, pack);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      code: 'schema',
      path: 'classification',
      message: 'Unrecognized key: "additionalNodeRefs"',
    });
  });

  it('rejects unknown refs instead of coercing labels or near-miss ids', () => {
    const pack = assembleContextPack(packInput());

    const result = validateConceptualizePromptOutput(validOutput({
      primaryNodeRef: ref('night-photo', 'noise'),
    }, {
      candidateRefs: [],
    }), pack);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      code: 'unknown-ref',
      path: 'classification.primaryNodeRef',
      message: 'night-photo:noise is not present in this ContextPack.',
    });
  });

  it('rejects unknown diagnostic candidates', () => {
    const pack = assembleContextPack(packInput());

    const result = validateConceptualizePromptOutput(validOutput({}, {
      candidateRefs: [{ ref: ref('night-photo', 'long_exposure'), rank: 2, score: 0.45 }],
    }), pack);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      code: 'unknown-ref',
      path: 'diagnostics.candidateRefs[0].ref',
      message: 'night-photo:long_exposure is not present in this ContextPack.',
    });
  });

  it('rejects diagnostic candidates that duplicate the public primary placement', () => {
    const pack = assembleContextPack(packInput());

    const result = validateConceptualizePromptOutput(validOutput({}, {
      candidateRefs: [{ ref: ref('night-photo', 'sensor_noise'), rank: 2, score: 0.81 }],
    }), pack);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      code: 'duplicate-ref',
      path: 'diagnostics.candidateRefs[0].ref',
      message: 'night-photo:sensor_noise is duplicated in the classification output.',
    });
  });

  it('rejects diagnostic candidates that exceed the dynamic ContextPack policy', () => {
    const pack = assembleContextPack(packInput());

    const result = validateConceptualizePromptOutput(validOutput({}, {
      candidateRefs: [
        { ref: ref('night-photo', 'stacking'), rank: 2, score: 0.64 },
        { ref: ref('photography', 'noise'), rank: 3, score: 0.54 },
        { ref: ref('night-photo', 'sensor_noise'), rank: 4, score: 0.44 },
      ],
    }), pack);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      code: 'diagnostic-candidate-limit',
      path: 'diagnostics.candidateRefs',
      message: 'diagnostics.candidateRefs exceeds this ContextPack policy limit of 2.',
    });
  });

  it('rejects diagnostic candidates whose ranks do not increase after the primary placement', () => {
    const pack = assembleContextPack(packInput());

    const result = validateConceptualizePromptOutput(validOutput({}, {
      candidateRefs: [
        { ref: ref('night-photo', 'stacking'), rank: 3, score: 0.64 },
        { ref: ref('photography', 'noise'), rank: 3, score: 0.54 },
      ],
    }), pack);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      code: 'rank-order',
      path: 'diagnostics.candidateRefs[1].rank',
      message: 'diagnostic candidate ranks must be strictly increasing and start after the primary placement.',
    });
  });

  it('represents missing-concept suggestions without treating them as applied ontology changes', () => {
    const pack = assembleContextPack(packInput());

    const result = validateConceptualizePromptOutput(validOutput({
      primaryNodeRef: null,
      noStrongMatch: true,
      suggestedNewConcept: {
        label: 'Hot Pixel Suppression',
        kind: 'subcategory',
        parentNodeRef: ref('night-photo', 'sensor_noise'),
        meaning: 'Handling isolated sensor artifacts in long exposures.',
        reason: 'The existing night-photo noise category is too broad for this specific issue.',
      },
    }, {
      candidateRefs: [
        { ref: ref('night-photo', 'sensor_noise'), rank: 2, score: 0.48 },
      ],
    }), pack);

    expect(result).toMatchObject({ valid: true, errors: [] });
  });

  it('rejects no-strong-match output that still claims a public primary placement', () => {
    const pack = assembleContextPack(packInput());

    const result = validateConceptualizePromptOutput(validOutput({
      noStrongMatch: true,
      suggestedNewConcept: null,
    }, {
      candidateRefs: [],
    }), pack);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      code: 'primary-forbidden',
      path: 'classification.primaryNodeRef',
      message: 'primaryNodeRef must be null when noStrongMatch is true.',
    });
  });

  it('rejects unknown suggested concept parent refs', () => {
    const pack = assembleContextPack(packInput());

    const result = validateConceptualizePromptOutput(validOutput({
      primaryNodeRef: null,
      noStrongMatch: true,
      suggestedNewConcept: {
        label: 'Hot Pixel Suppression',
        kind: 'subcategory',
        parentNodeRef: ref('night-photo', 'long_exposure'),
        meaning: 'Handling isolated sensor artifacts in long exposures.',
        reason: 'The existing night-photo noise category is too broad for this specific issue.',
      },
    }, {
      candidateRefs: [],
    }), pack);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      code: 'unknown-ref',
      path: 'classification.suggestedNewConcept.parentNodeRef',
      message: 'night-photo:long_exposure is not present in this ContextPack.',
    });
  });

  it('rejects suggestions when the model also claims a strong existing-category match', () => {
    const pack = assembleContextPack(packInput());

    const result = validateConceptualizePromptOutput(validOutput({
      suggestedNewConcept: {
        label: 'Hot Pixel Suppression',
        kind: 'subcategory',
        parentNodeRef: ref('night-photo', 'sensor_noise'),
        meaning: 'Handling isolated sensor artifacts in long exposures.',
        reason: 'The existing night-photo noise category is too broad for this specific issue.',
      },
    }), pack);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      code: 'suggestion-without-no-strong-match',
      path: 'classification.suggestedNewConcept',
      message: 'suggestedNewConcept is allowed only when noStrongMatch is true in this slice.',
    });
  });

  it('rejects invalid ContextPacks before rendering prompt data', () => {
    const pack = assembleContextPack(packInput()) as ContextPack;
    const invalid = {
      ...pack,
      compositionStamp: {
        baseProfileId: 'photography',
        activeProfileId: 'photography',
        compositionHash: 'fnv1a32:12345678',
      },
    } as unknown as ContextPack;

    expect(() => buildConceptualizePrompt({ pack: invalid })).toThrow(
      /Invalid ContextPack: compositionStamp\.branchOrder: branchOrder must be present/,
    );
  });
});
