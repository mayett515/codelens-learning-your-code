import { describe, expect, it } from 'vitest';
import { computeStrength } from '../computeStrength';

describe('computeStrength', () => {
  it('is monotonic in familiarity and importance', () => {
    expect(computeStrength(0.5, 0.5)).toBeGreaterThan(computeStrength(0.4, 0.5));
    expect(computeStrength(0.5, 0.5)).toBeGreaterThan(computeStrength(0.5, 0.4));
  });

  it('clamps values into the display range', () => {
    expect(computeStrength(-1, -1)).toBe(0);
    expect(computeStrength(10, 10)).toBe(1);
  });
});
