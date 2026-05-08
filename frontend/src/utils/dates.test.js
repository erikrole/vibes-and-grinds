import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatDate, getRelativeLabel, getTodayDateString } from './dates';

describe('getTodayDateString', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns YYYY-MM-DD in local time', () => {
    vi.setSystemTime(new Date(2026, 0, 5, 10, 30));
    expect(getTodayDateString()).toBe('2026-01-05');
  });

  it('zero-pads single-digit months and days', () => {
    vi.setSystemTime(new Date(2026, 8, 3, 0, 0));
    expect(getTodayDateString()).toBe('2026-09-03');
  });
});

describe('formatDate', () => {
  it('parses YYYY-MM-DD without timezone shift', () => {
    const formatted = formatDate('2026-01-15');
    expect(formatted).toMatch(/2026/);
    expect(formatted).toMatch(/Jan/);
    expect(formatted).toMatch(/15/);
  });

  it('honors caller-provided options', () => {
    const formatted = formatDate('2026-03-09', { month: 'long' });
    expect(formatted).toBe('March');
  });
});

describe('getRelativeLabel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 8, 12, 0));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Today" for today', () => {
    expect(getRelativeLabel('2026-05-08')).toBe('Today');
  });

  it('returns "Yesterday" for yesterday', () => {
    expect(getRelativeLabel('2026-05-07')).toBe('Yesterday');
  });

  it('returns null for older dates', () => {
    expect(getRelativeLabel('2026-05-06')).toBe(null);
    expect(getRelativeLabel('2025-12-25')).toBe(null);
  });

  it('crosses month boundaries correctly', () => {
    vi.setSystemTime(new Date(2026, 5, 1, 12, 0));
    expect(getRelativeLabel('2026-05-31')).toBe('Yesterday');
  });
});
