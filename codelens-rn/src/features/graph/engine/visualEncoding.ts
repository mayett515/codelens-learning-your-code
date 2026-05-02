import type { ConceptType } from '@/src/features/learning';
import type { EdgeKind, EdgeVisual, GraphMode, GraphNode, NodeVisual } from '../types';

export const CONCEPT_TYPE_COLORS: Record<ConceptType, string> = {
  mechanism: '#6366F1',
  mental_model: '#A855F7',
  pattern: '#EC4899',
  architecture_principle: '#F43F5E',
  language_feature: '#F59E0B',
  api_idiom: '#10B981',
  data_structure: '#14B8A6',
  algorithmic_idea: '#3B82F6',
  performance_principle: '#F97316',
  debugging_heuristic: '#EAB308',
  failure_mode: '#EF4444',
  testing_principle: '#22C55E',
};

export const STRUCTURE_RADIUS = 14;
export const STRENGTH_RADIUS_MIN = 8;
export const STRENGTH_RADIUS_MAX = 26;

const FALLBACK_CONCEPT_TYPE: ConceptType = 'mechanism';

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function conceptTypeColor(conceptType: ConceptType): string {
  if (Object.prototype.hasOwnProperty.call(CONCEPT_TYPE_COLORS, conceptType)) {
    return CONCEPT_TYPE_COLORS[conceptType];
  }
  console.warn(`[Graph] Unknown concept type for visual encoding: ${String(conceptType)}`);
  return CONCEPT_TYPE_COLORS[FALLBACK_CONCEPT_TYPE];
}

export function getRecencyColor(lastAccessedAt: number | null, nowMs: number): string {
  if (lastAccessedAt === null) return '#94A3B8';
  const ageDays = (nowMs - lastAccessedAt) / 86_400_000;
  if (ageDays < 7) return '#F97316';
  if (ageDays < 30) return '#FACC15';
  if (ageDays < 90) return '#60A5FA';
  return '#94A3B8';
}

export function lerpColor(from: string, to: string, t: number): string {
  const clamped = clamp01(t);
  const fromInt = Number.parseInt(from.slice(1), 16);
  const toInt = Number.parseInt(to.slice(1), 16);

  const fromR = (fromInt >> 16) & 255;
  const fromG = (fromInt >> 8) & 255;
  const fromB = fromInt & 255;
  const toR = (toInt >> 16) & 255;
  const toG = (toInt >> 8) & 255;
  const toB = toInt & 255;

  const r = Math.round(fromR + (toR - fromR) * clamped);
  const g = Math.round(fromG + (toG - fromG) * clamped);
  const b = Math.round(fromB + (toB - fromB) * clamped);

  return `#${[r, g, b].map((part) => part.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

export function getStrengthColor(strength: number): string {
  const clamped = clamp01(strength);
  if (clamped < 0.25) return lerpColor('#EF4444', '#F97316', clamped / 0.25);
  if (clamped < 0.5) return lerpColor('#F97316', '#FACC15', (clamped - 0.25) / 0.25);
  if (clamped < 0.7) return lerpColor('#FACC15', '#22C55E', (clamped - 0.5) / 0.2);
  return '#22C55E';
}

export function getStrengthRadius(strength: number): number {
  return STRENGTH_RADIUS_MIN + (STRENGTH_RADIUS_MAX - STRENGTH_RADIUS_MIN) * clamp01(strength);
}

export function computeNodeVisual(
  node: GraphNode,
  mode: GraphMode,
  nowMs: number,
): NodeVisual {
  if (mode === 'recency') {
    return {
      fill: getRecencyColor(node.lastAccessedAt, nowMs),
      radius: STRUCTURE_RADIUS,
      strokeColor: 'rgba(255,255,255,0.6)',
      strokeWidth: 1,
    };
  }

  if (mode === 'strength') {
    return {
      fill: getStrengthColor(node.strength),
      radius: getStrengthRadius(node.strength),
      strokeColor: '#FFFFFF',
      strokeWidth: 1.5,
    };
  }

  return {
    fill: conceptTypeColor(node.conceptType),
    radius: STRUCTURE_RADIUS,
    strokeColor: '#FFFFFF',
    strokeWidth: 1.5,
  };
}

export function computeEdgeVisual(kind: EdgeKind): EdgeVisual {
  if (kind === 'related') {
    return {
      strokeColor: '#CBD5E1',
      strokeWidth: 1,
      dashIntervals: [6, 4],
      hasArrow: false,
    };
  }

  if (kind === 'contrast') {
    return {
      strokeColor: '#CBD5E1',
      strokeWidth: 1,
      dashIntervals: [2, 3],
      hasArrow: false,
    };
  }

  return {
    strokeColor: '#94A3B8',
    strokeWidth: 1.5,
    dashIntervals: null,
    hasArrow: true,
  };
}
