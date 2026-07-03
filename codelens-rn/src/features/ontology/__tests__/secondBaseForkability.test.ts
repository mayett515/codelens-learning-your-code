import { describe, expect, it, vi } from 'vitest';
import type { DbOrTx } from '../../../db/client';

const { mockDb } = vi.hoisted(() => ({
  mockDb: {},
}));

vi.mock('../../../db/client', () => ({
  db: mockDb,
}));

import { CHECKER_PROMPT_OUTPUT_VERSION, type CheckerPromptOutput } from '../checkerPromptBuilder';
import { applyPendingBaseProfileChangeProposal } from '../data/baseProfileProposalApplyService';
import { applyPendingBranchLocalProfileChangeProposal } from '../data/branchLocalProposalApplyService';
import { runManualOntologyChecker, type ManualCheckerRunServiceDependencies } from '../data/checkerRunService';
import { switchProfileChangeProposalTargetToBase } from '../data/profileChangeProposalTargetSwitchService';
import { loadDefaultProfileRegistry } from '../data/profileRegistryBootstrap';
import { composeRuntimeDomainProfileFromSelection } from '../profileSelection';
import { photographyProfile } from '../profiles/photographyProfile';
import type {
  DomainProfile,
  OntologyCorrectionEvidence,
  OntologyNode,
  ProfileBranch,
  ProfileChangeProposal,
  ProfileDefinition,
  ProfileProposalEvent,
} from '../types';

const tx = { kind: 'tx' } as unknown as DbOrTx;

function makePhotoBranch(overrides: Partial<ProfileBranch<string>> = {}): ProfileBranch<string> {
  return {
    id: 'night-photography',
    parentProfileId: 'photography',
    branchKind: 'project',
    name: 'Night Photography',
    overlay: {
      id: 'night-photography-overlay',
      kind: 'project',
    },
    createdAt: 10,
    updatedAt: 20,
    ...overrides,
  };
}

function makePhotoEvidence(overrides: Partial<OntologyCorrectionEvidence> = {}): OntologyCorrectionEvidence {
  return {
    id: 'photo-evidence-1',
    profileId: 'photography',
    activeSelectionSnapshot: {
      baseProfileId: 'photography',
      projectBranchIds: ['night-photography'],
      learningBranchIds: [],
      personalBranchIds: [],
    },
    subjectKind: 'capture',
    subjectId: 'photo-note-1',
    field: 'typeNodeId',
    previousTypeNodeId: 'focus',
    correctedTypeNodeId: 'exposure',
    rawProposedTypeNodeId: null,
    nearMissCandidates: [],
    reason: 'The user corrected this night photo note toward exposure, not focus.',
    source: 'user',
    createdAt: 30,
    ...overrides,
  };
}

function checkerOutput(): CheckerPromptOutput {
  return {
    schemaVersion: CHECKER_PROMPT_OUTPUT_VERSION,
    explanation: {
      summary: 'Photography corrections suggest two missing branch-local item types.',
      relationshipOrBoundaryObservations: [],
    },
    findings: [
      {
        kind: 'missing_branch_item_type',
        label: 'Intentional motion blur',
        parentNodeRef: {
          scopeId: 'photography',
          nodeId: 'exposure',
        },
        meaning: 'A deliberate shutter-speed choice that turns subject or camera movement into visible motion.',
        rationale: 'Night-photo corrections repeatedly distinguish motion blur from focus mistakes.',
        evidenceIds: ['photo-evidence-1'],
        semanticConfidence: 0.82,
      },
      {
        kind: 'missing_branch_item_type',
        label: 'Layered foreground',
        parentNodeRef: {
          scopeId: 'photography',
          nodeId: 'composition',
        },
        meaning: 'A composition choice that uses a near foreground element to create depth and frame the subject.',
        rationale: 'The branch needs a composition-specific subtype for foreground layering notes.',
        evidenceIds: ['photo-evidence-1'],
        semanticConfidence: 0.78,
      },
    ],
  };
}

function makeDefinition(
  profile: DomainProfile<string> = photographyProfile as DomainProfile<string>,
  overrides: Partial<ProfileDefinition<string>> = {},
): ProfileDefinition<string> {
  return {
    id: profile.id,
    label: profile.label,
    description: profile.description,
    version: profile.version,
    sourceKind: 'built_in',
    profile,
    createdAt: 1,
    updatedAt: 2,
    ...overrides,
  };
}

