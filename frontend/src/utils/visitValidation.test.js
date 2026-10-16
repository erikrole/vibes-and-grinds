import { describe, expect, it } from 'vitest';
import { isIsoDate, normalizeOptionalText, normalizeVisitType, validateVisit } from '../../../functions/api/_shared.js';

const valid = {
  date: '2026-10-16',
  coffee_shop_name: 'Colectivo',
  vibe_rating: 8,
  coffee_rating: 7,
};

describe('validateVisit', () => {
  it('accepts a real calendar day and numeric ratings', () => {
    expect(isIsoDate('2026-10-16')).toBe(true);
    expect(isIsoDate('2026-02-31')).toBe(false);
    expect(isIsoDate('2026-10-16T00:00:00')).toBe(false);
    expect(validateVisit(valid)).toBeNull();
    expect(validateVisit({ ...valid, vibe_rating: '8', coffee_rating: '7.5' })).toBeNull();
  });

  it('rejects missing fields, junk ratings, and impossible dates', () => {
    expect(validateVisit({ ...valid, date: '' })).toBe('Date is required');
    expect(validateVisit({ ...valid, date: '10/16/2026' })).toBe('Date must be a real YYYY-MM-DD day');
    expect(validateVisit({ ...valid, date: '2026-02-31' })).toBe('Date must be a real YYYY-MM-DD day');
    expect(validateVisit({ ...valid, coffee_shop_name: '   ' })).toBe('Coffee shop name is required');
    expect(validateVisit({ ...valid, vibe_rating: 'abc' })).toBe('Vibe rating is required');
    expect(validateVisit({ ...valid, coffee_rating: 11 })).toBe('Coffee rating must be between 0 and 10');
  });

  it('normalizes optional text and visit type', () => {
    expect(normalizeOptionalText('  hello  ')).toBe('hello');
    expect(normalizeOptionalText('   ')).toBeNull();
    expect(normalizeVisitType('home')).toBe('home');
    expect(normalizeVisitType('road')).toBe('road');
    expect(normalizeVisitType('nope')).toBe('road');
  });
});
