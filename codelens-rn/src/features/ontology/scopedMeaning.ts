import type { DomainProfile, OntologyNode } from './types';

export interface ScopedOntologyNodeReference {
  node: OntologyNode;
  scopeId: string;
  scopeLabel?: string | undefined;
}

export interface SameLabelScopedMeaningGroup {
  label: string;
  normalizedLabel: string;
  entries: readonly ScopedOntologyNodeReference[];
  nodeIds: readonly string[];
}

export function canonicalizeOntologyDisplayLabel(label: string): string {
  return label.trim().replace(/\s+/g, ' ');
}

export function normalizeOntologyDisplayLabel(label: string): string {
  return canonicalizeOntologyDisplayLabel(label).toLowerCase();
}

/**
 * Builds scoped node references for one owning scope.
 *
 * Call this once per source scope (base/core, branch, imported profile, etc.)
 * and concatenate the results. Passing an already-composed profile can preserve
 * node ids, but it cannot recover branch/core provenance that was not supplied.
 */
export function createScopedOntologyNodeReferences(
  profile: DomainProfile,
  scope: { id?: string | undefined; label?: string | undefined } = {},
): ScopedOntologyNodeReference[] {
  const scopeId = scope.id ?? profile.id;
  const scopeLabel = scope.label ?? profile.label;

  return profile.ontology.nodes.map((node) => ({
    node,
    scopeId,
    scopeLabel,
  }));
}

export function findSameLabelScopedMeanings(
  entries: readonly ScopedOntologyNodeReference[],
): SameLabelScopedMeaningGroup[] {
  const groups = new Map<
    string,
    {
      label: string;
      entries: ScopedOntologyNodeReference[];
      nodeIds: Set<string>;
    }
  >();

  const seenReferenceKeys = new Set<string>();

  for (const entry of entries) {
    const referenceKey = `${entry.scopeId}\u0000${entry.node.id}`;
    if (seenReferenceKeys.has(referenceKey)) continue;
    seenReferenceKeys.add(referenceKey);

    const label = canonicalizeOntologyDisplayLabel(entry.node.label);
    const normalizedLabel = normalizeOntologyDisplayLabel(entry.node.label);
    // Empty labels cannot participate in label-based ambiguity.
    if (!normalizedLabel) continue;

    const group = groups.get(normalizedLabel);
    if (group) {
      group.entries.push(entry);
      group.nodeIds.add(entry.node.id);
      continue;
    }

    groups.set(normalizedLabel, {
      // Display-only representative label. The first encountered casing wins.
      label,
      entries: [entry],
      nodeIds: new Set([entry.node.id]),
    });
  }

  return [...groups.entries()]
    .filter(([, group]) => group.nodeIds.size > 1)
    .map(([normalizedLabel, group]) => ({
      label: group.label,
      normalizedLabel,
      entries: [...group.entries],
      nodeIds: [...group.nodeIds],
    }));
}

export function formatScopedOntologyNodeLabel(
  entry: ScopedOntologyNodeReference,
): string {
  const scopeLabel = canonicalizeOntologyDisplayLabel(entry.scopeLabel ?? '');
  const scope = scopeLabel || entry.scopeId;
  return `${entry.node.label} (${scope})`;
}

export function formatOntologyNodeLabelForContext(
  entry: ScopedOntologyNodeReference,
  ambiguousNodeIds: ReadonlySet<string>,
): string {
  if (!ambiguousNodeIds.has(entry.node.id)) return entry.node.label;
  return formatScopedOntologyNodeLabel(entry);
}
