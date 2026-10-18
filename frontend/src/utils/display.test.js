import { describe, expect, it } from 'vitest';
import { formatMeter } from './display';

describe('formatMeter', () => {
  it('prints a one-decimal rating for numbers and numeric strings', () => {
    expect(formatMeter(8)).toBe('8.0');
    expect(formatMeter('16')).toBe('16.0');
    expect(formatMeter(15.5)).toBe('15.5');
  });

  it('does not throw when a score is missing', () => {
    expect(formatMeter(null)).toBe('—');
    expect(formatMeter(undefined)).toBe('—');
    expect(formatMeter('nope')).toBe('—');
  });
});
