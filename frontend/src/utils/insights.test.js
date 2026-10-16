import { describe, expect, it } from 'vitest';
import {
  detectStreak,
  leaderboard,
  repeatShopInsights,
  sportDayAnalysis,
  trendComparison,
} from './insights';
import { VISIT_TYPES } from './visitTypes';

function visit(overrides = {}) {
  return {
    id: overrides.id ?? '1',
    date: '2025-11-01',
    coffee_shop_name: 'Colectivo',
    city: 'Madison, WI',
    coffee_order: 'oat latte',
    vibe_rating: 8,
    coffee_rating: 7,
    composite_score: 15,
    sport: '',
    visit_type: VISIT_TYPES.ROAD,
    ...overrides,
  };
}

describe('detectStreak', () => {
  const vibe = (item) => item.vibe_rating;

  it('reports an empty streak when nothing clears the threshold', () => {
    const result = detectStreak([
      visit({ id: 'a', date: '2025-11-01', vibe_rating: 7 }),
      visit({ id: 'b', date: '2025-11-02', vibe_rating: 6 }),
    ], vibe, 8);

    expect(result.current).toEqual([]);
    expect(result.longest).toEqual([]);
  });

  it('keeps the longest run and the run that reaches the latest visit', () => {
    const stops = [
      visit({ id: 'a', date: '2025-11-01', vibe_rating: 9 }),
      visit({ id: 'b', date: '2025-11-02', vibe_rating: 8 }),
      visit({ id: 'c', date: '2025-11-03', vibe_rating: 4 }),
      visit({ id: 'd', date: '2025-11-04', vibe_rating: 9 }),
      visit({ id: 'e', date: '2025-11-05', vibe_rating: '8' }),
    ];

    const ordered = detectStreak(stops, vibe, 8);
    expect(ordered.longest.map((item) => item.id)).toEqual(['a', 'b']);
    expect(ordered.current.map((item) => item.id)).toEqual(['d', 'e']);

    const newestFirst = detectStreak([...stops].reverse(), vibe, 8);
    expect(newestFirst.longest.map((item) => item.id)).toEqual(['a', 'b']);
    expect(newestFirst.current.map((item) => item.id)).toEqual(['d', 'e']);
  });

  it('treats the trailing run as both current and longest when it is the best', () => {
    const stops = [
      visit({ id: 'low', date: '2025-11-01', vibe_rating: 3 }),
      visit({ id: 'a', date: '2025-11-02', vibe_rating: 8 }),
      visit({ id: 'b', date: '2025-11-03', vibe_rating: 8 }),
      visit({ id: 'c', date: '2025-11-04', vibe_rating: 8 }),
    ];
    const result = detectStreak(stops, vibe, 8);
    expect(result.current.map((item) => item.id)).toEqual(['a', 'b', 'c']);
    expect(result.longest).toBe(result.current);
  });
});

describe('leaderboard', () => {
  it('ranks groups by average total and drops small samples', () => {
    const visits = [
      visit({ id: '1', city: 'Chicago, IL', vibe_rating: '9', coffee_rating: '9', composite_score: '18' }),
      visit({ id: '2', city: 'Chicago, IL', vibe_rating: 7, coffee_rating: 7, composite_score: 14 }),
      visit({ id: '3', city: 'Madison, WI', vibe_rating: 8, coffee_rating: 8, composite_score: 16 }),
      visit({ id: '4', city: 'Madison, WI', vibe_rating: 8, coffee_rating: 6, composite_score: 14 }),
      visit({ id: '5', city: 'Evanston, IL', vibe_rating: 10, coffee_rating: 10, composite_score: 20 }),
      visit({ id: '6', city: '', vibe_rating: 10, coffee_rating: 10, composite_score: 20 }),
    ];

    expect(leaderboard(visits, (item) => item.city, 2)).toEqual([
      { key: 'Chicago, IL', count: 2, avgVibe: 8, avgCoffee: 8, avgComposite: 16 },
      { key: 'Madison, WI', count: 2, avgVibe: 8, avgCoffee: 7, avgComposite: 15 },
    ]);
  });
});

