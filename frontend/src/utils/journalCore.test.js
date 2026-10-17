import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getVisitCoordinates, hasVisitCoordinates } from './coords';
import { formatDate, getRelativeLabel, parseLocalDate } from './dates';
import { formatEventContext, titleCaseOrder } from './display';
import { buildReturnVisitDraft, getRepeatContext, getShopRepeatKey, normalizeRepeatValue } from './repeats';
import { getAvailableSeasons, getSeasonForDate, getSeasonVisits } from './seasons';
import { HOME_CITY, VISIT_TYPES, isMadisonArea } from './visitTypes';

describe('dates', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 16, 15, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reads a stored calendar day in local time', () => {
    const date = parseLocalDate('2026-08-08');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(7);
    expect(date.getDate()).toBe(8);
    expect(Number.isNaN(parseLocalDate('nope').getTime())).toBe(true);
  });

  it('labels today and yesterday, including timestamped values', () => {
    expect(getRelativeLabel('2026-10-16')).toBe('Today');
    expect(getRelativeLabel('2026-10-16T18:30:00')).toBe('Today');
    expect(getRelativeLabel('2026-10-15')).toBe('Yesterday');
    expect(getRelativeLabel('2026-10-14')).toBeNull();
  });

  it('formats a local calendar day', () => {
    expect(formatDate('2026-08-08', { month: 'short', day: 'numeric', year: 'numeric' })).toBe('Aug 8, 2026');
  });
});

describe('seasons', () => {
  it('rolls the season over on July 1 and leaves Madison stops out', () => {
    expect(getSeasonForDate('2026-06-30')).toBe('2025-26');
    expect(getSeasonForDate('2026-07-01')).toBe('2026-27');
    expect(getSeasonForDate(new Date(2026, 6, 1))).toBe('2026-27');

    const visits = [
      { date: '2025-06-30', visit_type: VISIT_TYPES.ROAD },
      { date: '2025-07-01', visit_type: VISIT_TYPES.ROAD },
      { date: '2026-08-01', visit_type: VISIT_TYPES.HOME },
    ];

    expect(getSeasonVisits(visits)).toHaveLength(2);
    expect(getAvailableSeasons(visits)).toEqual(['2025-26', '2024-25']);
  });
});

describe('repeats', () => {
  it('folds accents and punctuation, and prefers a place id', () => {
    expect(normalizeRepeatValue('  Café-Louisa  ')).toBe('cafe louisa');
    expect(getShopRepeatKey({ coffee_shop_name: 'Café Louisa', city: 'Madison, WI' }))
      .toBe(getShopRepeatKey({ coffee_shop_name: 'Cafe Louisa', city: 'Madison WI' }));
    expect(getShopRepeatKey({
      coffee_shop_name: 'Café Louisa',
      city: 'Madison, WI',
      coffee_shop_place_id: 'place-1',
    })).toBe('place:place-1');
  });

  it('counts earlier stops and carries the shop into a return draft', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 16, 15, 0, 0));
    try {
      const earlier = {
        id: 4,
        date: '2025-11-01',
        coffee_shop_name: 'Colectivo',
        city: 'Chicago, IL',
        opponent: 'Iowa',
        sport: "Men's Basketball",
        visit_type: VISIT_TYPES.ROAD,
        coffee_order: 'cortado',
        composite_score: 12,
        coffee_shop_place_id: 'abc',
      };
      const context = getRepeatContext([earlier], { coffee_shop_name: 'Colectivo', coffee_shop_place_id: 'abc' });

      expect(context.visitNumber).toBe(2);
      expect(context.lastVisit).toBe(earlier);
      expect(context.bestVisit).toBe(earlier);

      const draft = buildReturnVisitDraft(earlier);
      expect(draft.coffee_shop_name).toBe('Colectivo');
      expect(draft.coffee_shop_place_id).toBe('abc');
      expect(draft.vibe_rating).toBe('');
      expect(draft.date).toBe('2026-10-16');
      expect(draft.visit_type).toBe(VISIT_TYPES.ROAD);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('visit types', () => {
  it('treats the Madison area as home and a same-named city elsewhere as away', () => {
    expect(isMadisonArea({ city: HOME_CITY })).toBe(true);
    expect(isMadisonArea({ city: 'Sun Prairie, WI' })).toBe(true);
    expect(isMadisonArea({ city: 'Madison, NJ' })).toBe(false);
    expect(isMadisonArea({ city: 'Chicago, IL' })).toBe(false);
    expect(isMadisonArea({ address: '123 State St, Madison, WI 53703' })).toBe(true);
    expect(isMadisonArea({ address: '123 Madison Avenue, New York, NY' })).toBe(false);
    expect(isMadisonArea({ lat: 43.0731, lng: -89.4012 })).toBe(true);
    expect(isMadisonArea({ lat: 41.8781, lng: -87.6298, city: 'Madison, WI' })).toBe(false);
  });
});

describe('coordinates', () => {
  it('does not invent a pin at the origin for a blank coordinate', () => {
    expect(getVisitCoordinates({ coffee_shop_lat: null, coffee_shop_lng: null })).toBeNull();
    expect(hasVisitCoordinates({ coffee_shop_lat: '', coffee_shop_lng: '' })).toBe(false);
    expect(getVisitCoordinates({ coffee_shop_lat: '43.07', coffee_shop_lng: '-89.40' })).toEqual({
      lat: 43.07,
      lng: -89.4,
    });
  });
});

describe('display', () => {
  it('title-cases orders without rewriting short codes', () => {
    expect(titleCaseOrder('  oat   latte ')).toBe('Oat Latte');
    expect(titleCaseOrder('iced/oat-latte')).toBe('Iced/Oat-Latte');
    expect(titleCaseOrder('BB')).toBe('BB');
    expect(titleCaseOrder('')).toBe('');
  });

  it('formats the sport and who it was against', () => {
    expect(formatEventContext({ sport: "Men's Basketball", opponent: '@ Iowa' })).toBe("Men's Basketball at Iowa");
    expect(formatEventContext({ sport: 'Football', opponent: 'at Iowa' })).toBe('Football at Iowa');
    expect(formatEventContext({ opponent: 'Iowa' })).toBe('vs Iowa');
    expect(formatEventContext({ sport: 'Football' })).toBe('Football');
    expect(formatEventContext({})).toBe('');
  });
});
