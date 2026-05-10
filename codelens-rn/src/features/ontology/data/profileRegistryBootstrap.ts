import type { DomainProfile, ProfileDefinition, ProfileRegistry, ProfileSource } from '../types';
import { codingProfile } from '../profiles/codingProfile';
import {
  createProfileDefinitionSource,
  createProfileRegistry,
  createStaticProfileSource,
} from '../profileRegistry';
import { listProfileDefinitions } from './profileDefinitionRepo';

export const PERSISTED_PROFILE_DEFINITION_SOURCE_ID = 'persisted-profile-definitions';
export const BUILT_IN_PROFILE_SOURCE_ID = 'built-in';

export async function loadPersistedProfileDefinitionSource(
  options?: {
    listDefinitions?: () => Promise<ProfileDefinition[]>;
    sourceId?: string;
  },
): Promise<ProfileSource> {
  const listDefinitions = options?.listDefinitions ?? listProfileDefinitions;
  const definitions = await listDefinitions();
  const sourceId = options?.sourceId ?? PERSISTED_PROFILE_DEFINITION_SOURCE_ID;
  return createProfileDefinitionSource({ id: sourceId, definitions });
}

export async function loadDefaultProfileRegistry(
  options?: {
    listDefinitions?: () => Promise<ProfileDefinition[]>;
    additionalSources?: readonly ProfileSource[];
  },
): Promise<ProfileRegistry> {
  const builtInSource = createStaticProfileSource({
    id: BUILT_IN_PROFILE_SOURCE_ID,
    profiles: [codingProfile as DomainProfile<string>],
  });

  const persistedSource = await loadPersistedProfileDefinitionSource(options);

  const additionalSources = options?.additionalSources ?? [];

  return createProfileRegistry({
    sources: [builtInSource, persistedSource, ...additionalSources],
  });
}