describe('sportDayAnalysis', () => {
  it('ignores everyday Madison stops when comparing game days', () => {
    const visits = [
      visit({ id: 'game', sport: "Men's Basketball", vibe_rating: 9, coffee_rating: 7, composite_score: 16 }),
      visit({ id: 'game-2', sport: 'Football', vibe_rating: 7, coffee_rating: 7, composite_score: 14 }),
      visit({ id: 'off', sport: '', vibe_rating: 6, coffee_rating: 8, composite_score: 14 }),
      visit({ id: 'home', visit_type: VISIT_TYPES.HOME, sport: '', vibe_rating: 2, coffee_rating: 2, composite_score: 4 }),
    ];

    expect(sportDayAnalysis(visits)).toEqual({
      gameDay: { count: 2, avgVibe: 8, avgCoffee: 7, avgComposite: 15 },
      nonGameDay: { count: 1, avgVibe: 6, avgCoffee: 8, avgComposite: 14 },
      vibeDelta: 2,
    });
  });

  it('returns null until both sides of the comparison exist', () => {
    expect(sportDayAnalysis([visit({ sport: 'Football' })])).toBeNull();
    expect(sportDayAnalysis([visit({ visit_type: VISIT_TYPES.HOME, sport: '' })])).toBeNull();
  });
});

describe('trendComparison', () => {
  it('waits for four visits, then compares the earlier half with the later half', () => {
    expect(trendComparison([visit(), visit(), visit()])).toBeNull();

    const visits = [
      visit({ id: '1', date: '2025-11-05', vibe_rating: 4, coffee_rating: 4, composite_score: 8 }),
      visit({ id: '2', date: '2025-11-01', vibe_rating: 6, coffee_rating: 4, composite_score: 10 }),
      visit({ id: '3', date: '2025-11-03', vibe_rating: 8, coffee_rating: 8, composite_score: 16 }),
      visit({ id: '4', date: '2025-11-04', vibe_rating: 9, coffee_rating: 7, composite_score: 16 }),
      visit({ id: '5', date: '2025-11-02', vibe_rating: 7, coffee_rating: 9, composite_score: 16 }),
    ];

    expect(trendComparison(visits)).toEqual({
      firstHalf: { count: 2, avgVibe: 6.5, avgCoffee: 6.5, avgComposite: 13 },
      secondHalf: { count: 3, avgVibe: 7, avgCoffee: 6.3, avgComposite: 13.3 },
    });
  });
});

describe('repeatShopInsights', () => {
  it('measures loyalty, direction, and consistency for shops visited twice', () => {
    const visits = [
      visit({ id: '1', date: '2025-11-01', coffee_shop_name: 'Colectivo', composite_score: '10', vibe_rating: 5, coffee_rating: 5 }),
      visit({ id: '2', date: '2025-11-08', coffee_shop_name: 'Colectivo', composite_score: 16, vibe_rating: 8, coffee_rating: 8 }),
      visit({ id: '3', date: '2025-11-02', coffee_shop_name: 'Steady', composite_score: 12, vibe_rating: 6, coffee_rating: 6 }),
      visit({ id: '4', date: '2025-11-09', coffee_shop_name: 'Steady', composite_score: 12, vibe_rating: 6, coffee_rating: 6 }),
      visit({ id: '5', date: '2025-11-03', coffee_shop_name: 'Once', composite_score: 18, vibe_rating: 9, coffee_rating: 9 }),
    ];

    const result = repeatShopInsights(visits);
    const colectivo = result.shops.find((shop) => shop.name === 'Colectivo');
    const steady = result.shops.find((shop) => shop.name === 'Steady');

    expect(result.loyaltyRate).toBe(80);
    expect(result.shops.map((shop) => shop.name)).toEqual(['Colectivo', 'Steady']);
    expect(colectivo.trend).toBe('improving');
    expect(colectivo.avgComposite).toBe(13);
    expect(steady.trend).toBe('stable');
    expect(steady.consistency).toBe(1);
    expect(result.mostImproved.name).toBe('Colectivo');
    expect(result.mostDeclining).toBeNull();
  });
});
