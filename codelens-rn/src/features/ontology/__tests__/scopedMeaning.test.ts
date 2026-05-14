import { describe, expect, it } from 'vitest';
import {
  createScopedOntologyNodeReferences,
  findSameLabelScopedMeanings,
  formatOntologyNodeLabelForContext,
  formatScopedOntologyNodeLabel,
  normalizeOntologyDisplayLabel,
} from '../scopedMeaning';
import type { DomainProfile, OntologyNode } from '../types';

function node(id: string, label: string, overrides: Partial<OntologyNode> = {}): OntologyNode {
  return {
    id,
    label,
    kind: 'category',
    parentId: null,
    meaning: `Meaning for ${id}`,
    useWhen: ['when relevant'],
    doNotUseWhen: [],
    examples: ['example'],
    relatedNodeIds: [],
    contrastNodeIds: [],
    status: 'active',
    createdBy: 'system',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function profile(id: string, label: string, nodes: readonly OntologyNode[]): DomainProfile {
  return {
    id,
    version: 1,
    label,
    description: `${label} profile`,
    labels: {
      hubTitle: 'Hub',
      captureSingular: 'Capture',
      capturePlural: 'Captures',
      itemSingular: 'Item',
      itemPlural: 'Items',
      saveAction: 'Conceptualize',
      reviewModeTitle: 'Review',
      strengthLabel: 'Strength',
      bodyFieldLabel: 'Body',
      contextFieldLabel: 'Context',
      sourceFieldLabel: 'Source',
      originSectionTitle: 'Origin',
      relationshipSectionTitle: 'Relationships',
      reviewEntryText: 'Review',
      conceptListTitle: 'Items',
      conceptListSortLabel: 'Sort',
      conceptListEmptyLabel: 'Empty',
      flashback: {
        bannerPrefix: 'Past - ',
        fallbackTitle: 'Past',
        noMetadataLabel: 'None',
        savedSectionTitle: 'Saved',
        emptyLabel: 'Empty',
        unknownDateLabel: 'Unknown',
        conceptCountTemplate: '{count} {itemLabel}',
        conceptCountSingularLabel: 'item',
        conceptCountPluralLabel: 'items',
        captureCountTemplate: '{count} {captureLabel}',
        captureCountSingularLabel: 'capture',
        captureCountPluralLabel: 'captures',
      },
    },
    ontology: {
      nodes,
      itemTypeNodeIds: [],
      relationshipTypeNodeIds: [],
    },
    metadataFields: [],
    extraction: {
      assistantRole: 'Assistant',
      captureInstructions: 'Capture',
      classificationInstructions: 'Classify',
    },
    embedding: {
      captureTextFields: [],
      itemTextFields: [],
    },
    retrieval: {
      defaultHeader: 'Header',
      captureLabel: 'Capture',
      itemLabel: 'Item',
      summaryLabel: 'Summary',
      languageOrRuntimeLabel: 'Language',
      sourceLabel: 'Source',
    },
    promotion: {
      defaultTypeNodeId: 'default',
      contextOnlyKeywords: [],
    },
    review: {
      enabledLabel: 'Review',
      weakItemLabel: 'Weak',
      thresholdSubtitle: 'Threshold',
      thresholdCloseLabel: 'Close',
      thresholdEmptyLabel: 'Empty',
      reflectPromptTemplate: 'Reflect',
      reflectSubmitLabel: 'Submit',
      reflectErrorLabel: 'Error',
      reflectPlaceholder: 'Placeholder',
      resultSavedLabel: 'Saved',
      resultDoneLabel: 'Done',
      resultContinueInChatLabel: 'Chat',
      resultOpenItemLabel: 'Open',
      ratePromptTitle: 'Rate',
      rateStrongLabel: 'Strong',
      ratePartialLabel: 'Partial',
      rateWeakLabel: 'Weak',
      rateSkipLabel: 'Skip',
      revealHideLabel: 'Hide',
      revealShowLabel: 'Show',
    },
    graph: {
      nodeColors: {},
      relationshipLabels: {},
      relationshipSectionLabels: {},
      screenTitle: 'Graph',
      focusedScreenTitle: 'Graph',
      focusedViewLabel: 'Focused',
      fullViewLabel: 'Full',
      emptyLabel: 'Empty',
      modeLabels: {},
      statusLabels: {
        loading: 'Loading',
        unavailable: 'Unavailable',
        retryAction: 'Retry',
        emptyBody: 'Empty',
        capBannerTemplate: 'Cap',
      },
      tooltipLabels: {
        neverAccessed: 'Never',
        lastAccessedTemplate: 'Last {date}',
        scoreTemplate: 'Score',
        strengthTemplate: 'Strength',
        viewDetailAction: 'View',
        dayAgoTemplate: '{count} {dayLabel}',
        daySingularLabel: 'day',
        dayPluralLabel: 'days',
      },
      legendHelperLabels: {
        title: 'Legend',
        recencyRecent: 'Recent',
        recencyModerate: 'Moderate',
        recencyOld: 'Old',
        recencyStale: 'Stale',
        strengthGradient: 'Gradient',
        strengthSize: 'Size',
      },
    },
  };
}

describe('scoped ontology meaning helpers', () => {
  it('normalizes display labels without making them durable identity', () => {
    expect(normalizeOntologyDisplayLabel('  Category   Label  ')).toBe('category label');
  });

  it('builds scoped node references from a profile without mutating nodes', () => {
    const category = node('category', 'Category');
    const input = profile('photography', 'Photography Core', [category]);

    const refs = createScopedOntologyNodeReferences(input);

    expect(refs).toEqual([
      {
        node: category,
        scopeId: 'photography',
        scopeLabel: 'Photography Core',
      },
    ]);
    expect(refs[0].node).toBe(category);
  });

  it('uses explicit scope overrides when caller provides source provenance', () => {
    const category = node('category', 'Category');
    const input = profile('photography-runtime', 'Composed Photography', [category]);

    const refs = createScopedOntologyNodeReferences(input, {
      id: 'night-photography',
      label: 'Night Photography branch',
    });

    expect(refs).toEqual([
      {
        node: category,
        scopeId: 'night-photography',
        scopeLabel: 'Night Photography branch',
      },
    ]);
  });

  it('detects same-label meanings only when different node ids share the label', () => {
    const coreCategory = node('category', 'Category');
    const inheritedCategory = node('category', 'Category');
    const branchCategory = node('night_photo_subarea', ' category ');
    const exposure = node('exposure', 'Exposure');

    const groups = findSameLabelScopedMeanings([
      { node: coreCategory, scopeId: 'photography', scopeLabel: 'Photography Core' },
      { node: inheritedCategory, scopeId: 'portrait', scopeLabel: 'Portrait branch' },
      { node: branchCategory, scopeId: 'night', scopeLabel: 'Night Photography branch' },
      { node: exposure, scopeId: 'photography', scopeLabel: 'Photography Core' },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      label: 'Category',
      normalizedLabel: 'category',
      nodeIds: ['category', 'night_photo_subarea'],
    });
    expect(groups[0].entries.map((entry) => entry.scopeLabel)).toEqual([
      'Photography Core',
      'Portrait branch',
      'Night Photography branch',
    ]);
  });

  it('dedupes exact scope/node references before grouping', () => {
    const coreCategory = node('category', 'Category');
    const branchCategory = node('night_photo_subarea', 'Category');
    const duplicateCoreEntry = {
      node: coreCategory,
      scopeId: 'photography',
      scopeLabel: 'Photography Core',
    };

    const groups = findSameLabelScopedMeanings([
      duplicateCoreEntry,
      duplicateCoreEntry,
      { node: branchCategory, scopeId: 'night', scopeLabel: 'Night Photography branch' },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].entries).toHaveLength(2);
    expect(groups[0].nodeIds).toEqual(['category', 'night_photo_subarea']);
  });

  it('ignores empty labels and returns no groups for empty input', () => {
    expect(findSameLabelScopedMeanings([])).toEqual([]);

    const groups = findSameLabelScopedMeanings([
      { node: node('blank', '   '), scopeId: 'photography' },
      { node: node('also_blank', ''), scopeId: 'night' },
    ]);

    expect(groups).toEqual([]);
  });

  it('returns multiple same-label groups independently', () => {
    const groups = findSameLabelScopedMeanings([
      { node: node('category', 'Category'), scopeId: 'photography' },
      { node: node('night_photo_subarea', 'Category'), scopeId: 'night' },
      { node: node('style', 'Style'), scopeId: 'photography' },
      { node: node('night_style', 'Style'), scopeId: 'night' },
    ]);

    expect(groups.map((group) => group.normalizedLabel)).toEqual(['category', 'style']);
    expect(groups.map((group) => group.nodeIds)).toEqual([
      ['category', 'night_photo_subarea'],
      ['style', 'night_style'],
    ]);
  });

  it('formats ambiguous labels with provenance for context assembly', () => {
    const coreCategory = node('category', 'Category');
    const branchCategory = node('night_photo_subarea', 'Category');

    const coreEntry = {
      node: coreCategory,
      scopeId: 'photography',
      scopeLabel: 'Photography Core',
    };
    const branchEntry = {
      node: branchCategory,
      scopeId: 'night',
      scopeLabel: 'Night Photography branch',
    };
    const groups = findSameLabelScopedMeanings([coreEntry, branchEntry]);
    const ambiguousNodeIds = new Set(groups.flatMap((group) => group.nodeIds));

    expect(formatOntologyNodeLabelForContext(coreEntry, ambiguousNodeIds)).toBe(
      'Category (Photography Core)',
    );
    expect(formatOntologyNodeLabelForContext(branchEntry, ambiguousNodeIds)).toBe(
      'Category (Night Photography branch)',
    );
  });

  it('leaves unambiguous labels unqualified and falls back to scope id when needed', () => {
    const exposure = {
      node: node('exposure', 'Exposure'),
      scopeId: 'photography',
    };

    expect(formatOntologyNodeLabelForContext(exposure, new Set())).toBe('Exposure');
    expect(formatScopedOntologyNodeLabel(exposure)).toBe('Exposure (photography)');
  });
});
