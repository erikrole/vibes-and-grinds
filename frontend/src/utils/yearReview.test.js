import { describe, expect, it } from 'vitest';
import { VISIT_TYPES } from './visitTypes';
import { computeSeasonReview } from './yearReview';

function visit(overrides = {}) {
  return {
    date: '2025-11-08',
    coffee_shop_name: 'Colectivo',
    city: 'Chicago, IL',
    coffee_order: 'oat latte',
    vibe_rating: 8,
    coffee_rating: 7,
    composite_score: 15,
    visit_type: VISIT_TYPES.ROAD,
    sport: "Men's Basketball",
    photo_url: '',
    ...overrides,
  };
}

describe('computeSeasonReview', () => {
  it('returns null when the season has no road stops', () => {
    expect(computeSeasonReview([
      visit({ date: '2025-08-01', visit_type: VISIT_TYPES.HOME }),
    ], '2025-26')).toBeNull();
  });

  it('summarizes the road season, its streak, and the July-to-June window', () => {
    const visits = [
      visit({ date: '2025-06-30', coffee_shop_name: 'Old Season', composite_score: 20, vibe_rating: 10, coffee_rating: 10 }),
      visit({ date: '2025-07-02', coffee_shop_name: 'First', city: 'Iowa City, IA', vibe_rating: 9, coffee_rating: 7, composite_score: 16 }),
      visit({ date: '2025-08-15', coffee_shop_name: 'First', city: 'Iowa City, IA', vibe_rating: 8, coffee_rating: 8, composite_score: '16' }),
      visit({ date: '2025-11-08', coffee_shop_name: 'Low', city: 'Madison, WI', vibe_rating: 4, coffee_rating: 4, composite_score: 8 }),
      visit({ date: '2026-01-10', coffee_shop_name: 'Late', city: 'Evanston, IL', vibe_rating: 9, coffee_rating: 9, composite_score: 18, photo_url: 'cup.jpg' }),
      visit({ date: '2026-02-14', coffee_shop_name: 'Late', city: 'Evanston, IL', vibe_rating: 8, coffee_rating: 8, composite_score: 16 }),
      visit({ date: '2026-07-01', coffee_shop_name: 'Next Season', composite_score: 20, vibe_rating: 10, coffee_rating: 10 }),
      visit({ date: '2025-09-01', visit_type: VISIT_TYPES.HOME, coffee_shop_name: 'Around the Corner', composite_score: 4 }),
    ];

    const review = computeSeasonReview(visits, '2025-26');

    expect(review.dateRange).toBe('July 1, 2025 to June 30, 2026');
    expect(review.totalVisits).toBe(5);
    expect(review.uniqueShops).toBe(3);
    expect(review.uniqueCities).toBe(3);
    expect(review.uniqueOrders).toBe(1);
    expect(review.topOrder).toEqual({ order: 'Oat Latte', count: 5 });
    expect(review.mostVisitedShop).toEqual({ name: 'First', count: 2 });
    expect(review.bestVisit.coffee_shop_name).toBe('Late');
    expect(review.worstVisit.coffee_shop_name).toBe('Low');
    expect(review.longestStreak).toBe(2);
    expect(review.totalPhotos).toBe(1);
    expect(review.firstVisit.coffee_shop_name).toBe('First');
    expect(review.lastVisit.coffee_shop_name).toBe('Late');
    expect(review.busiestMonth.month).toBe('Jul');
    expect(review.monthlyBreakdown.find((month) => month.month === 'Jun').count).toBe(0);
    expect(review.persona.id).toBe('casual');
  });

  it('names an explorer when almost every stop is a new shop', () => {
    const visits = [1, 2, 3, 4].map((day) => visit({
      date: `2025-11-0${day}`,
      coffee_shop_name: `Shop ${day}`,
      city: `City ${day}`,
      composite_score: 14,
      vibe_rating: 7,
      coffee_rating: 7,
    }));

    expect(computeSeasonReview(visits, '2025-26').persona.id).toBe('explorer');
  });
});
