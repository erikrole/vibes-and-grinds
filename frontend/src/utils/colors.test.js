import { describe, expect, it } from 'vitest';
import { getCompositeColor, getRatingColor } from './colors';

describe('rating colors', () => {
  it('lands on the documented stops and clamps a bad value', () => {
    expect(getRatingColor(0)).toBe('rgb(178, 88, 68)');
    expect(getRatingColor(10)).toBe('rgb(88, 132, 78)');
    expect(getRatingColor(-4)).toBe(getRatingColor(0));
    expect(getRatingColor('nope')).toBe(getRatingColor(0));
    expect(getRatingColor(6.5)).toBe('rgb(199, 170, 89)');
  });

  it('treats a composite as the average of the two ratings', () => {
    expect(getCompositeColor(20)).toBe(getRatingColor(10));
    expect(getCompositeColor(13)).toBe(getRatingColor(6.5));
    expect(getCompositeColor(null)).toBe(getRatingColor(0));
  });
});