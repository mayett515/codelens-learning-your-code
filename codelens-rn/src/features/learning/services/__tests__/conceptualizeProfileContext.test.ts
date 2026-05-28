import { describe, expect, it, vi } from 'vitest';
import {
  codingProfile,
  createProfileRegistry,
  createStaticProfileSource,
  type DomainProfile,
  type OntologyCorrectionEvidence,
  type ProfileBranch,
  type ProfileRegistry,
} from '../../../ontology';
import type { ProjectProfileSelection } from '../../../ontology/types';
import {
  resolveConceptualizeProfileContext,
  type ResolveConceptualizeProfileContextDeps,
} from '../conceptualizeProfileContext';

vi.mock('../../../../db/client', () => ({
  db: {},
}));

const baseProfile = codingProfile as DomainProfile<string>;

function registry(): ProfileRegistry<string> {
  return createProfileRegistry<string>({
    sources: [
      createStaticProfileSource<string>({
        id: 'test-built-ins',
        profiles: [baseProfile],
      }),
    ],
  });
}

function branch(
  id: string,
  branchKind: ProfileBranch['branchKind'],
  overrideLabels: ProfileBranch['overlay']['overrideLabels'] = {},
): ProfileBranch<string> {
  return {
    id,
    parentProfileId: 'coding',
    branchKind,
    name: id,
    overlay: {
      id: `${id}-overlay`,
      kind: branchKind,
      overrideLabels,
    },
    createdAt: 1,
    updatedAt: 1,
  };
}

function depsFor(input: {
  selection?: ProjectProfileSelection | null | undefined;
  branches?: readonly ProfileBranch<string>[] | undefined;
  correctionEvidence?: readonly OntologyCorrectionEvidence[] | undefined;
}): ResolveConceptualizeProfileContextDeps {
  const branchesById = new Map((input.branches ?? []).map((b) => [b.id, b]));
  return {
    loadRegistry: async () => registry(),
    getSelectionByProjectId: async () => input.selection ?? undefined,
    getBranchesByIds: async (ids) =>
      ids.flatMap((id) => {
        const b = branchesById.get(id);
        return b ? [b] : [];
      }),
    listBranchesForParent: async (parentProfileId) =>
      (input.branches ?? []).filter((b) => b.parentProfileId === parentProfileId),
    loadUserFitFacts: async () => ({
      correctionEvidence: input.correctionEvidence ?? [],
      proposalEvents: [],
    }),
  };
}

describe('resolveConceptualizeProfileContext', () => {
  it('uses the active base profile when there is no project context', async () => {
    const context = await resolveConceptualizeProfileContext();

    expect(context.profile.id).toBe('coding');
    expect(context.selectionSnapshot).toEqual({ baseProfileId: 'coding' });
    expect(context.proposalTarget).toEqual({ kind: 'base_profile', profileId: 'coding' });
    expect(context.userFitProjection?.baseProfileId).toBe('coding');
  });

  it('resolves a project runtime profile and targets the most personal selected branch', async () => {
    const branches = [
      branch('project-branch', 'project', { hubTitle: 'Project knowledge' }),
      branch('learning-branch', 'learning', { capturePlural: 'Learned items' }),
      branch('personal-a', 'personal', { itemSingular: 'First personal item' }),
      branch('personal-b', 'personal', { itemSingular: 'Second personal item' }),
    ];

    const selection: ProjectProfileSelection = {
      id: 'selection-1',
      projectId: 'project-1',
      selection: {
        baseProfileId: 'coding',
        projectBranchIds: ['project-branch'],
        learningBranchIds: ['learning-branch'],
        personalBranchIds: ['personal-a', 'personal-b'],
      },
      createdAt: 1,
      updatedAt: 1,
    };

    const context = await resolveConceptualizeProfileContext({
      projectId: 'project-1',
      deps: depsFor({ selection, branches }),
    });

    expect(context.profile.labels.hubTitle).toBe('Project knowledge');
    expect(context.profile.labels.itemSingular).toBe('Second personal item');
    expect(context.selectionSnapshot).toEqual({
      baseProfileId: 'coding',
      projectBranchIds: ['project-branch'],
      learningBranchIds: ['learning-branch'],
      personalBranchIds: ['personal-a', 'personal-b'],
    });
    expect(context.proposalTarget).toEqual({
      kind: 'profile_branch',
      branchId: 'personal-b',
    });
  });

  it('targets the base profile when a project has no selected branches', async () => {
    const selection: ProjectProfileSelection = {
      id: 'selection-1',
      projectId: 'project-1',
      selection: { baseProfileId: 'coding' },
      createdAt: 1,
      updatedAt: 1,
    };

    const context = await resolveConceptualizeProfileContext({
      projectId: 'project-1',
      deps: depsFor({ selection }),
    });

    expect(context.profile).toBe(baseProfile);
    expect(context.selectionSnapshot).toEqual({ baseProfileId: 'coding' });
    expect(context.proposalTarget).toEqual({ kind: 'base_profile', profileId: 'coding' });
  });

  it('projects bounded correction history into advisory user-fit context', async () => {
    const selection: ProjectProfileSelection = {
      id: 'selection-1',
      projectId: 'project-1',
      selection: { baseProfileId: 'coding' },
      createdAt: 1,
      updatedAt: 1,
    };

    const context = await resolveConceptualizeProfileContext({
      projectId: 'project-1',
      deps: depsFor({
        selection,
        correctionEvidence: [
          {
            id: 'evidence-1',
            profileId: 'coding',
            activeSelectionSnapshot: { baseProfileId: 'coding' },
            subjectKind: 'capture',
            subjectId: 'capture-1',
            field: 'typeNodeId',
            previousTypeNodeId: 'pitfall',
            correctedTypeNodeId: 'mechanism',
            reason: 'The note was about runtime behavior.',
            source: 'user',
            createdAt: 10,
          },
        ],
      }),
    });

    expect(context.userFitProjection?.nodeSignals.map((signal) => signal.nodeId))
      .toEqual(['mechanism', 'pitfall']);
  });

  it('falls back to empty advisory user-fit when history loading fails', async () => {
    const selection: ProjectProfileSelection = {
      id: 'selection-1',
      projectId: 'project-1',
      selection: { baseProfileId: 'coding' },
      createdAt: 1,
      updatedAt: 1,
    };
    const context = await resolveConceptualizeProfileContext({
      projectId: 'project-1',
      deps: {
        ...depsFor({ selection }),
        loadUserFitFacts: async () => {
          throw new Error('history unavailable');
        },
      },
    });

    expect(context.profile).toBe(baseProfile);
    expect(context.userFitProjection).toEqual({
      baseProfileId: 'coding',
      nodeSignals: [],
      proposalSignals: [],
      summary: {
        correctionEvidenceCount: 0,
        proposalEventCount: 0,
        missingConceptCorrectionCount: 0,
        nearMissHitCount: 0,
        omittedNodeSignalCount: 0,
        omittedProposalSignalCount: 0,
      },
    });
  });
});
