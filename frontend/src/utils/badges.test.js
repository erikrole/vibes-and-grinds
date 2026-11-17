import { describe, expect, it } from 'vitest';
import { badgesByCategory, computeBadges, detectNewBadges } from './badges';

function visit(overrides = {}) {
  return {
    date: '2025-11-08',
    coffee_shop_name: 'Colectivo',
    city: 'Madison, WI',
    coffee_order: 'cortado',
    opponent: 'Iowa',
    sport: "Men's Basketball",
    vibe_rating: 8,
    coffee_rating: 7,
    composite_score: 15,
    photo_url: '',
    ...overrides,
  };
}

describe('computeBadges', () => {
  it('earns the streak badge from the longest run, even when the list is newest-first', () => {
    const visits = [
      visit({ date: '2025-11-05', vibe_rating: 9, composite_score: 17 }),
      visit({ date: '2025-11-04', vibe_rating: 8, composite_score: 16 }),
      visit({ date: '2025-11-03', vibe_rating: 8, composite_score: 16 }),
      visit({ date: '2025-11-02', vibe_rating: 4, composite_score: 10 }),
      visit({ date: '2025-11-01', vibe_rating: '10', coffee_rating: '10', composite_score: '20', photo_url: 'a.jpg' }),
    ];

    const badges = computeBadges(visits);
    const byId = Object.fromEntries(badges.map((badge) => [badge.id, badge]));

    expect(byId['on-fire'].level).toBe(1);
    expect(byId['on-fire'].tier).toBe('Bronze');
    expect(byId['gold-standard'].level).toBe(1);
    expect(byId['vibe-master'].currentValue).toBe(1);
    expect(byId['coffee-connoisseur'].currentValue).toBe(1);
    expect(byId['perfect-cup'].currentValue).toBe(1);
    expect(byId['photo-journal'].level).toBe(1);
    expect(byId['first-sip'].currentValue).toBe(5);
    expect(byId['century-club'].level).toBe(0);
    expect(byId['high-standards'].currentValue).toBe(15.8);
    expect(byId['high-standards'].tier).toBe('Gold');

    const groups = badgesByCategory(badges);
    expect(groups.Streaks.map((badge) => badge.id)).toEqual(['on-fire', 'gold-standard']);
  });

  it('notices only badges that moved up a tier', () => {
    const before = computeBadges([visit({ date: '2025-11-01', vibe_rating: 8 })]);
    const after = computeBadges([
      visit({ date: '2025-11-01', vibe_rating: 8 }),
      visit({ date: '2025-11-02', vibe_rating: 9 }),
      visit({ date: '2025-11-03', vibe_rating: 8 }),
    ]);

    expect(detectNewBadges(null, after)).toEqual([]);
    expect(detectNewBadges(before, after).map((badge) => badge.id)).toContain('on-fire');
  });
});
