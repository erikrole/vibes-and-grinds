import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  computeSeasonReview,
  getAvailableSeasons,
  getCurrentSeason,
} from './yearReview';

function visit(overrides = {}) {
  return {
    id: 1,
    date: '2025-11-01',
    coffee_shop_name: 'Acme',
    city: 'Madison',
    coffee_order: 'Latte',
    vibe_rating: 8,
    coffee_rating: 8,
    composite_score: 16,
    photo_url: null,
    sport: null,
    ...overrides,
  };
}

describe('getCurrentSeason', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('uses Jul 1 as the season rollover (Aug 2025 → 2025-26)', () => {
    vi.setSystemTime(new Date(2025, 7, 15));
    expect(getCurrentSeason()).toBe('2025-26');
  });

  it('treats June as the prior season (Jun 2026 → 2025-26)', () => {
    vi.setSystemTime(new Date(2026, 5, 15));
    expect(getCurrentSeason()).toBe('2025-26');
  });

  it('rolls into 2026-27 on July 1 2026', () => {
    vi.setSystemTime(new Date(2026, 6, 1));
    expect(getCurrentSeason()).toBe('2026-27');
  });
});

describe('getAvailableSeasons', () => {
  it('returns seasons sorted most recent first', () => {
    const visits = [
      visit({ date: '2024-09-01' }),
      visit({ date: '2025-08-01' }),
      visit({ date: '2026-02-01' }),
    ];
    expect(getAvailableSeasons(visits)).toEqual(['2025-26', '2024-25']);
  });
});

describe('computeSeasonReview', () => {
  it('returns null when no visits in the season', () => {
    expect(computeSeasonReview([], '2025-26')).toBe(null);
  });

  it('aggregates totals, averages, best/worst, persona', () => {
    const visits = [
      visit({ date: '2025-11-01', vibe_rating: 9, coffee_rating: 9, composite_score: 18, city: 'Madison', coffee_shop_name: 'A', coffee_order: 'Latte' }),
      visit({ date: '2025-12-15', vibe_rating: 7, coffee_rating: 7, composite_score: 14, city: 'Chicago', coffee_shop_name: 'B', coffee_order: 'Latte' }),
      visit({ date: '2026-01-20', vibe_rating: 10, coffee_rating: 10, composite_score: 20, city: 'Detroit', coffee_shop_name: 'A', coffee_order: 'Latte' }),
    ];
    const review = computeSeasonReview(visits, '2025-26');
    expect(review.totalVisits).toBe(3);
    expect(review.uniqueShops).toBe(2);
    expect(review.uniqueCities).toBe(3);
    expect(review.bestVisit.composite_score).toBe(20);
    expect(review.worstVisit.composite_score).toBe(14);
    expect(review.mostVisitedShop.name).toBe('A');
    expect(review.topOrder.order).toBe('Latte');
    expect(review.persona).toBeDefined();
  });

  it('excludes visits outside the season', () => {
    const visits = [
      visit({ date: '2024-12-01' }), // 2024-25 season
      visit({ date: '2025-09-01' }), // 2025-26 season
    ];
    expect(computeSeasonReview(visits, '2025-26').totalVisits).toBe(1);
  });

  it('produces a 12-month breakdown in season order (Jul → Jun)', () => {
    const visits = [visit({ date: '2025-11-01' })];
    const review = computeSeasonReview(visits, '2025-26');
    expect(review.monthlyBreakdown).toHaveLength(12);
    expect(review.monthlyBreakdown[0].month).toBe('Jul');
    expect(review.monthlyBreakdown[11].month).toBe('Jun');
  });
});
