import type { DomainProfile, ProfileOverlay } from '../types';
import type { DomainLabels, DomainLabelOverrides, GraphProfile, GraphProfileOverrides,
  MetadataFieldDefinition, LearningProfileExtension } from './learningProfile';

function cloneMetadataField(f: MetadataFieldDefinition): MetadataFieldDefinition {
  return {
    ...f,
    appliesTo: [...f.appliesTo],
    examples: [...f.examples],
    enumOptions: f.enumOptions ? f.enumOptions.map((option) => ({ ...option })) : undefined,
  };
}

// ---------------------------------------------------------------------------
// Merge helpers
// ---------------------------------------------------------------------------

function mergeLabels(
  base: DomainLabels,
  partial: DomainLabelOverrides,
): DomainLabels {
  return {
    ...base,
    ...partial,
    flashback: {
      ...base.flashback,
      ...(partial.flashback ?? {}),
    },
  };
}

function mergeGraphProfiles<TItemTypeNodeId extends string>(
  base: GraphProfile<TItemTypeNodeId>,
  partial: GraphProfileOverrides<TItemTypeNodeId>,
): GraphProfile<TItemTypeNodeId> {
  return {
    ...base,
    ...partial,
    nodeColors: {
      ...base.nodeColors,
      ...(partial.nodeColors ?? {}),
    } as Readonly<Record<TItemTypeNodeId, string>>,
    relationshipLabels: {
      ...base.relationshipLabels,
      ...(partial.relationshipLabels ?? {}),
    },
    relationshipSectionLabels: {
      ...base.relationshipSectionLabels,
      ...(partial.relationshipSectionLabels ?? {}),
    },
    statusLabels: {
      ...base.statusLabels,
      ...(partial.statusLabels ?? {}),
    },
    tooltipLabels: {
      ...base.tooltipLabels,
      ...(partial.tooltipLabels ?? {}),
    },
    legendHelperLabels: {
      ...base.legendHelperLabels,
      ...(partial.legendHelperLabels ?? {}),
    },
    modeLabels: {
      ...base.modeLabels,
      ...(partial.modeLabels ?? {}),
    },
  };
}

function mergeMetadataFields(
  base: readonly MetadataFieldDefinition[],
  overrides: readonly MetadataFieldDefinition[],
): MetadataFieldDefinition[] {
  const overrideById = new Map<string, MetadataFieldDefinition>();
  for (const o of overrides) {
    overrideById.set(o.id, cloneMetadataField(o));
  }
  const result: MetadataFieldDefinition[] = [];
  for (const b of base) {
    const replacement = overrideById.get(b.id);
    if (replacement) {
      result.push(replacement);
      overrideById.delete(b.id);
    } else {
      result.push(cloneMetadataField(b));
    }
  }
  // Append new fields that were not in the base
  for (const [, replacement] of overrideById) {
    result.push(replacement);
  }
  return result;
}

// Inputs to pure composition are typed/validated profiles. Presence identifies
// the legacy extension; its complete shape is checked at the codec boundary.
function hasLearningExtension<T extends string>(
  profile: DomainProfile<T> & Partial<LearningProfileExtension<T>>,
): profile is DomainProfile<T, LearningProfileExtension<T>> {
  return profile.labels !== undefined && profile.metadataFields !== undefined &&
    profile.extraction !== undefined && profile.embedding !== undefined &&
    profile.retrieval !== undefined && profile.promotion !== undefined &&
    profile.review !== undefined && profile.graph !== undefined;
}

export function composeLearningProfileFields<TItemTypeNodeId extends string>(
  base: DomainProfile<TItemTypeNodeId> & Partial<LearningProfileExtension<TItemTypeNodeId>>,
  orderedOverlays: readonly ProfileOverlay<TItemTypeNodeId>[],
): Partial<Pick<LearningProfileExtension<TItemTypeNodeId>, 'labels' | 'metadataFields' | 'graph'>> {
  if (!hasLearningExtension(base)) {
    const extensionKeys = ['labels', 'metadataFields', 'extraction', 'embedding',
      'retrieval', 'promotion', 'review', 'graph'] as const;
    if (extensionKeys.some((key) => key in base)) {
      throw new Error('Incomplete learning profile extension.');
    }
    if (orderedOverlays.some((overlay) => overlay.overrideLabels !== undefined ||
      overlay.overrideMetadataFields !== undefined || overlay.overrideGraph !== undefined)) {
      throw new Error('Learning overrides require a learning profile extension.');
    }
    return {};
  }
  let composedLabels: DomainLabels = { ...base.labels };
  if (base.labels.flashback) {
    composedLabels = {
      ...composedLabels,
      flashback: { ...base.labels.flashback },
    };
  }
  let composedMetadataFields: MetadataFieldDefinition[] = base.metadataFields.map(cloneMetadataField);
  let composedGraph: GraphProfile<TItemTypeNodeId> = mergeGraphProfiles(
    base.graph,
    {},
  );

  for (const overlay of orderedOverlays) {
    if (overlay.overrideLabels) {
      composedLabels = mergeLabels(composedLabels, overlay.overrideLabels);
    }
    if (overlay.overrideMetadataFields) {
      composedMetadataFields = mergeMetadataFields(composedMetadataFields, overlay.overrideMetadataFields);
    }
    if (overlay.overrideGraph) {
      composedGraph = mergeGraphProfiles(composedGraph, overlay.overrideGraph);
    }
  }
  return { labels: composedLabels, metadataFields: composedMetadataFields, graph: composedGraph };
}
