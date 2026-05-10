import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RUNTIME_PROFILE_BASE_PROFILE_ID,
  RuntimeProfileActivationError,
  resolveRuntimeProfileForProject,
} from '../runtimeProfileActivation';
import {
  DEFAULT_RUNTIME_PROFILE_BASE_PROFILE_ID as BARREL_DEFAULT_RUNTIME_PROFILE_BASE_PROFILE_ID,
  RuntimeProfileActivationError as BarrelRuntimeProfileActivationError,
  resolveRuntimeProfileForProject as barrelResolveRuntimeProfileForProject,
} from '../index';
import {
  composeRuntimeDomainProfileFromSelection,
} from '../profileSelection';
import { createProfileRegistry, createStaticProfileSource } from '../profileRegistry';
import { createStaticProfileBranchStore } from '../profileBranchStore';
import { codingProfile } from '../profiles/codingProfile';
import type {
  DomainProfile,
  OntologyNode,
  ProfileBranch,
  ProfileOverlay,
  ProfileSelection,
  ProjectProfileSelection,
} from '../types';
import type { ProjectProfileSelectionStore } from '../runtimeProfileActivation';

function makeTestNode(id: string, label?: string): OntologyNode {
  return {
    id,
    label: label ?? id,
    kind: 'category',
    parentId: null,
    meaning: 'meaning of ' + id,
    useWhen: ['testing'],
    doNotUseWhen: [],
    examples: ['example'],
    relatedNodeIds: [],
    contrastNodeIds: [],
    status: 'active',
    createdBy: 'user',
    createdAt: 0,
    updatedAt: 0,
  };
}

function makeNonDefaultBaseProfile(): DomainProfile<string> {
  return {
    id: "test-base",
    version: 1,
    label: "Test Base",
    description: "A non-default base profile for testing.",
    labels: {
      ...codingProfile.labels,
      hubTitle: "Original Base Hub",
    },
    ontology: {
      nodes: [makeTestNode("base_node")],
      itemTypeNodeIds: ["base_node"],
      relationshipTypeNodeIds: [],
    },
    metadataFields: [],
    extraction: {
      assistantRole: "Test assistant",
      captureInstructions: "Test capture",
      classificationInstructions: "Test classification",
    },
    embedding: {
      captureTextFields: ["body"],
      itemTextFields: ["body"],
    },
    retrieval: {
      defaultHeader: "Test Header",
      captureLabel: "Capture",
      itemLabel: "Item",
      summaryLabel: "Summary",
      languageOrRuntimeLabel: "Language",
      sourceLabel: "Source",
    },
    promotion: {
      defaultTypeNodeId: "base_node",
      contextOnlyKeywords: [],
    },
    review: codingProfile.review,
    graph: {
      ...codingProfile.graph,
      screenTitle: "Test Graph",
    },
  };
}

