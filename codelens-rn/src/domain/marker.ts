import type { LineMark, RangeMark, MarkColor } from './types';

export function applyMark(
  marks: LineMark[],
  line: number,
  color: MarkColor,
): LineMark[] {
  const existing = marks.find((m) => m.line === line && m.color === color);
  if (existing) {
    return marks.map((m) =>
      m.line === line && m.color === color
        ? { ...m, depth: m.depth + 1 }
        : m,
    );
  }
  return [...marks, { line, color, depth: 0 }];
}

export function eraseMark(
  marks: LineMark[],
  line: number,
  color: MarkColor,
): { marks: LineMark[]; hadDepth: boolean } {
  const existing = marks.find((m) => m.line === line && m.color === color);
  if (!existing) return { marks, hadDepth: false };

  if (existing.depth > 0) {
    return {
      marks: marks.map((m) =>
        m.line === line && m.color === color
          ? { ...m, depth: m.depth - 1 }
          : m,
      ),
      hadDepth: true,
    };
  }

  return {
    marks: marks.filter((m) => !(m.line === line && m.color === color)),
    hadDepth: false,
  };
}

export function applyRangeMark(
  ranges: RangeMark[],
  startLine: number,
  endLine: number,
  color: MarkColor,
): RangeMark[] {
  const [lo, hi] = startLine <= endLine ? [startLine, endLine] : [endLine, startLine];
  const existing = ranges.find(
    (r) => r.startLine === lo && r.endLine === hi && r.color === color,
  );
  if (existing) {
    return ranges.map((r) =>
      r.startLine === lo && r.endLine === hi && r.color === color
        ? { ...r, depth: r.depth + 1 }
        : r,
    );
  }
  return [...ranges, { startLine: lo, endLine: hi, color, depth: 0 }];
}

export function eraseRangeMark(
  ranges: RangeMark[],
  startLine: number,
  endLine: number,
  color: MarkColor,
): { ranges: RangeMark[]; hadDepth: boolean } {
  const [lo, hi] = startLine <= endLine ? [startLine, endLine] : [endLine, startLine];
  const existing = ranges.find(
    (r) => r.startLine === lo && r.endLine === hi && r.color === color,
  );
  if (!existing) return { ranges, hadDepth: false };

  if (existing.depth > 0) {
    return {
      ranges: ranges.map((r) =>
        r.startLine === lo && r.endLine === hi && r.color === color
          ? { ...r, depth: r.depth - 1 }
          : r,
      ),
      hadDepth: true,
    };
  }

  return {
    ranges: ranges.filter(
      (r) => !(r.startLine === lo && r.endLine === hi && r.color === color),
    ),
    hadDepth: false,
  };
}

export interface LineMarkInfo {
  color: MarkColor;
  depth: number;
  isDirectMark: boolean;
  isOverlap: boolean;
  rangeIndex: number;
}

export function getLineMarkColor(
  marks: LineMark[],
  ranges: RangeMark[],
  line: number,
): { color: MarkColor; depth: number } | null {
  const info = getLineMarkInfo(marks, ranges, line);
  return info ? { color: info.color, depth: info.depth } : null;
}

export function getLineMarkInfo(
  marks: LineMark[],
  ranges: RangeMark[],
  line: number,
): LineMarkInfo | null {
  const direct = marks.find((m) => m.line === line);
  const range = ranges.find((r) => line >= r.startLine && line <= r.endLine);

  if (direct && range) {
    const rangeIdx = ranges
      .filter((r) => r.color === range.color)
      .sort((a, b) => a.startLine - b.startLine)
      .indexOf(range);
    return {
      color: direct.color,
      depth: direct.depth,
      isDirectMark: true,
      isOverlap: true,
      rangeIndex: rangeIdx,
    };
  }

  if (direct) {
    return {
      color: direct.color,
      depth: direct.depth,
      isDirectMark: true,
      isOverlap: false,
      rangeIndex: -1,
    };
  }

  if (range) {
    const sameColorRanges = ranges
      .filter((r) => r.color === range.color)
      .sort((a, b) => a.startLine - b.startLine);
    const rangeIdx = sameColorRanges.indexOf(range);
    return {
      color: range.color,
      depth: range.depth,
      isDirectMark: false,
      isOverlap: false,
      rangeIndex: rangeIdx,
    };
  }

  return null;
}

export function hasMarksAtLine(
  marks: LineMark[],
  ranges: RangeMark[],
  line: number,
): boolean {
  return getLineMarkColor(marks, ranges, line) !== null;
}
