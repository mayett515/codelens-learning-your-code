// App compatibility: keep the full learning extension when callers explicitly
// provide only the item-type parameter. Registry policy remains in the core.
import * as core from '@kordex/core/profileRegistry';
import type { LearningProfileExtension } from '@kordex/core';
import type { DomainProfile, ProfileDefinition, ProfileSource } from './types';

export { DuplicateProfileIdError, ProfileNotFoundError, toDomainProfileSummary } from '@kordex/core/profileRegistry';

export function createStaticProfileSource<T extends string = string>(input: {
  id: string;
  profiles: readonly DomainProfile<T>[];
}) {
  return core.createStaticProfileSource<T, LearningProfileExtension<T>>(input);
}

export function createProfileDefinitionSource<T extends string = string>(input: {
  id: string;
  definitions: readonly ProfileDefinition<T>[];
}) {
  return core.createProfileDefinitionSource<T, LearningProfileExtension<T>>(input);
}

export function createProfileRegistry<T extends string = string>(input: {
  sources: readonly ProfileSource<T>[];
}) {
  return core.createProfileRegistry<T, LearningProfileExtension<T>>(input);
}
