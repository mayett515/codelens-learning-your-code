import { describe, expect, it } from 'vitest';
import {
  CHECKER_PROMPT_OUTPUT_VERSION,
  assembleContextPack,
  buildCheckerPrompt,
  validateCheckerPromptOutput,
} from '../index';
import type {
  AssembleContextPackInput,
  CheckerPromptOutput,
  ContextOntologyNodeInput,
  ContextPack,
  ContextPolicy,
  ScopedNodeRef,
} from '../index';

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
    meaning: `Meaning for ${label}.`,
    useWhen: [`Use ${label}.`],
    doNotUseWhen: [`Do not use ${label}.`],
    examples: [`Example ${label}.`],
    relationshipRefs: [],
    ...overrides,
  };
}

const policy: ContextPolicy = {
  trustMode: 'suggest_first',
  autoApplyEnabled: false,
  maxAutoApplyRiskScore: 0,
  approvalRequiredFor: ['base_profile_mutation'],
  forbiddenSilentMutations: ['base_profile', 'profile_branch'],
  coreMutationRule: 'explicitUserIntentOrCrossScopeEvidenceOnly',
  opsMustUseNodeRef: true,
};

function makePack(overrides: Partial<AssembleContextPackInput> = {}): ContextPack {
  return assembleContextPack({
    packId: 'checker-pack-1',
    createdAt: 100,
    consumer: 'checker',
    focal: {
      kind: 'checkerRun',
      id: 'checker-run-1',
      summary: 'Review repeated React classification corrections.',
      nodeRefs: [ref('react-project', 'effect')],
      sourceIds: ['checker-run-1'],
    },
    compositionStamp: {
      baseProfileId: 'coding',
      activeProfileId: 'coding-runtime',
      branchOrder: [{ branchId: 'react-project', kind: 'project' }],
      compositionHash: 'hash-1',
    },
    scopeLegend: {
      activeScopeId: 'react-project',
      scopes: [
        { scopeId: 'coding', label: 'Coding Core', kind: 'baseProfile' },
        { scopeId: 'react-project', label: 'React Project', kind: 'branch' },
      ],
    },
    ontologyNodes: [
      node('react-project', 'effect', 'Effect', { pinned: true }),
      node('react-project', 'frontend', 'Frontend'),
      node('coding', 'concept', 'Concept'),
    ],
    evidenceClaims: [
      {
        evidenceId: 'evidence-1',
        previousNodeRef: ref('react-project', 'effect'),
        correctedNodeRef: ref('react-project', 'frontend'),
        reason: 'The user repeatedly corrected this toward frontend behavior.',
        patternFrequency: 3,
        latestAt: 90,
        crossScope: false,
        sourceIds: ['capture-1', 'capture-2'],
      },
    ],
    proposalSnapshots: [
      {
        proposalId: 'proposal-1',
        proposalKind: 'ontology_node_patch',
        target: { kind: 'profile_branch', branchId: 'react-project' },
        status: 'pending',
        title: 'Add old proposal',
        summary: 'Existing pending checker proposal.',
        riskScore: 20,
        evidenceIds: ['evidence-1'],
        nodeRefs: [ref('react-project', 'old_proposal')],
      },
    ],
    proposalEventSignals: [],
    userFitNodeSignals: [],
    userFitProposalSignals: [],
    policy,
    caps: {
      maxNodes: 10,
      maxEvidenceClaims: 10,
      maxProposals: 10,
      maxProposalEvents: 10,
      maxUserFitNodeSignals: 10,
      maxUserFitProposalSignals: 10,
    },
    ...overrides,
  });
}

function goodOutput(overrides: Partial<CheckerPromptOutput> = {}): CheckerPromptOutput {
  return {
    schemaVersion: CHECKER_PROMPT_OUTPUT_VERSION,
    explanation: {
      summary: 'Repeated corrections suggest one missing branch-local concept.',
      relationshipOrBoundaryObservations: ['The effect/frontend boundary may need a later typed operation.'],
    },
    findings: [
      {
        kind: 'missing_branch_item_type',
        label: 'React render timing',
        parentNodeRef: ref('react-project', 'frontend'),
        meaning: 'Timing behavior around React render and commit work.',
        rationale: 'Three corrections point to a missing branch-local item type.',
        evidenceIds: ['evidence-1'],
        semanticConfidence: 0.82,
      },
    ],
    ...overrides,
  };
}

describe('checker prompt builder', () => {
  it('builds a checker-only prompt payload without persistence fields for the model to fill', () => {
    const result = buildCheckerPrompt({ pack: makePack() });

    expect(result.outputSchemaName).toBe('CheckerPromptOutputSchema');
    expect(result.instructionShell).toContain('Do not fill proposal slots');
    expect(result.instructionShell).toContain('Do not output proposed node ids');
    expect(result.allowedNodeRefKeys).toEqual(expect.arrayContaining([
      'react-project:effect',
      'react-project:frontend',
    ]));
    expect(result.allowedEvidenceIds).toEqual(['evidence-1']);
    expect(result.dataPayload.policy.allowedFindingKinds).toEqual(['missing_branch_item_type']);
    expect(result.dataPayload.proposals.pendingSnapshots).toHaveLength(1);
    expect(result.promptText).toContain('KORDEX_CHECKER_CONTEXT_PAYLOAD_JSON');
  });

  it('validates output refs and evidence against the supplied checker ContextPack', () => {
    const result = validateCheckerPromptOutput(goodOutput(), makePack());

    expect(result).toMatchObject({
      valid: true,
      errors: [],
      output: {
        findings: [
          {
            kind: 'missing_branch_item_type',
            label: 'React render timing',
          },
        ],
      },
    });
  });

  it('rejects unsupported proposal kinds and model-supplied persistence metadata', () => {
    expect(validateCheckerPromptOutput({
      ...goodOutput(),
      findings: [
        {
          ...goodOutput().findings[0],
          kind: 'boundary_rule',
        },
      ],
    }, makePack()).errors.map((error) => error.code)).toContain('schema');

    expect(validateCheckerPromptOutput({
      ...goodOutput(),
      findings: [
        {
          ...goodOutput().findings[0],
          status: 'suggested',
          createdBy: 'model',
        },
      ],
    }, makePack()).errors.map((error) => error.code)).toContain('schema');
  });

  it('rejects unknown refs, unknown evidence ids, and duplicate findings', () => {
    const result = validateCheckerPromptOutput({
      ...goodOutput(),
      findings: [
        {
          ...goodOutput().findings[0],
          parentNodeRef: ref('missing-scope', 'missing-parent'),
          evidenceIds: ['evidence-1', 'missing-evidence'],
        },
        {
          ...goodOutput().findings[0],
          label: '  react   render timing  ',
          parentNodeRef: ref('missing-scope', 'missing-parent'),
        },
      ],
    }, makePack());

    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.code)).toEqual(expect.arrayContaining([
      'unknown-ref',
      'unknown-evidence',
      'duplicate-finding',
    ]));
  });

  it('refuses non-checker ContextPacks', () => {
    const pack = makePack({ consumer: 'conceptualize' });

    expect(() => buildCheckerPrompt({ pack })).toThrow('consumer "checker"');
    expect(validateCheckerPromptOutput(goodOutput(), pack).errors).toContainEqual(expect.objectContaining({
      code: 'wrong-consumer',
    }));
  });
});
