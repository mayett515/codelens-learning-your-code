import type {
  DomainProfile,
  DomainProfileSummary,
  ProfileDefinition,
  ProfileRegistry,
  ProfileSource,
} from './types';

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class DuplicateProfileIdError extends Error {
  readonly code = 'DUPLICATE_PROFILE_ID';
  readonly profileId: string;
  readonly sourceIds: readonly string[];

  constructor(profileId: string, sourceIds: readonly string[]) {
    super(
      'Duplicate profile id "' +
        profileId +
        '" found in sources: ' +
        sourceIds.join(', '),
    );
    this.name = 'DuplicateProfileIdError';
    this.profileId = profileId;
    this.sourceIds = [...sourceIds];
  }
}

export class ProfileNotFoundError extends Error {
  readonly code = 'PROFILE_NOT_FOUND';
  readonly profileId: string;

  constructor(profileId: string) {
    super('Profile "' + profileId + '" not found.');
    this.name = 'ProfileNotFoundError';
    this.profileId = profileId;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function toDomainProfileSummary<TItemTypeNodeId extends string = string>(
  profile: DomainProfile<TItemTypeNodeId>,
): DomainProfileSummary {
  return {
    id: profile.id,
    version: profile.version,
    label: profile.label,
    description: profile.description,
  };
}

export function createStaticProfileSource<TItemTypeNodeId extends string = string>(input: {
  id: string;
  profiles: readonly DomainProfile<TItemTypeNodeId>[];
}): ProfileSource<TItemTypeNodeId> {
  // Check for duplicates within this source.
  const seen = new Map<string, string>();
  for (const profile of input.profiles) {
    const existing = seen.get(profile.id);
    if (existing !== undefined) {
      throw new DuplicateProfileIdError(profile.id, [input.id]);
    }
    seen.set(profile.id, profile.id);
  }

  const id = input.id;
  const profiles = [...input.profiles];

  return {
    id,
    getProfile(idToFind) {
      for (const profile of profiles) {
        if (profile.id === idToFind) {
          return profile;
        }
      }
      return null;
    },
    listProfiles() {
      return profiles.map((p) => toDomainProfileSummary(p));
    },
  };
}

export function createProfileDefinitionSource<TItemTypeNodeId extends string = string>(input: {
  id: string;
  definitions: readonly ProfileDefinition<TItemTypeNodeId>[];
}): ProfileSource<TItemTypeNodeId> {
  // Check for duplicates within this source.
  const seen = new Map<string, string>();
  for (const def of input.definitions) {
    const existing = seen.get(def.id);
    if (existing !== undefined) {
      throw new DuplicateProfileIdError(def.id, [input.id]);
    }
    seen.set(def.id, def.id);
  }

  const id = input.id;
  const definitions = [...input.definitions];
  const profilesById = new Map<string, DomainProfile<TItemTypeNodeId>>();
  for (const def of definitions) {
    profilesById.set(def.id, def.profile);
  }

  return {
    id,
    getProfile(idToFind) {
      return profilesById.get(idToFind) ?? null;
    },
    listProfiles() {
      return definitions.map((def) => ({
        id: def.id,
        version: def.version,
        label: def.label,
        description: def.description,
      }));
    },
  };
}

export function createProfileRegistry<TItemTypeNodeId extends string = string>(input: {
  sources: readonly ProfileSource<TItemTypeNodeId>[];
}): ProfileRegistry<TItemTypeNodeId> {
  const sources = [...input.sources];

  // Detect duplicate profile ids across all sources.
  const profileIdToSources = new Map<string, string[]>();

  for (const source of sources) {
    const summaries = source.listProfiles();
    for (const summary of summaries) {
      const existing = profileIdToSources.get(summary.id);
      if (existing === undefined) {
        profileIdToSources.set(summary.id, [source.id]);
      } else {
        existing.push(source.id);
      }
    }
  }

  for (const [profileId, sourceIds] of profileIdToSources) {
    if (sourceIds.length > 1) {
      throw new DuplicateProfileIdError(profileId, [...sourceIds]);
    }
  }

  return {
    getProfile(idToFind) {
      for (const source of sources) {
        const profile = source.getProfile(idToFind);
        if (profile !== null) {
          return profile;
        }
      }
      throw new ProfileNotFoundError(idToFind);
    },
    listProfiles() {
      const result: DomainProfileSummary[] = [];
      for (const source of sources) {
        const summaries = source.listProfiles();
        for (const summary of summaries) {
          result.push(summary);
        }
      }
      return result;
    },
  };
}
