import { describe, it, expect } from 'vitest';
import {
  cityStats,
  dayOfWeekPatterns,
  detectStreak,
  leaderboard,
  milestones,
  monthlyFrequency,
  orderProfile,
  personalBests,
  ratingDistribution,
  repeatShopInsights,
  rollingAverage,
  sportDayAnalysis,
  trendComparison,
} from './insights';

function visit(overrides = {}) {
  return {
    id: 1,
    date: '2026-01-01',
    coffee_shop_name: 'Acme Coffee',
    city: 'Madison',
    coffee_order: 'Latte',
    sport: null,
    opponent: null,
    vibe_rating: 8,
    coffee_rating: 8,
    composite_score: 16,
    photo_url: null,
    ...overrides,
  };
}

describe('detectStreak', () => {
  const above = (val) => ({ vibe_rating: val });

  it('returns empty streaks for an empty array', () => {
    const { current, longest } = detectStreak([], (v) => v.vibe_rating, 8);
    expect(current).toEqual([]);
    expect(longest).toEqual([]);
  });

  it('finds the longest streak strictly greater than threshold', () => {
    const visits = [9, 8, 7, 9, 9, 9, 6].map(above);
    const { longest } = detectStreak(visits, (v) => v.vibe_rating, 8);
    expect(longest).toHaveLength(3);
  });

  it('reports the trailing run as the current streak', () => {
    const visits = [9, 9, 7, 8, 9].map(above);
    const { current } = detectStreak(visits, (v) => v.vibe_rating, 8);
    expect(current).toHaveLength(2);
  });

  it('handles all-passing input', () => {
    const visits = [8, 9, 10, 8].map(above);
    const { longest, current } = detectStreak(visits, (v) => v.vibe_rating, 8);
    expect(longest).toHaveLength(4);
    expect(current).toHaveLength(4);
  });
});

describe('personalBests', () => {
  it('returns null when no visits', () => {
    expect(personalBests([])).toBe(null);
  });

  it('finds best/worst per dimension', () => {
    const visits = [
      visit({ id: 1, vibe_rating: 6, coffee_rating: 9, composite_score: 15 }),
      visit({ id: 2, vibe_rating: 10, coffee_rating: 5, composite_score: 15 }),
      visit({ id: 3, vibe_rating: 7, coffee_rating: 7, composite_score: 14 }),
      visit({ id: 4, vibe_rating: 9, coffee_rating: 9, composite_score: 18 }),
    ];
    const result = personalBests(visits);
    expect(result.bestVibe.id).toBe(2);
    expect(result.bestCoffee.id).toBe(1);
    expect(result.bestComposite.id).toBe(4);
    expect(result.worstComposite.id).toBe(3);
  });
});

describe('milestones', () => {
  it('awards 10/25/50/100 visit badges by count', () => {
    const ten = Array.from({ length: 10 }, (_, i) => visit({ id: i }));
    expect(milestones(ten).find((b) => b.text === '10 visits logged')).toBeDefined();

    const fifty = Array.from({ length: 50 }, (_, i) => visit({ id: i }));
    const tags = milestones(fifty).map((b) => b.text);
    expect(tags).toContain('10 visits logged');
    expect(tags).toContain('25 visits logged');
    expect(tags).toContain('50 visits logged');
    expect(tags).not.toContain('100 visits logged');
  });

  it('detects perfect ratings', () => {
    const visits = [visit({ vibe_rating: 10, coffee_rating: 10, composite_score: 20 })];
    const tags = milestones(visits).map((b) => b.text);
    expect(tags).toContain('Perfect 10 vibe');
    expect(tags).toContain('Perfect 10 coffee');
    expect(tags).toContain('Perfect 20/20');
  });

  it('counts unique cities', () => {
    const visits = ['Madison', 'Chicago', 'Detroit', 'Indianapolis', 'Columbus'].map((city) =>
      visit({ city })
    );
    const tags = milestones(visits).map((b) => b.text);
    expect(tags.some((t) => t.includes('cities'))).toBe(true);
  });
});

