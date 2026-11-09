import type { DomainProfile, OntologyNode } from '../types';

const PROFILE_SEED_TIMESTAMP = 0;

export const PHOTOGRAPHY_TYPE_NODE_IDS = [
  'composition',
  'light',
  'exposure',
  'focus',
  'color',
  'subject_moment',
  'post_processing',
  'workflow',
] as const;

export type PhotographyTypeNodeId = (typeof PHOTOGRAPHY_TYPE_NODE_IDS)[number];

export const PHOTOGRAPHY_TYPE_COLORS: Readonly<Record<PhotographyTypeNodeId, string>> = {
  composition: '#2563EB',
  light: '#F59E0B',
  exposure: '#10B981',
  focus: '#7C3AED',
  color: '#EC4899',
  subject_moment: '#DC2626',
  post_processing: '#0F766E',
  workflow: '#64748B',
};

function photographyTypeNode(input: {
  id: PhotographyTypeNodeId;
  label: string;
  meaning: string;
  useWhen: readonly string[];
  examples: readonly string[];
  contrastNodeIds?: readonly PhotographyTypeNodeId[];
}): OntologyNode {
  return {
    id: input.id,
    label: input.label,
    kind: 'category',
    parentId: null,
    meaning: input.meaning,
    useWhen: input.useWhen,
    doNotUseWhen: [],
    examples: input.examples,
    relatedNodeIds: [],
    contrastNodeIds: input.contrastNodeIds ?? [],
    status: 'active',
    createdBy: 'system',
    createdAt: PROFILE_SEED_TIMESTAMP,
    updatedAt: PROFILE_SEED_TIMESTAMP,
  };
}

export const photographyOntologyNodes = [
  photographyTypeNode({
    id: 'composition',
    label: 'Composition',
    meaning: 'How visual elements are arranged in the frame to guide attention, balance, depth, and story.',
    useWhen: [
      'The lesson is about framing, leading lines, negative space, symmetry, foreground, or visual balance.',
      'The main improvement comes from changing where subjects and shapes sit inside the frame.',
    ],
    examples: ['use foreground layers for depth', 'place the horizon lower to emphasize sky'],
  }),
  photographyTypeNode({
    id: 'light',
    label: 'Light',
    meaning: 'How light direction, quality, contrast, color temperature, and timing shape the photograph.',
    useWhen: [
      'The insight is about hard versus soft light, backlight, golden hour, shadows, or reflections.',
      'The capture explains why the same subject changes when the light changes.',
    ],
    examples: ['side light reveals texture', 'open shade keeps skin tones even'],
  }),
  photographyTypeNode({
    id: 'exposure',
    label: 'Exposure',
    meaning: 'How aperture, shutter speed, ISO, dynamic range, and metering affect brightness and motion.',
    useWhen: [
      'The lesson concerns exposure triangle choices or protecting highlights and shadows.',
      'The mistake or improvement depends on shutter speed, aperture, ISO, or compensation.',
    ],
    examples: ['use slower shutter for water blur', 'underexpose slightly to keep sunset highlights'],
  }),
  photographyTypeNode({
    id: 'focus',
    label: 'Focus',
    meaning: 'How focus placement, depth of field, autofocus mode, and sharpness decisions support the image.',
    useWhen: [
      'The main issue is missed focus, focus tracking, depth of field, or separation from the background.',
      'The idea explains what should be sharp and why.',
    ],
    examples: ['focus on the near eye in portraits', 'stop down for foreground-to-background landscapes'],
  }),
  photographyTypeNode({
    id: 'color',
    label: 'Color',
    meaning: 'How color palette, contrast, white balance, and tonality create mood and visual coherence.',
    useWhen: [
      'The learning is about color harmony, white balance, saturation, or tonal separation.',
      'The photograph works or fails because of color relationships rather than subject placement.',
    ],
    examples: ['cool shadows make the scene feel quieter', 'limit palette to red and green accents'],
  }),
  photographyTypeNode({
    id: 'subject_moment',
    label: 'Subject Moment',
    meaning: 'The timing, gesture, expression, action, or decisive moment that gives the photo its point.',
    useWhen: [
      'The lesson is about waiting, anticipating, or choosing the frame where the subject becomes readable.',
      'The strongest change is the moment captured, not camera settings or edit choices.',
    ],
    examples: ['wait for the hand gesture before pressing the shutter', 'capture the peak of movement'],
  }),
  photographyTypeNode({
    id: 'post_processing',
    label: 'Post Processing',
    meaning: 'Editing decisions after capture: crop, tone curve, local adjustments, noise, sharpening, and grading.',
    useWhen: [
      'The insight is mainly about editing, color grading, crop refinement, or export choices.',
      'The raw capture is adequate but the final image depends on development decisions.',
    ],
    examples: ['lift shadows without flattening contrast', 'crop tighter to remove edge distractions'],
  }),
  photographyTypeNode({
    id: 'workflow',
    label: 'Workflow',
    meaning: 'A repeatable shooting, culling, editing, backup, or delivery process that improves reliability.',
    useWhen: [
      'The learning concerns preparation, file handling, review cadence, preset use, or client/session process.',
      'The idea is about making photography practice more consistent rather than a single image choice.',
    ],
    examples: ['flag selects before editing', 'backup cards before formatting them'],
  }),
] as const;