function makeProfileBranch<TItemTypeNodeId extends string = string>(
  id: string,
  branchKind: ProfileBranch<TItemTypeNodeId>['branchKind'],
  overlay: Partial<ProfileOverlay<TItemTypeNodeId>> = {},
  overrides?: Partial<ProfileBranch<TItemTypeNodeId>>,
): ProfileBranch<TItemTypeNodeId> {
  const now = 1_700_000_000_000;
  return {
    id,
    parentProfileId: 'parent-profile',
    branchKind,
    name: id,
    overlay: {
      id: 'overlay-' + id,
      kind: branchKind,
      ...overlay,
    },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeSelectionStore(
  rowsByProject: ReadonlyMap<string, ProjectProfileSelection | null>,
): ProjectProfileSelectionStore {
  return {
    async getProjectProfileSelectionByProjectId(projectId: string) {
      return rowsByProject.get(projectId) ?? null;
    },
  };
}

function makeRegistry<TItemTypeNodeId extends string = string>(
  profiles: ReadonlyArray<DomainProfile<TItemTypeNodeId>>,
) {
  return createProfileRegistry<TItemTypeNodeId>({
    sources: [createStaticProfileSource<TItemTypeNodeId>({ id: 'test-src', profiles })],
  });
}

function makeBranchStore<TItemTypeNodeId extends string = string>(
  branches: ReadonlyArray<ProfileBranch<TItemTypeNodeId>>,
) {
  return createStaticProfileBranchStore<TItemTypeNodeId>({ branches });
}

describe("resolveRuntimeProfileForProject", () => {

  describe("no selection row fallback", () => {
    it("falls back to coding base and returns base profile by reference", async () => {
      const registry = makeRegistry([codingProfile as DomainProfile<string>]);
      const store = makeSelectionStore(new Map());
      const branchStore = makeBranchStore([]);
      const result = await resolveRuntimeProfileForProject({
        projectId: "proj-1",
        selectionStore: store,
        profileRegistry: registry,
        branchStore,
      });
      expect(result.selection.baseProfileId).toBe("coding");
      expect(result.profile).toBe(codingProfile);
      expect(result.baseProfile).toBe(codingProfile);
      expect(result.branches).toEqual([]);
    });
  });

  describe("custom defaultBaseProfileId", () => {
    it("uses custom default when no selection exists", async () => {
      const customBase = makeNonDefaultBaseProfile();
      const registry = makeRegistry([customBase]);
      const store = makeSelectionStore(new Map());
      const branchStore = makeBranchStore([]);
      const result = await resolveRuntimeProfileForProject({
        projectId: "proj-2",
        selectionStore: store,
        profileRegistry: registry,
        branchStore,
        defaultBaseProfileId: "test-base",
      });
      expect(result.selection.baseProfileId).toBe("test-base");
      expect(result.profile).toBe(customBase);
      expect(result.baseProfile).toBe(customBase);
    });
  });

  describe("persisted selection", () => {
    it("loads base and selected project/learning/personal branches", async () => {
      const base = makeNonDefaultBaseProfile();
      const projBranch = makeProfileBranch("p1", "project", {
        overrideLabels: { hubTitle: "Proj Hub" },
      });
      const learnBranch = makeProfileBranch("l1", "learning", {
        overrideLabels: { itemSingular: "Idea" },
      });
      const perBranch = makeProfileBranch("pr1", "personal", {
        overrideLabels: { hubTitle: "Per Hub" },
      });
      const selection = {
        baseProfileId: base.id,
        projectBranchIds: ["p1"],
        learningBranchIds: ["l1"],
        personalBranchIds: ["pr1"],
      };
      const row = {
        id: "sel-1",
        projectId: "proj-3",
        selection,
        createdAt: 1_000_000,
        updatedAt: 1_000_000,
      };
      const registry = makeRegistry([base]);
      const store = makeSelectionStore(new Map([["proj-3", row]]));
      const branchStore = makeBranchStore([projBranch, learnBranch, perBranch]);
      const result = await resolveRuntimeProfileForProject({
        projectId: "proj-3",
        selectionStore: store,
        profileRegistry: registry,
        branchStore,
      });
      expect(result.selection).toBe(selection);
      expect(result.baseProfile).toBe(base);
      expect(result.branches).toHaveLength(3);
      expect(result.branches.map(b => b.id)).toEqual(["p1", "l1", "pr1"]);
      expect(result.profile.labels.hubTitle).toBe("Per Hub");
      expect(result.profile.labels.itemSingular).toBe("Idea");
    });
  });

  describe("branch order and composition precedence", () => {
    it("preserves requested branch order and personal wins over learning over project", async () => {
      const base = makeNonDefaultBaseProfile();
      const pBranch = makeProfileBranch("pb", "project", {
        overrideLabels: { hubTitle: "Proj" },
      });
      const lBranch = makeProfileBranch("lb", "learning", {
        overrideLabels: { hubTitle: "Learn" },
      });
      const perBranch = makeProfileBranch("pb2", "personal", {
        overrideLabels: { hubTitle: "Per" },
      });
      const row = {
        id: "sel-2",
        projectId: "proj-4",
        selection: {
          baseProfileId: base.id,
          projectBranchIds: ["pb"],
          learningBranchIds: ["lb"],
          personalBranchIds: ["pb2"],
        },
        createdAt: 1_000_000,
        updatedAt: 1_000_000,
      };
      const registry = makeRegistry([base]);
      const store = makeSelectionStore(new Map([["proj-4", row]]));
      // Branches passed in different order than selection
      const branchStore = makeBranchStore([perBranch, pBranch, lBranch]);
      const result = await resolveRuntimeProfileForProject({
        projectId: "proj-4",
        selectionStore: store,
        profileRegistry: registry,
        branchStore,
      });
      // Branch order follows selection order, not branch store order
      expect(result.branches.map(b => b.id)).toEqual(["pb", "lb", "pb2"]);
      // Personal wins in composition
      expect(result.profile.labels.hubTitle).toBe("Per");
    });
  });

  describe("missing base profile", () => {
    it("throws RuntimeProfileActivationError with missing-base code", async () => {
      const registry = makeRegistry([]);
      const store = makeSelectionStore(new Map());
      const branchStore = makeBranchStore([]);
      let caught: unknown;
      try {
        await resolveRuntimeProfileForProject({
          projectId: "proj-5",
          selectionStore: store,
          profileRegistry: registry,
          branchStore,
        });
      } catch (e) { caught = e; }
      expect(caught as RuntimeProfileActivationError).toBeDefined();
      expect((caught as RuntimeProfileActivationError).code).toBe('missing-base-profile');
      expect((caught as RuntimeProfileActivationError).projectId).toBe('proj-5');
      expect((caught as RuntimeProfileActivationError).message).toContain('coding');
    });
  });

  describe("missing branch id", () => {
    it("throws with missing-branch code and branchId", async () => {
      const base = makeNonDefaultBaseProfile();
      const row = {
        id: "sel-6",
        projectId: "proj-6",
        selection: {
          baseProfileId: base.id,
          projectBranchIds: ["nonexistent-branch"],
        },
        createdAt: 1_000_000,
        updatedAt: 1_000_000,
      };
      const registry = makeRegistry([base]);
      const store = makeSelectionStore(new Map([["proj-6", row]]));
      const branchStore = makeBranchStore([]);
      let caught: unknown;
      try {
        await resolveRuntimeProfileForProject({
          projectId: "proj-6",
          selectionStore: store,
          profileRegistry: registry,
          branchStore,
        });
      } catch (e) { caught = e; }
      expect(caught as RuntimeProfileActivationError).toBeDefined();
      expect((caught as RuntimeProfileActivationError).code).toBe('missing-branch-id');
      expect((caught as RuntimeProfileActivationError).projectId).toBe('proj-6');
      expect((caught as RuntimeProfileActivationError).branchId).toBe('nonexistent-branch');
    });
  });

  describe("wrong-kind branch id", () => {
    it("throws with wrong-kind code, branchId, expected and actual kind", async () => {
      const base = makeNonDefaultBaseProfile();
      const projBranch = makeProfileBranch("proj-x", "project", {
        overrideLabels: { hubTitle: "Wrong Kind" },
      });
      const row = {
        id: "sel-7",
        projectId: "proj-7",
        selection: {
          baseProfileId: base.id,
          learningBranchIds: ["proj-x"],
        },
        createdAt: 1_000_000,
        updatedAt: 1_000_000,
      };
      const registry = makeRegistry([base]);
      const store = makeSelectionStore(new Map([["proj-7", row]]));
      const branchStore = makeBranchStore([projBranch]);
      let caught: unknown;
      try {
        await resolveRuntimeProfileForProject({
          projectId: "proj-7",
          selectionStore: store,
          profileRegistry: registry,
          branchStore,
        });
      } catch (e) { caught = e; }
      expect(caught as RuntimeProfileActivationError).toBeDefined();
      expect((caught as RuntimeProfileActivationError).code).toBe('wrong-kind-branch-id');
      expect((caught as RuntimeProfileActivationError).projectId).toBe('proj-7');
      expect((caught as RuntimeProfileActivationError).branchId).toBe('proj-x');
      expect((caught as RuntimeProfileActivationError).expectedKind).toBe('learning');
      expect((caught as RuntimeProfileActivationError).actualKind).toBe('project');
    });
  });

  describe("immutability", () => {
    it("does not mutate frozen inputs", async () => {
      const base = Object.freeze(makeNonDefaultBaseProfile());
      const projBranch = Object.freeze(makeProfileBranch("fb", "project", {
        overrideLabels: { hubTitle: "Frozen Hub" },
      }));
      const selection = {
        baseProfileId: base.id,
        projectBranchIds: Object.freeze(["fb"]),
      };
      const frozenRow = Object.freeze({
        id: "sel-8",
        projectId: "proj-8",
        selection,
        createdAt: 1_000_000,
        updatedAt: 1_000_000,
      });
      const registry = makeRegistry([base]);
      const store = makeSelectionStore(new Map([["proj-8", frozenRow]]));
      const branchStore = makeBranchStore([projBranch]);
      const result = await resolveRuntimeProfileForProject({
        projectId: "proj-8",
        selectionStore: store,
        profileRegistry: registry,
        branchStore,
      });
      expect(result.profile.labels.hubTitle).toBe("Frozen Hub");
      expect(result.profile).not.toBe(base);
      expect(result.baseProfile).toBe(base);
      expect(result.branches[0]).toBe(projBranch);
    });
  });

});

describe("runtimeProfileActivation source/test boundary", () => {
  it("keeps activation source domain-only", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "..", "runtimeProfileActivation.ts"),
      "utf8",
    );
    const terms = [
      "Async" + "Storage",
      "sqli" + "te",
      "driz" + "zle",
      "sche" + "ma",
      "d" + "b",
      "migra" + "tion",
      "zust" + "and",
      "create" + "Store",
      "setActive" + "Branch",
      "useActive" + "Branch",
      "profile_" + "branches",
      "profile_" + "overlays",
      "automatic" + "Merge",
      "auto" + "Merge",
      "apply" + "Merge",
      "M" + "CP",
      "ag" + "ent",
      "app-" + "builder",
      "Rac" + "ket",
      "D" + "SL",
      "getActive" + "Profile",
      "setActive" + "Profile",
      "useRuntime" + "Profile",
      "getActive" + "Runtime",
      "setActive" + "Runtime",
    ];
    for (const term of terms) {
      expect(source).not.toContain(term);
    }
  });

  it("keeps activation test domain-only", () => {
    const testSource = fs.readFileSync(
      path.resolve(__dirname, "runtimeProfileActivation.test.ts"),
      "utf8",
    );
    const terms = [
      "Async" + "Storage",
      "sqli" + "te",
      "driz" + "zle",
      "sche" + "ma",
      "zust" + "and",
      "create" + "Store",
      "M" + "CP",
      "ag" + "ent",
      "app-" + "builder",
      "Rac" + "ket",
      "D" + "SL",
    ];
    for (const term of terms) {
      expect(testSource).not.toContain(term);
    }
  });
});

describe("ontology barrel exports for runtime activation", () => {
  it("exports the new public helper and constant", () => {
    expect(typeof barrelResolveRuntimeProfileForProject).toBe("function");
    expect(typeof BarrelRuntimeProfileActivationError).toBe("function");
    expect(typeof BARREL_DEFAULT_RUNTIME_PROFILE_BASE_PROFILE_ID).toBe("string");
    expect(BARREL_DEFAULT_RUNTIME_PROFILE_BASE_PROFILE_ID).toBe("coding");
  });

  it("root barrel does not import DB-backed data repos", () => {
    const barrelSource = fs.readFileSync(
      path.resolve(__dirname, "..", "index.ts"),
      "utf8",
    );
    expect(barrelSource).not.toContain("from " + String.fromCharCode(39) + "../../../db" + String.fromCharCode(39));
    expect(barrelSource).not.toContain("from " + String.fromCharCode(39) + "./data/" + String.fromCharCode(39));
    expect(barrelSource).not.toContain("from " + String.fromCharCode(39) + "../data/" + String.fromCharCode(39));
  });
});
