// Compatibility path; the implementation is owned by Kordex Core.

import type * as Core from '@kordex/core/types';
import type { LearningProfileExtension } from '@kordex/core';

export * from '@kordex/core/types';
export type DomainProfile<TItemTypeNodeId extends string = string> = Core.DomainProfile<TItemTypeNodeId, LearningProfileExtension<TItemTypeNodeId>>;
export type ActiveDomainProfileSource<TItemTypeNodeId extends string = string> = Core.ActiveDomainProfileSource<TItemTypeNodeId, LearningProfileExtension<TItemTypeNodeId>>;
export type ProfileSource<TItemTypeNodeId extends string = string> = Core.ProfileSource<TItemTypeNodeId, LearningProfileExtension<TItemTypeNodeId>>;
export type ProfileRegistry<TItemTypeNodeId extends string = string> = Core.ProfileRegistry<TItemTypeNodeId, LearningProfileExtension<TItemTypeNodeId>>;
export type ProfileDefinition<TItemTypeNodeId extends string = string> = Core.ProfileDefinition<TItemTypeNodeId, LearningProfileExtension<TItemTypeNodeId>>;
export type ActiveDomainProfileActivationInput<TItemTypeNodeId extends string = string> = Core.ActiveDomainProfileActivationInput<TItemTypeNodeId, LearningProfileExtension<TItemTypeNodeId>>;