describe('leaderboard', () => {
  it('groups visits by key and sorts by avg composite', () => {
    const visits = [
      visit({ city: 'Madison', composite_score: 18 }),
      visit({ city: 'Madison', composite_score: 14 }),
      visit({ city: 'Chicago', composite_score: 19 }),
      visit({ city: 'Chicago', composite_score: 17 }),
      visit({ city: 'Detroit', composite_score: 10 }),
    ];
    const ranked = leaderboard(visits, (v) => v.city);
    expect(ranked[0].key).toBe('Chicago');
    expect(ranked[ranked.length - 1].key).toBe('Madison');
    expect(ranked.find((r) => r.key === 'Detroit')).toBeUndefined();
  });

  it('respects minVisits filter', () => {
    const visits = [
      visit({ city: 'A', composite_score: 18 }),
      visit({ city: 'B', composite_score: 18 }),
      visit({ city: 'B', composite_score: 18 }),
      visit({ city: 'B', composite_score: 18 }),
    ];
    const ranked = leaderboard(visits, (v) => v.city, 3);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].key).toBe('B');
  });

  it('skips entries with falsy keys', () => {
    const visits = [
      visit({ city: null, composite_score: 18 }),
      visit({ city: 'B', composite_score: 18 }),
      visit({ city: 'B', composite_score: 18 }),
    ];
    expect(leaderboard(visits, (v) => v.city)).toHaveLength(1);
  });
});

describe('sportDayAnalysis', () => {
  it('returns null when one bucket is empty', () => {
    const visits = [visit({ sport: 'basketball' })];
    expect(sportDayAnalysis(visits)).toBe(null);
  });

  it('computes per-bucket averages and delta', () => {
    const visits = [
      visit({ sport: 'basketball', vibe_rating: 9, coffee_rating: 9, composite_score: 18 }),
      visit({ sport: 'basketball', vibe_rating: 9, coffee_rating: 9, composite_score: 18 }),
      visit({ sport: null, vibe_rating: 7, coffee_rating: 7, composite_score: 14 }),
    ];
    const result = sportDayAnalysis(visits);
    expect(result.gameDay.count).toBe(2);
    expect(result.nonGameDay.count).toBe(1);
    expect(result.gameDay.avgVibe).toBe(9);
    expect(result.vibeDelta).toBe(2);
  });
});

describe('rollingAverage', () => {
  it('uses a trailing window', () => {
    const visits = [
      visit({ id: 1, date: '2026-01-01', vibe_rating: 6 }),
      visit({ id: 2, date: '2026-01-02', vibe_rating: 8 }),
      visit({ id: 3, date: '2026-01-03', vibe_rating: 10 }),
    ];
    const points = rollingAverage(visits, 2);
    expect(points).toHaveLength(3);
    expect(points[0].vibe).toBe(6);
    expect(points[1].vibe).toBe(7);
    expect(points[2].vibe).toBe(9);
  });
});

describe('monthlyFrequency', () => {
  it('counts visits per YYYY-MM', () => {
    const visits = [
      visit({ date: '2026-01-04' }),
      visit({ date: '2026-01-15' }),
      visit({ date: '2026-02-02' }),
    ];
    const months = monthlyFrequency(visits);
    expect(months).toHaveLength(2);
    expect(months[0].count).toBe(2);
    expect(months[1].count).toBe(1);
  });
});

describe('ratingDistribution', () => {
  it('places ratings in the right 0.5-wide bucket', () => {
    const visits = [
      visit({ vibe_rating: 0 }),
      visit({ vibe_rating: 9.4 }),
      visit({ vibe_rating: 10 }),
    ];
    const buckets = ratingDistribution(visits, (v) => v.vibe_rating);
    expect(buckets).toHaveLength(20);
    expect(buckets[0].count).toBe(1);
    const total = buckets.reduce((s, b) => s + b.count, 0);
    expect(total).toBe(3);
  });
});