function makeNode(id: string, overrides: Partial<OntologyNode> = {}): OntologyNode {
  return {
    id,
    label: id.replace(/_/g, ' '),
    kind: 'subcategory',
    parentId: 'composition',
    meaning: `Photography meaning for ${id}.`,
    useWhen: ['testing'],
    doNotUseWhen: [],
    examples: ['example'],
    relatedNodeIds: [],
    contrastNodeIds: [],
    status: 'active',
    createdBy: 'model',
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe('second base profile forkability', () => {
  it('registry and selection compose photography with a project branch instead of coding', async () => {
    const registry = await loadDefaultProfileRegistry({
      listDefinitions: async () => [],
    });
    const summaries = registry.listProfiles().map((summary) => summary.id);
    expect(summaries).toEqual(['coding', 'photography']);

    const branch = makePhotoBranch({
      overlay: {
        id: 'night-photography-overlay',
        kind: 'project',
        addOntologyNodes: [
          makeNode('star_trails', {
            label: 'Star Trails',
            parentId: 'exposure',
          }),
        ],
        addItemTypeNodeIds: ['star_trails'],
      },
    });

    const composed = composeRuntimeDomainProfileFromSelection({
      selection: {
        baseProfileId: 'photography',
        projectBranchIds: ['night-photography'],
      },
      baseProfile: registry.getProfile('photography'),
      branches: [branch],
    });

    expect(composed.id).toBe('photography');
    expect(composed.labels.itemSingular).toBe('Photo Idea');
    expect(composed.ontology.itemTypeNodeIds).toContain('composition');
    expect(composed.ontology.itemTypeNodeIds).toContain('star_trails');
    expect(() => composeRuntimeDomainProfileFromSelection({
      selection: {
        baseProfileId: 'coding',
        projectBranchIds: ['night-photography'],
      },
      baseProfile: registry.getProfile('photography'),
      branches: [branch],
    })).toThrow(/does not match/);
  });

  it('runs checker, branch apply, target switch, and base apply against photography ids and versions', async () => {
    const proposals = new Map<string, ProfileChangeProposal>();
    const events: ProfileProposalEvent[] = [];
    let branch = makePhotoBranch();
    let definition = makeDefinition(photographyProfile as DomainProfile<string>, {
      version: 3,
      profile: {
        ...(photographyProfile as DomainProfile<string>),
        version: 3,
      },
      updatedAt: 40,
    });
    let proposalSequence = 0;
    let eventSequence = 0;

    const checkerDeps: ManualCheckerRunServiceDependencies = {
      transaction: async (callback) => callback(tx),
      getBranchById: async () => branch,
      listProposalsForTargetBranch: async () => [...proposals.values()],
      insertProposal: async (proposal) => {
        proposals.set(proposal.id, proposal);
      },
      loadUserFitFacts: async () => ({
        correctionEvidence: [makePhotoEvidence()],
        proposalEvents: [],
      }),
      loadRegistry: async () => ({
        getProfile: (id) => {
          if (id !== 'photography') throw new Error(`Unexpected profile id ${id}`);
          return photographyProfile as DomainProfile<string>;
        },
        listProfiles: () => [{
          id: 'photography',
          version: photographyProfile.version,
          label: photographyProfile.label,
          description: photographyProfile.description,
        }],
      }),
      runCheckerModel: async (invocation) => {
        expect(invocation.pack.consumer).toBe('checker');
        expect(invocation.pack.compositionStamp.baseProfileId).toBe('photography');
        expect(invocation.pack.scopeLegend.activeScopeId).toBe('night-photography');
        expect(invocation.pack.scopeLegend.scopes).toContainEqual({
          scopeId: 'photography',
          label: 'Photography',
          kind: 'baseProfile',
        });
        expect(invocation.prompt.dataPayload.ontology.nodes.map((node) => node.ref.nodeId))
          .toContain('composition');
        return checkerOutput();
      },
      newProposalId: () => `photo-checker-proposal-${++proposalSequence}`,
    };

    const checkerResult = await runManualOntologyChecker({
      baseProfileId: 'photography',
      targetBranchId: 'night-photography',
      now: 100,
      deps: checkerDeps,
    });

    expect(checkerResult.proposals).toHaveLength(2);
    expect(checkerResult.proposals.map((proposal) => proposal.baseProfileId))
      .toEqual(['photography', 'photography']);
    expect(checkerResult.proposals.map((proposal) => proposal.targetBranchUpdatedAt))
      .toEqual([20, 20]);
    expect(checkerResult.proposals[0]?.patch.addOntologyNodes?.[0]).toMatchObject({
      id: 'intentional_motion_blur',
      parentId: 'exposure',
    });
    expect(checkerResult.proposals[1]?.patch.addOntologyNodes?.[0]).toMatchObject({
      id: 'layered_foreground',
      parentId: 'composition',
    });

    const branchApplyResult = await applyPendingBranchLocalProfileChangeProposal({
      proposalId: 'photo-checker-proposal-1',
      baseProfile: photographyProfile as DomainProfile<string>,
      now: 110,
      deps: {
        transaction: async (callback) => callback(tx),
        getProposalById: async (id) => proposals.get(id),
        getBranchById: async () => branch,
        saveBranchIfUnchanged: async (nextBranch) => {
          branch = nextBranch as ProfileBranch<string>;
          return true;
        },
        saveProposalIfPending: async (proposal) => {
          proposals.set(proposal.id, proposal);
          return true;
        },
        insertEvent: async (event) => {
          events.push(event);
        },
        newEventId: () => `photo-event-${++eventSequence}`,
      },
    });

    expect(branchApplyResult.branch.parentProfileId).toBe('photography');
    expect(branchApplyResult.branch.overlay.addOntologyNodes?.map((node) => node.id))
      .toContain('intentional_motion_blur');
    expect(branchApplyResult.proposal.status).toBe('accepted');
    expect(events[0]).toMatchObject({
      action: 'applied',
      baseProfileId: 'photography',
      target: {
        kind: 'profile_branch',
        branchId: 'night-photography',
      },
    });

    const switchResult = await switchProfileChangeProposalTargetToBase({
      proposalId: 'photo-checker-proposal-2',
      now: 120,
      reason: 'Promote this photography proposal to core review.',
      deps: {
        transaction: async (callback) => callback(tx),
        getProposalById: async (id) => proposals.get(id),
        getBranchById: async () => branch,
        getProfileDefinitionById: async () => definition,
        insertProposal: async (proposal) => {
          proposals.set(proposal.id, proposal);
        },
        saveProposalIfPending: async (proposal) => {
          proposals.set(proposal.id, proposal);
          return true;
        },
        insertEvent: async (event) => {
          events.push(event);
        },
        newProposalId: () => 'photo-base-proposal-1',
        newEventId: () => `photo-event-${++eventSequence}`,
      },
    });

    expect(switchResult.proposal).toMatchObject({
      id: 'photo-base-proposal-1',
      baseProfileId: 'photography',
      target: {
        kind: 'base_profile',
        profileId: 'photography',
      },
      targetProfileVersion: 3,
      targetBranchUpdatedAt: null,
    });
    expect(switchResult.supersededProposal.status).toBe('superseded');

    const baseApplyResult = await applyPendingBaseProfileChangeProposal({
      proposalId: 'photo-base-proposal-1',
      now: 130,
      deps: {
        transaction: async (callback) => callback(tx),
        getProposalById: async (id) => proposals.get(id),
        getProfileDefinitionById: async () => definition,
        saveProfileDefinitionIfUnchanged: async (nextDefinition) => {
          definition = nextDefinition as ProfileDefinition<string>;
          return true;
        },
        saveProposalIfPending: async (proposal) => {
          proposals.set(proposal.id, proposal);
          return true;
        },
        insertEvent: async (event) => {
          events.push(event);
        },
        newEventId: () => `photo-event-${++eventSequence}`,
      },
    });

    expect(baseApplyResult.profileDefinition.id).toBe('photography');
    expect(baseApplyResult.profileDefinition.version).toBe(4);
    expect(baseApplyResult.profileDefinition.profile.id).toBe('photography');
    expect(baseApplyResult.profileDefinition.profile.version).toBe(4);
    expect(baseApplyResult.profileDefinition.profile.ontology.itemTypeNodeIds)
      .toContain('layered_foreground');
    expect(proposals.get('photo-base-proposal-1')?.status).toBe('accepted');
    expect(events.at(-1)).toMatchObject({
      action: 'applied',
      baseProfileId: 'photography',
      target: {
        kind: 'base_profile',
        profileId: 'photography',
      },
      details: {
        operationKind: 'apply_profile_patch_to_base_profile',
        profileVersionBefore: 3,
        profileVersionAfter: 4,
      },
    });
  });
});
