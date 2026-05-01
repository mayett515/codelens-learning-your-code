import { describe, expect, it } from 'vitest';
import { formatRelativeTime } from '../formatRelativeTime';

describe('formatRelativeTime', () => {
  const now = Date.UTC(2026, 4, 1, 12, 0, 0);

  it('returns "just now" for sub-minute deltas', () => {
    expect(formatRelativeTime(now - 5_000, now)).toBe('just now');
    expect(formatRelativeTime(now - 59_000, now)).toBe('just now');
  });

  it('returns minutes for sub-hour deltas', () => {
    expect(formatRelativeTime(now - 60_000, now)).toBe('1m ago');
    expect(formatRelativeTime(now - 30 * 60_000, now)).toBe('30m ago');
  });

  it('returns hours for sub-day deltas', () => {
    expect(formatRelativeTime(now - 60 * 60_000, now)).toBe('1h ago');
    expect(formatRelativeTime(now - 5 * 60 * 60_000, now)).toBe('5h ago');
  });

  it('returns days for sub-week deltas', () => {
    expect(formatRelativeTime(now - 24 * 60 * 60_000, now)).toBe('1d ago');
    expect(formatRelativeTime(now - 6 * 24 * 60 * 60_000, now)).toBe('6d ago');
  });

  it('returns ISO date for older deltas', () => {
    const eightDaysAgo = now - 8 * 24 * 60 * 60_000;
    expect(formatRelativeTime(eightDaysAgo, now)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('handles future timestamps as "just now"', () => {
    expect(formatRelativeTime(now + 60_000, now)).toBe('just now');
  });
});