describe('cityStats', () => {
  it('aggregates per-city metrics and sorts by composite', () => {
    const visits = [
      visit({ city: 'Chicago', coffee_shop_name: 'A', composite_score: 18, vibe_rating: 9, coffee_rating: 9, coffee_order: 'Latte' }),
      visit({ city: 'Chicago', coffee_shop_name: 'B', composite_score: 16, vibe_rating: 8, coffee_rating: 8, coffee_order: 'Latte' }),
      visit({ city: 'Madison', coffee_shop_name: 'C', composite_score: 14, vibe_rating: 7, coffee_rating: 7, coffee_order: 'Drip' }),
    ];
    const stats = cityStats(visits);
    expect(stats[0].city).toBe('Chicago');
    expect(stats[0].count).toBe(2);
    expect(stats[0].shops).toBe(2);
    expect(stats[0].topOrder).toBe('Latte');
  });

  it('skips visits without a city', () => {
    const visits = [visit({ city: null }), visit({ city: 'Madison' })];
    expect(cityStats(visits).map((s) => s.city)).toEqual(['Madison']);
  });
});

describe('dayOfWeekPatterns', () => {
  it('aggregates by day of week', () => {
    const visits = [
      visit({ date: '2026-01-04' }), // Sun
      visit({ date: '2026-01-05' }), // Mon
      visit({ date: '2026-01-12' }), // Mon
    ];
    const buckets = dayOfWeekPatterns(visits);
    const mon = buckets.find((b) => b.day === 'Mon');
    expect(mon.count).toBe(2);
  });
});

describe('trendComparison', () => {
  it('returns null with fewer than 4 visits', () => {
    expect(trendComparison([visit(), visit(), visit()])).toBe(null);
  });

  it('compares first half vs second half', () => {
    const visits = [
      visit({ date: '2026-01-01', vibe_rating: 6, coffee_rating: 6, composite_score: 12 }),
      visit({ date: '2026-01-02', vibe_rating: 6, coffee_rating: 6, composite_score: 12 }),
      visit({ date: '2026-01-03', vibe_rating: 9, coffee_rating: 9, composite_score: 18 }),
      visit({ date: '2026-01-04', vibe_rating: 9, coffee_rating: 9, composite_score: 18 }),
    ];
    const result = trendComparison(visits);
    expect(result.firstHalf.avgComposite).toBeLessThan(result.secondHalf.avgComposite);
  });
});

describe('orderProfile', () => {
  it('returns null when no orders are present', () => {
    const visits = [visit({ coffee_order: null })];
    expect(orderProfile(visits)).toBe(null);
  });

  it('identifies a signature drink at >= 5 repeats', () => {
    const visits = Array.from({ length: 6 }, (_, i) => visit({ id: i, coffee_order: 'Cortado' }));
    const profile = orderProfile(visits);
    expect(profile.signatureDrink.order).toBe('Cortado');
  });

  it('does not flag a signature when below 5 repeats', () => {
    const visits = Array.from({ length: 4 }, (_, i) => visit({ id: i, coffee_order: 'Cortado' }));
    const profile = orderProfile(visits);
    expect(profile.signatureDrink).toBe(null);
  });
});

describe('repeatShopInsights', () => {
  it('only includes shops with 2+ visits', () => {
    const visits = [
      visit({ coffee_shop_name: 'Acme', date: '2026-01-01' }),
      visit({ coffee_shop_name: 'Acme', date: '2026-01-02' }),
      visit({ coffee_shop_name: 'OnceOnly', date: '2026-01-03' }),
    ];
    const result = repeatShopInsights(visits);
    expect(result.shops).toHaveLength(1);
    expect(result.shops[0].name).toBe('Acme');
  });

  it('detects an improving trend', () => {
    const visits = [
      visit({ coffee_shop_name: 'Acme', date: '2026-01-01', composite_score: 10 }),
      visit({ coffee_shop_name: 'Acme', date: '2026-01-02', composite_score: 14 }),
      visit({ coffee_shop_name: 'Acme', date: '2026-01-03', composite_score: 18 }),
    ];
    const result = repeatShopInsights(visits);
    expect(result.shops[0].trend).toBe('improving');
    expect(result.mostImproved.name).toBe('Acme');
  });

  it('computes loyalty rate as repeat / total', () => {
    const visits = [
      visit({ coffee_shop_name: 'A', date: '2026-01-01' }),
      visit({ coffee_shop_name: 'A', date: '2026-01-02' }),
      visit({ coffee_shop_name: 'B', date: '2026-01-03' }),
    ];
    const result = repeatShopInsights(visits);
    expect(result.loyaltyRate).toBe(67);
  });
});
