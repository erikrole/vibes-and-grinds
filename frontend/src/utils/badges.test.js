import { describe, it, expect } from 'vitest';
import { computeBadges, badgesByCategory, detectNewBadges, BADGE_DEFS, TIERS } from './badges';

function visit(overrides = {}) {
  return {
    id: 1,
    date: '2026-01-01',
    coffee_shop_name: 'Acme',
    city: 'Madison',
    sport: null,
    opponent: null,
    coffee_order: null,
    vibe_rating: 8,
    coffee_rating: 8,
    composite_score: 16,
    photo_url: null,
    ...overrides,
  };
}

describe('computeBadges', () => {
  it('returns one entry per badge definition', () => {
    const badges = computeBadges([]);
    expect(badges).toHaveLength(BADGE_DEFS.length);
  });

  it('sets level to 0 with no progress', () => {
    const badges = computeBadges([]);
    for (const badge of badges) {
      expect(badge.level).toBe(0);
      expect(badge.tier).toBe(null);
    }
  });

  it('promotes tiers as thresholds are crossed', () => {
    const visits = Array.from({ length: 25 }, (_, i) => visit({ id: i }));
    const firstSip = computeBadges(visits).find((b) => b.id === 'first-sip');
    expect(firstSip.level).toBe(4);
    expect(firstSip.tier).toBe(TIERS[3]);
  });

  it('caps level at 5', () => {
    const visits = Array.from({ length: 1000 }, (_, i) => visit({ id: i }));
    const firstSip = computeBadges(visits).find((b) => b.id === 'first-sip');
    expect(firstSip.level).toBe(5);
    expect(firstSip.progress).toBe(1);
  });

  it('city-hopper counts unique cities only', () => {
    const cities = ['Madison', 'Chicago', 'Detroit'];
    const visits = cities.flatMap((city) => [visit({ city }), visit({ city })]);
    const cityHopper = computeBadges(visits).find((b) => b.id === 'city-hopper');
    expect(cityHopper.currentValue).toBe(3);
  });

  it('weekend-warrior counts visits on Sat/Sun', () => {
    const visits = [
      visit({ date: '2026-01-03' }), // Sat
      visit({ date: '2026-01-04' }), // Sun
      visit({ date: '2026-01-05' }), // Mon
    ];
    const wkndWarrior = computeBadges(visits).find((b) => b.id === 'weekend-warrior');
    expect(wkndWarrior.currentValue).toBe(2);
  });
});

describe('badgesByCategory', () => {
  it('groups badges by category', () => {
    const groups = badgesByCategory(computeBadges([]));
    expect(groups.Milestones).toBeDefined();
    expect(groups.Streaks).toBeDefined();
    expect(groups.Explorer).toBeDefined();
  });
});

describe('detectNewBadges', () => {
  it('returns nothing when there is no prior state', () => {
    const newBadges = computeBadges([visit()]);
    expect(detectNewBadges(null, newBadges)).toEqual([]);
    expect(detectNewBadges([], newBadges)).toEqual([]);
  });

  it('flags badges that increased in level', () => {
    const oldBadges = computeBadges([]);
    const newBadges = computeBadges([visit()]);
    const earned = detectNewBadges(oldBadges, newBadges);
    expect(earned.find((b) => b.id === 'first-sip')).toBeDefined();
  });

  it('does not flag badges that did not change', () => {
    const visits = [visit()];
    const oldBadges = computeBadges(visits);
    const newBadges = computeBadges(visits);
    expect(detectNewBadges(oldBadges, newBadges)).toEqual([]);
  });
});
