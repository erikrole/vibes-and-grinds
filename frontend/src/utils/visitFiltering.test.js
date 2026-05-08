import { describe, it, expect } from 'vitest';
import {
  averageRatings,
  filterVisits,
  shopVisitCounts,
  sortVisits,
  topCoffeeOrders,
} from './visitFiltering';

function visit(overrides = {}) {
  return {
    id: 1,
    date: '2026-01-01',
    coffee_shop_name: 'Acme',
    city: 'Madison',
    opponent: null,
    coffee_order: 'Latte',
    sport: null,
    notes: null,
    vibe_rating: 8,
    coffee_rating: 8,
    composite_score: 16,
    ...overrides,
  };
}

describe('filterVisits', () => {
  it('matches by shop name (case-insensitive)', () => {
    const visits = [visit({ id: 1, coffee_shop_name: 'Colectivo' }), visit({ id: 2, coffee_shop_name: 'Bowls' })];
    expect(filterVisits(visits, { searchQuery: 'colec' }).map((v) => v.id)).toEqual([1]);
  });

  it('matches by city, opponent, order, and notes', () => {
    const visits = [
      visit({ id: 1, city: 'Chicago' }),
      visit({ id: 2, opponent: 'Indiana' }),
      visit({ id: 3, coffee_order: 'Cortado' }),
      visit({ id: 4, notes: 'best chai ever' }),
    ];
    expect(filterVisits(visits, { searchQuery: 'chicago' })).toHaveLength(1);
    expect(filterVisits(visits, { searchQuery: 'indiana' })).toHaveLength(1);
    expect(filterVisits(visits, { searchQuery: 'cortado' })).toHaveLength(1);
    expect(filterVisits(visits, { searchQuery: 'chai' })).toHaveLength(1);
  });

  it('respects sportFilter (exact match)', () => {
    const visits = [
      visit({ id: 1, sport: "Men's Basketball" }),
      visit({ id: 2, sport: 'Football' }),
      visit({ id: 3, sport: null }),
    ];
    expect(filterVisits(visits, { sportFilter: 'Football' })).toHaveLength(1);
    expect(filterVisits(visits, { sportFilter: '' })).toHaveLength(3);
  });

  it('combines sport and search filters', () => {
    const visits = [
      visit({ id: 1, sport: 'Football', city: 'Madison' }),
      visit({ id: 2, sport: 'Football', city: 'Chicago' }),
      visit({ id: 3, sport: "Men's Basketball", city: 'Madison' }),
    ];
    const out = filterVisits(visits, { sportFilter: 'Football', searchQuery: 'madison' });
    expect(out.map((v) => v.id)).toEqual([1]);
  });

  it('returns the input list when both filters are empty', () => {
    const visits = [visit(), visit({ id: 2 })];
    expect(filterVisits(visits, {})).toHaveLength(2);
  });
});

describe('sortVisits', () => {
  const visits = [
    visit({ id: 1, date: '2026-01-01', vibe_rating: 6, coffee_rating: 8, composite_score: 14 }),
    visit({ id: 2, date: '2026-01-15', vibe_rating: 9, coffee_rating: 7, composite_score: 16 }),
    visit({ id: 3, date: '2026-01-10', vibe_rating: 8, coffee_rating: 10, composite_score: 18 }),
  ];

  it('descending date is the default', () => {
    expect(sortVisits(visits).map((v) => v.id)).toEqual([2, 3, 1]);
  });

  it('ascending=true reverses the order', () => {
    expect(sortVisits(visits, { sortBy: 'date', ascending: true }).map((v) => v.id)).toEqual([1, 3, 2]);
  });

  it('sorts by vibe / coffee / composite', () => {
    expect(sortVisits(visits, { sortBy: 'vibe' })[0].id).toBe(2);
    expect(sortVisits(visits, { sortBy: 'coffee' })[0].id).toBe(3);
    expect(sortVisits(visits, { sortBy: 'composite' })[0].id).toBe(3);
  });

  it('does not mutate the input array', () => {
    const original = [...visits];
    sortVisits(visits);
    expect(visits).toEqual(original);
  });
});

describe('averageRatings', () => {
  it('returns zeros for an empty list', () => {
    expect(averageRatings([])).toEqual({ vibe: '0.0', coffee: '0.0', composite: '0.0' });
  });

  it('averages each dimension to 1 decimal', () => {
    const visits = [
      visit({ vibe_rating: 8, coffee_rating: 6, composite_score: 14 }),
      visit({ vibe_rating: 10, coffee_rating: 8, composite_score: 18 }),
    ];
    expect(averageRatings(visits)).toEqual({ vibe: '9.0', coffee: '7.0', composite: '16.0' });
  });
});

describe('topCoffeeOrders', () => {
  it('returns the top N by frequency', () => {
    const visits = [
      visit({ coffee_order: 'Latte' }),
      visit({ coffee_order: 'Latte' }),
      visit({ coffee_order: 'Latte' }),
      visit({ coffee_order: 'Cortado' }),
      visit({ coffee_order: 'Cortado' }),
      visit({ coffee_order: 'Drip' }),
    ];
    expect(topCoffeeOrders(visits)).toEqual([
      { order: 'Latte', count: 3 },
      { order: 'Cortado', count: 2 },
      { order: 'Drip', count: 1 },
    ]);
  });

  it('honors the limit', () => {
    const visits = Array.from({ length: 10 }, (_, i) => visit({ coffee_order: `Order ${i}` }));
    expect(topCoffeeOrders(visits, 2)).toHaveLength(2);
  });

  it('skips empty/whitespace orders', () => {
    const visits = [
      visit({ coffee_order: 'Latte' }),
      visit({ coffee_order: '' }),
      visit({ coffee_order: '   ' }),
    ];
    expect(topCoffeeOrders(visits)).toEqual([{ order: 'Latte', count: 1 }]);
  });
});

describe('shopVisitCounts', () => {
  it('counts shop visits by lowercase name', () => {
    const visits = [
      visit({ coffee_shop_name: 'Colectivo' }),
      visit({ coffee_shop_name: 'colectivo' }),
      visit({ coffee_shop_name: 'Bowls' }),
    ];
    expect(shopVisitCounts(visits)).toEqual({ colectivo: 2, bowls: 1 });
  });
});
