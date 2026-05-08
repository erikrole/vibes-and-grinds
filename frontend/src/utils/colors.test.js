import { describe, it, expect } from 'vitest';
import { getRatingColor, getCompositeColor } from './colors';

const RGB = /^rgb\((\d+), (\d+), (\d+)\)$/;

function parseRgb(str) {
  const m = RGB.exec(str);
  if (!m) throw new Error(`not an rgb string: ${str}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

describe('getRatingColor', () => {
  it('returns terracotta at 0', () => {
    expect(getRatingColor(0)).toBe('rgb(178, 88, 68)');
  });

  it('returns forest green at 10', () => {
    expect(getRatingColor(10)).toBe('rgb(88, 132, 78)');
  });

  it('clamps below 0', () => {
    expect(getRatingColor(-5)).toBe(getRatingColor(0));
  });

  it('clamps above 10', () => {
    expect(getRatingColor(99)).toBe(getRatingColor(10));
  });

  it('coerces non-numeric input to 0', () => {
    expect(getRatingColor('not a number')).toBe(getRatingColor(0));
    expect(getRatingColor(null)).toBe(getRatingColor(0));
    expect(getRatingColor(undefined)).toBe(getRatingColor(0));
  });

  it('interpolates between defined stops', () => {
    // At 5 we should be between the v=4 stop (196,130,90) and v=6 stop (212,165,85)
    const [r, g, b] = parseRgb(getRatingColor(5));
    expect(r).toBeGreaterThan(196);
    expect(r).toBeLessThan(212);
    expect(g).toBeGreaterThan(130);
    expect(g).toBeLessThan(165);
  });

  it('upper-half ratings (7+) shift toward green vs lower-half (0-3)', () => {
    const lowGreen = parseRgb(getRatingColor(2))[1];
    const highGreen = parseRgb(getRatingColor(9))[1];
    expect(highGreen).toBeGreaterThan(lowGreen);
  });
});

describe('getCompositeColor', () => {
  it('halves the composite before delegating to getRatingColor', () => {
    expect(getCompositeColor(20)).toBe(getRatingColor(10));
    expect(getCompositeColor(0)).toBe(getRatingColor(0));
    expect(getCompositeColor(16)).toBe(getRatingColor(8));
  });

  it('handles non-numeric input', () => {
    expect(getCompositeColor(null)).toBe(getRatingColor(0));
  });
});