export const photographyProfile = {
  id: 'photography',
  version: 1,
  label: 'Photography',
  description: 'Second base profile for photography learning, critique, shooting notes, editing, and visual review.',
  labels: {
    hubTitle: 'Photography Hub',
    captureSingular: 'Photo Note',
    capturePlural: 'Photo Notes',
    itemSingular: 'Photo Idea',
    itemPlural: 'Photo Ideas',
    saveAction: 'Catalog',
    reviewModeTitle: 'Critique Review',
    strengthLabel: 'Recall Strength',
    bodyFieldLabel: 'What improved',
    contextFieldLabel: 'Why it mattered',
    sourceFieldLabel: 'Frame / Note',
    originSectionTitle: 'Where This Came From',
    relationshipSectionTitle: 'Visual Structure',
    reviewEntryText: 'Review photography ideas, settings, and critique notes in context.',
    conceptListTitle: 'Photo Idea List',
    conceptListSortLabel: 'Weakest first',
    conceptListEmptyLabel: 'Photo ideas appear after related notes are grouped.',
    flashback: {
      bannerPrefix: 'Viewing past shoot - ',
      fallbackTitle: 'Past Shoot',
      noMetadataLabel: 'No shoot metadata',
      savedSectionTitle: 'What was saved here',
      emptyLabel: 'No photo notes were saved from this shoot yet.',
      unknownDateLabel: 'Unknown',
      conceptCountTemplate: '{count} {itemLabel}',
      conceptCountSingularLabel: 'idea',
      conceptCountPluralLabel: 'ideas',
      captureCountTemplate: '{count} {captureLabel}',
      captureCountSingularLabel: 'note',
      captureCountPluralLabel: 'notes',
    },
  },
  ontology: {
    nodes: photographyOntologyNodes,
    itemTypeNodeIds: PHOTOGRAPHY_TYPE_NODE_IDS,
    relationshipTypeNodeIds: ['supports', 'contrasts', 'sequence', 'same_scene'],
  },
  metadataFields: [
    {
      id: 'cameraBody',
      label: 'Camera Body',
      placeholder: 'Fujifilm X-T5',
      appliesTo: ['capture', 'item'],
      kind: 'string',
      required: false,
      description: 'Camera body or phone used for the image or lesson.',
      examples: ['Fujifilm X-T5', 'iPhone 15 Pro'],
    },
    {
      id: 'lens',
      label: 'Lens',
      placeholder: '35mm f/1.4',
      appliesTo: ['capture', 'item'],
      kind: 'string',
      required: false,
      description: 'Lens or focal-length context relevant to the note.',
      examples: ['35mm f/1.4', '24-70mm f/2.8'],
    },
    {
      id: 'exposureSettings',
      label: 'Exposure Settings',
      placeholder: '1/250, f/2.8, ISO 400',
      appliesTo: ['capture', 'item'],
      kind: 'string',
      required: false,
      description: 'A compact record of shutter speed, aperture, ISO, or exposure compensation.',
      examples: ['1/250, f/2.8, ISO 400', '1s, f/11, ISO 100'],
    },
    {
      id: 'lightingCondition',
      label: 'Lighting',
      appliesTo: ['capture', 'item'],
      kind: 'stringList',
      required: false,
      description: 'Lighting conditions or modifiers that shaped the image.',
      examples: ['golden hour', 'open shade', 'window light'],
    },
    {
      id: 'editingTool',
      label: 'Editing Tool',
      appliesTo: ['capture', 'item'],
      kind: 'stringList',
      required: false,
      description: 'Editing tools, presets, or development environment involved in the lesson.',
      examples: ['Lightroom', 'Capture One', 'Photoshop'],
    },
  ],
  extraction: {
    assistantRole: 'You are the AI assistant inside Kordex for photography learning, critique, and image-making practice.',
    captureInstructions: 'Extract 1 to 3 distinct photography note candidates from critique text, shooting notes, EXIF-like settings, or image-review observations.',
    classificationInstructions: 'Classify each photography note against the photography ontology. Prefer an existing node when one fits cleanly.',
  },
  embedding: {
    captureTextFields: ['title', 'whatClicked', 'whyItMattered', 'rawSnippet', 'keywords'],
    itemTextFields: ['name', 'canonicalSummary', 'composition', 'lightingCondition', 'cameraBody', 'lens', 'editingTool'],
  },
  retrieval: {
    defaultHeader: 'Relevant context from your saved photography notes',
    captureLabel: 'Photo Note',
    itemLabel: 'Photo Idea',
    summaryLabel: 'Summary',
    languageOrRuntimeLabel: 'Gear / Setting',
    sourceLabel: 'Source',
  },
  promotion: {
    defaultTypeNodeId: 'composition',
    contextOnlyKeywords: [
      'camera',
      'lens',
      'iso',
      'aperture',
      'shutter',
      'lightroom',
      'photoshop',
      'raw',
      'jpeg',
    ],
  },
  review: {
    enabledLabel: 'Critique Review',
    weakItemLabel: 'Weak photo ideas',
    thresholdSubtitle: 'Browse photography ideas below your refresh threshold.',
    thresholdCloseLabel: 'Close',
    thresholdEmptyLabel: 'No photography ideas under your refresh threshold.',
    reflectPromptTemplate: 'What still makes sense to you about {conceptName}?',
    reflectSubmitLabel: 'Submit',
    reflectErrorLabel: 'Could not save review',
    reflectPlaceholder: 'Describe what you would do differently on the next shoot, or skip and compare with the saved note.',
    resultSavedLabel: 'Review saved.',
    resultDoneLabel: 'Done',
    resultContinueInChatLabel: 'Continue in chat',
    resultOpenItemLabel: 'Open this idea',
    ratePromptTitle: 'How did this feel?',
    rateStrongLabel: 'Clear',
    ratePartialLabel: 'Partial',
    rateWeakLabel: 'Needs practice',
    rateSkipLabel: 'Skip',
    revealHideLabel: 'Hide what I had saved',
    revealShowLabel: 'Show what I had saved',
  },
  graph: {
    nodeColors: PHOTOGRAPHY_TYPE_COLORS,
    relationshipLabels: {
      supports: 'Supports',
      contrasts: 'Contrasts',
      sequence: 'Sequence',
      same_scene: 'Same Scene',
    },
    relationshipSectionLabels: {
      supports: 'Supports',
      contrasts: 'Contrasts',
      sequence: 'Sequence',
      same_scene: 'Same Scene',
    },
    screenTitle: 'Photography Graph',
    focusedScreenTitle: 'Photo Idea Graph',
    focusedViewLabel: 'Focused view',
    fullViewLabel: 'Full graph',
    emptyLabel: 'No photography ideas yet',
    modeLabels: {
      structure: 'Structure',
      recency: 'Recency',
      strength: 'Strength',
    },
    statusLabels: {
      loading: 'Loading photography graph...',
      unavailable: 'Graph unavailable',
      retryAction: 'Try again',
      emptyBody: 'Photography ideas appear here once notes are grouped.',
      capBannerTemplate: 'Showing {shown} of {total} - strongest first',
    },
    tooltipLabels: {
      neverAccessed: 'Never opened from the graph',
      lastAccessedTemplate: 'Last opened {date}',
      scoreTemplate: 'Familiarity {familiarity}% - Importance {importance}%',
      strengthTemplate: 'Strength {strength}%',
      viewDetailAction: 'View detail',
      dayAgoTemplate: '{count} {dayLabel} ago',
      daySingularLabel: 'day',
      dayPluralLabel: 'days',
    },
    legendHelperLabels: {
      title: 'Legend',
      recencyRecent: 'Orange: under 1 week',
      recencyModerate: 'Yellow: 1-4 weeks',
      recencyOld: 'Blue: 1-3 months',
      recencyStale: 'Grey: 3+ months or never',
      strengthGradient: 'Red to green: weaker to stronger',
      strengthSize: 'Small to large: lower to higher strength',
    },
  },
} as const satisfies DomainProfile<PhotographyTypeNodeId>;
