import { useEffect, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import {
  Canvas,
  Picture,
  Skia,
} from '@shopify/react-native-skia';
import { createGraphPaints } from './graphPaints';
import { drawEdgesBatched, drawLabels, drawNodes } from '../engine/drawEdgesBatched';
import type { ConceptId } from '@/src/features/learning';
import type { GraphMode, LayoutResult } from '../types';

interface GraphCanvasProps {
  layoutResult: LayoutResult;
  mode: GraphMode;
  nowMs: number;
  width: number;
  height: number;
  onNodeDoubleTap: (conceptId: ConceptId) => void;
  onNodeLongPress: (nodeIndex: number, screenX: number, screenY: number) => void;
  onFocusChange?: (nodeIndex: number) => void;
  onCanvasMiss: () => void;
}

export function GraphCanvas({
  layoutResult,
  mode,
  nowMs,
  width,
  height,
  onNodeDoubleTap,
  onNodeLongPress,
  onFocusChange,
  onCanvasMiss,
}: GraphCanvasProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startScale = useSharedValue(1);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  useEffect(() => {
    setFocusedIndex(-1);
  }, [layoutResult]);

  const picture = useMemo(() => {
    const recorder = Skia.PictureRecorder();
    const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, width, height));
    const paints = createGraphPaints(Skia);
    const font = Skia.Font(undefined, 12);
    drawEdgesBatched(canvas, Skia, layoutResult, paints, { mode, nowMs, focusedIndex });
    drawNodes(canvas, Skia, layoutResult, paints, { mode, nowMs, focusedIndex });
    drawLabels(canvas, Skia, layoutResult, paints, font, { mode, nowMs, focusedIndex });
    return recorder.finishRecordingAsPicture();
  }, [focusedIndex, height, layoutResult, mode, nowMs, width]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handleTap = (
    screenX: number,
    screenY: number,
    tx: number,
    ty: number,
    currentScale: number,
  ) => {
    const hitIndex = hitTest(layoutResult, (screenX - tx) / currentScale, (screenY - ty) / currentScale);
    setFocusedIndex(hitIndex);
    if (hitIndex >= 0) {
      onFocusChange?.(hitIndex);
    } else {
      onCanvasMiss();
    }
  };

  const handleDoubleTap = (
    screenX: number,
    screenY: number,
    tx: number,
    ty: number,
    currentScale: number,
  ) => {
    const hitIndex = hitTest(layoutResult, (screenX - tx) / currentScale, (screenY - ty) / currentScale);
    const node = hitIndex >= 0 ? layoutResult.nodes[hitIndex] : undefined;
    if (node) onNodeDoubleTap(node.id);
  };

  const handleLongPress = (
    screenX: number,
    screenY: number,
    tx: number,
    ty: number,
    currentScale: number,
  ) => {
    const hitIndex = hitTest(layoutResult, (screenX - tx) / currentScale, (screenY - ty) / currentScale);
    if (hitIndex >= 0) onNodeLongPress(hitIndex, screenX, screenY);
  };

  const pan = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateX.value = startX.value + event.translationX;
      translateY.value = startY.value + event.translationY;
    });

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate((event) => {
      scale.value = Math.min(3, Math.max(0.3, startScale.value * event.scale));
    });

  const singleTap = Gesture.Tap()
    .maxDuration(250)
    .onEnd((event) => {
      runOnJS(handleTap)(event.x, event.y, translateX.value, translateY.value, scale.value);
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(300)
    .onEnd((event) => {
      runOnJS(handleDoubleTap)(event.x, event.y, translateX.value, translateY.value, scale.value);
    });

  const longPress = Gesture.LongPress()
    .minDuration(450)
    .onStart((event) => {
      runOnJS(handleLongPress)(event.x, event.y, translateX.value, translateY.value, scale.value);
    });

  const gesture = Gesture.Simultaneous(pan, pinch, Gesture.Exclusive(doubleTap, longPress, singleTap));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <Canvas style={{ width, height }}>
          <Picture picture={picture} />
        </Canvas>
      </Animated.View>
    </GestureDetector>
  );
}

function hitTest(layout: LayoutResult, x: number, y: number): number {
  let bestIndex = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  layout.nodes.forEach((node, index) => {
    const nodeX = layout.positionBuffer[index * 2];
    const nodeY = layout.positionBuffer[index * 2 + 1];
    const radius = 14 + Math.max(8, node.strength * 18);
    const distance = Math.hypot(x - nodeX, y - nodeY);
    if (distance <= radius && distance < bestDistance) {
      bestIndex = index;
      bestDistance = distance;
    }
  });
  return bestIndex;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
