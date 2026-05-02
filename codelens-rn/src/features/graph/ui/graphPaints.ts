import {
  PaintStyle,
  Skia as NativeSkia,
  StrokeCap,
  StrokeJoin,
  type SkPaint,
} from '@shopify/react-native-skia';
import type { EdgeKind } from '../types';
import { computeEdgeVisual } from '../engine/visualEncoding';

type SkiaApi = typeof NativeSkia;

export interface GraphPaints {
  edge: Record<EdgeKind, SkPaint>;
  arrow: SkPaint;
  nodeFill: SkPaint;
  nodeStroke: SkPaint;
  label: SkPaint;
}

export function createGraphPaints(skia: SkiaApi): GraphPaints {
  return {
    edge: {
      prerequisite: createEdgePaint(skia, 'prerequisite'),
      related: createEdgePaint(skia, 'related'),
      contrast: createEdgePaint(skia, 'contrast'),
    },
    arrow: createFillPaint(skia, '#94A3B8'),
    nodeFill: createFillPaint(skia, '#FFFFFF'),
    nodeStroke: createStrokePaint(skia, '#FFFFFF', 1.5),
    label: createFillPaint(skia, '#E5E7EB'),
  };
}

export function setPaintColor(skia: SkiaApi, paint: SkPaint, color: string): void {
  paint.setColor(skia.Color(color));
}

function createEdgePaint(skia: SkiaApi, kind: EdgeKind): SkPaint {
  const visual = computeEdgeVisual(kind);
  const paint = createStrokePaint(skia, visual.strokeColor, visual.strokeWidth);
  paint.setAlphaf(0.65);
  return paint;
}

function createStrokePaint(skia: SkiaApi, color: string, width: number): SkPaint {
  const paint = skia.Paint();
  paint.setAntiAlias(true);
  paint.setStyle(PaintStyle.Stroke);
  paint.setStrokeWidth(width);
  paint.setStrokeCap(StrokeCap.Round);
  paint.setStrokeJoin(StrokeJoin.Round);
  setPaintColor(skia, paint, color);
  return paint;
}

function createFillPaint(skia: SkiaApi, color: string): SkPaint {
  const paint = skia.Paint();
  paint.setAntiAlias(true);
  paint.setStyle(PaintStyle.Fill);
  setPaintColor(skia, paint, color);
  return paint;
}
