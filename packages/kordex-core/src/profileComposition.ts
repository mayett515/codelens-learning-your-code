import type {
  BoundaryRule,
  DomainLabelOverrides,
  DomainLabels,
  DomainProfile,
  GraphProfile,
  GraphProfileOverrides,
  MetadataFieldDefinition,
  OntologyNode,
  OntologyProfile,
  ProfileOverlay,
  ProfileOverlayKind,
} from './types';

export type { ProfileOverlayKind, ProfileOverlay };

// ---------------------------------------------------------------------------
// Deep-clone helpers (shallow where sufficient, deep only for nested arrays)
// ---------------------------------------------------------------------------

function cloneOntologyNode(node: OntologyNode): OntologyNode {
  return {
    ...node,
    doNotUseWhen: node.doNotUseWhen.map(cloneBoundaryRule),
    useWhen: [...node.useWhen],
    examples: [...node.examples],
    relatedNodeIds: [...node.relatedNodeIds],
    contrastNodeIds: [...node.contrastNodeIds],
  };
}

function cloneBoundaryRule(rule: BoundaryRule): BoundaryRule {
  return {
    ...rule,
    evidenceIds: [...rule.evidenceIds],
  };
}

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

function dedupStrings(arr: readonly string[]): string[] {
  return [...new Set(arr)];
}

// ---------------------------------------------------------------------------
// Composition precedence
// ---------------------------------------------------------------------------
//
// base first
// project/learning overlays next in provided order
// personal overlays last
// later overlays of the same priority win deterministically
//
// ---------------------------------------------------------------------------

/**
 * Compose a runtime `DomainProfile` from a base profile plus ordered overlays.
 *
 * Does **not** mutate the base profile or any overlay input.
 *
 * Precedence:
 * 1. Base profile (lowest priority)
 * 2. Project/learning overlays in the order provided
 * 3. Personal overlays last, also in the order provided
 */
export function composeDomainProfile<TItemTypeNodeId extends string = string>(
  base: DomainProfile<TItemTypeNodeId>,
  overlays: readonly ProfileOverlay<TItemTypeNodeId>[],
): DomainProfile<TItemTypeNodeId> {
  // Deep-clone base ontology nodes
  const composedNodes: OntologyNode[] = base.ontology.nodes.map(cloneOntologyNode);
  const nodeIndex = new Map<string, number>();
  for (let i = 0; i < composedNodes.length; i++) {
    nodeIndex.set(composedNodes[i].id, i);
  }

  let composedItemTypeNodeIds: TItemTypeNodeId[] = [...base.ontology.itemTypeNodeIds];
  let composedRelTypeNodeIds: string[] = [...base.ontology.relationshipTypeNodeIds];
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

  for (const overlay of orderOverlaysForComposition(overlays)) {
    // Add new ontology nodes
    if (overlay.addOntologyNodes) {
      for (const node of overlay.addOntologyNodes) {
        if (!nodeIndex.has(node.id)) {
          const cloned = cloneOntologyNode(node);
          nodeIndex.set(cloned.id, composedNodes.length);
          composedNodes.push(cloned);
        }
      }
    }

    // Override existing ontology nodes by id (full replacement)
    if (overlay.overrideOntologyNodes) {
      for (const node of overlay.overrideOntologyNodes) {
        const idx = nodeIndex.get(node.id);
        if (idx !== undefined) {
          composedNodes[idx] = cloneOntologyNode(node);
        } else {
          // If the node doesn't exist in the composed profile yet, add it
          const cloned = cloneOntologyNode(node);
          nodeIndex.set(cloned.id, composedNodes.length);
          composedNodes.push(cloned);
        }
      }
    }

    // Add item type node ids
    if (overlay.addItemTypeNodeIds) {
      composedItemTypeNodeIds = dedupStrings([
        ...composedItemTypeNodeIds,
        ...(overlay.addItemTypeNodeIds as readonly string[]),
      ]) as TItemTypeNodeId[];
    }

    // Add relationship type node ids (merge + dedup)
    if (overlay.addRelationshipTypeNodeIds) {
      composedRelTypeNodeIds = dedupStrings([
        ...composedRelTypeNodeIds,
        ...overlay.addRelationshipTypeNodeIds,
      ]);
    }

    // Override labels partially
    if (overlay.overrideLabels) {
      composedLabels = mergeLabels(composedLabels, overlay.overrideLabels);
    }

    // Override metadata fields by id
    if (overlay.overrideMetadataFields) {
      composedMetadataFields = mergeMetadataFields(composedMetadataFields, overlay.overrideMetadataFields);
    }

    // Override graph partially
    if (overlay.overrideGraph) {
      composedGraph = mergeGraphProfiles(composedGraph, overlay.overrideGraph);
    }

    // Override ontology partially (currently only supports adding/overriding nodes
    // that were not handled above, but this allows future extension)
    if (overlay.overrideOntology) {
      if (overlay.overrideOntology.nodes) {
        // Additional ontology nodes from overrideOntology (treated as additions)
        for (const node of overlay.overrideOntology.nodes) {
          if (!nodeIndex.has(node.id)) {
            const cloned = cloneOntologyNode(node);
            nodeIndex.set(cloned.id, composedNodes.length);
            composedNodes.push(cloned);
          }
        }
      }
      if (overlay.overrideOntology.itemTypeNodeIds) {
        composedItemTypeNodeIds = dedupStrings([
          ...composedItemTypeNodeIds,
          ...(overlay.overrideOntology.itemTypeNodeIds as readonly string[]),
        ]) as TItemTypeNodeId[];
      }
      if (overlay.overrideOntology.relationshipTypeNodeIds) {
        composedRelTypeNodeIds = dedupStrings([
          ...composedRelTypeNodeIds,
          ...overlay.overrideOntology.relationshipTypeNodeIds,
        ]);
      }
    }
  }

  const composedOntology: OntologyProfile<TItemTypeNodeId> = {
    nodes: composedNodes,
    itemTypeNodeIds: composedItemTypeNodeIds,
    relationshipTypeNodeIds: composedRelTypeNodeIds,
  };

  return {
    ...base,
    labels: composedLabels,
    ontology: composedOntology,
    metadataFields: composedMetadataFields,
    graph: composedGraph,
  };
}

function orderOverlaysForComposition<TItemTypeNodeId extends string>(
  overlays: readonly ProfileOverlay<TItemTypeNodeId>[],
): ProfileOverlay<TItemTypeNodeId>[] {
  return overlays
    .map((overlay, index) => ({ overlay, index }))
    .sort((a, b) => {
      const priorityDelta = overlayPriority(a.overlay.kind) - overlayPriority(b.overlay.kind);
      return priorityDelta === 0 ? a.index - b.index : priorityDelta;
    })
    .map((entry) => entry.overlay);
}

function overlayPriority(kind: ProfileOverlayKind): number {
  return kind === 'personal' ? 1 : 0;
}
