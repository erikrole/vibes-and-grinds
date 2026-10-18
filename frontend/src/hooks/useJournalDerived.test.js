import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import useJournalDerived from './useJournalDerived';
import { getCurrentSeason } from '../utils/seasons';
import { VISIT_TYPES } from '../utils/visitTypes';

const basePrefs = {
  sortBy: 'date',
  sortAsc: false,
  searchQuery: '',
  sportFilter: '',
  repeatFilter: '',
  scopeFilter: '',
};

function visit(overrides = {}) {
  return {
    id: overrides.id ?? '1',
    date: '2025-08-15',
    coffee_shop_name: 'Colectivo',
    city: 'Madison, WI',
    opponent: 'Iowa',
    sport: "Men's Basketball",
    visit_type: VISIT_TYPES.ROAD,
    coffee_order: 'oat latte',
    vibe_rating: 8,
    coffee_rating: 7,
    composite_score: 15,
    notes: '',
    ...overrides,
  };
}

function derive(visits, prefs = {}) {
  return renderHook(() => useJournalDerived(visits, { ...basePrefs, ...prefs }));
}

describe('useJournalDerived', () => {
  it('returns empty journal stats when there are no visits', () => {
    const { result } = derive([]);

    expect(result.current.sortedVisits).toEqual([]);
    expect(result.current.hasActiveFilters).toBe(false);
    expect(result.current.avgVibe).toBe('0.0');
    expect(result.current.avgCoffee).toBe('0.0');
    expect(result.current.avgComposite).toBe('0.0');
    expect(result.current.topCoffeeOrders).toEqual([]);
    expect(result.current.shopVisitCounts).toEqual({});
    expect(result.current.seasonVisitCount).toBe(0);
    expect(result.current.reviewSeason).toBe(getCurrentSeason());
  });

  it('averages ratings and ranks the three most common orders', () => {
    const visits = [
      visit({ id: '1', coffee_order: 'cortado', vibe_rating: 8, coffee_rating: 7, composite_score: 15 }),
      visit({ id: '2', coffee_order: 'cortado', vibe_rating: 9, coffee_rating: 8, composite_score: 17 }),
      visit({ id: '3', coffee_order: 'cortado', vibe_rating: 8, coffee_rating: 7, composite_score: 15 }),
      visit({ id: '4', coffee_order: 'cortado', vibe_rating: 8, coffee_rating: 7, composite_score: 15 }),
      visit({ id: '5', coffee_order: 'cortado', vibe_rating: 8, coffee_rating: 7, composite_score: 15 }),
      visit({ id: '6', coffee_order: 'mocha', vibe_rating: 8, coffee_rating: 7, composite_score: 15 }),
      visit({ id: '7', coffee_order: 'mocha', vibe_rating: 8, coffee_rating: 7, composite_score: 15 }),
      visit({ id: '8', coffee_order: 'mocha', vibe_rating: 8, coffee_rating: 7, composite_score: 15 }),
      visit({ id: '9', coffee_order: 'oat latte', vibe_rating: 8, coffee_rating: 7, composite_score: 15 }),
      visit({ id: '10', coffee_order: 'Oat Latte', vibe_rating: 8, coffee_rating: 7, composite_score: 15 }),
      visit({ id: '11', coffee_order: 'espresso', vibe_rating: 8, coffee_rating: 7, composite_score: 15 }),
      visit({ id: '12', coffee_order: '', vibe_rating: 8, coffee_rating: 7, composite_score: 15 }),
      visit({ id: '13', coffee_order: null, vibe_rating: 8, coffee_rating: 7, composite_score: 15 }),
    ];
    const { result } = derive(visits);

    expect(result.current.avgVibe).toBe((visits.reduce((sum, item) => sum + item.vibe_rating, 0) / visits.length).toFixed(1));
    expect(result.current.avgCoffee).toBe((visits.reduce((sum, item) => sum + item.coffee_rating, 0) / visits.length).toFixed(1));
    expect(result.current.avgComposite).toBe((visits.reduce((sum, item) => sum + item.composite_score, 0) / visits.length).toFixed(1));
    expect(result.current.topCoffeeOrders).toEqual([
      { order: 'Cortado', count: 5 },
      { order: 'Mocha', count: 3 },
      { order: 'Oat Latte', count: 2 },
    ]);
  });

  it('filters by search text across shop, city, opponent, order, and notes', () => {
    const visits = [
      visit({ id: 'shop', coffee_shop_name: 'Intelligentsia', city: 'Chicago, IL' }),
      visit({ id: 'city', coffee_shop_name: 'Other', city: 'Evanston, IL' }),
      visit({ id: 'opponent', coffee_shop_name: 'Other', opponent: 'Northwestern' }),
      visit({ id: 'order', coffee_shop_name: 'Other', coffee_order: 'maple cortado' }),
      visit({ id: 'notes', coffee_shop_name: 'Other', notes: 'Sat by the window' }),
    ];

    expect(derive(visits, { searchQuery: 'intellig' }).result.current.sortedVisits.map((item) => item.id)).toEqual(['shop']);
    expect(derive(visits, { searchQuery: 'EVANSTON' }).result.current.sortedVisits.map((item) => item.id)).toEqual(['city']);
    expect(derive(visits, { searchQuery: 'northwestern' }).result.current.sortedVisits.map((item) => item.id)).toEqual(['opponent']);
    expect(derive(visits, { searchQuery: 'maple' }).result.current.sortedVisits.map((item) => item.id)).toEqual(['order']);
    expect(derive(visits, { searchQuery: 'window' }).result.current.sortedVisits.map((item) => item.id)).toEqual(['notes']);
    expect(derive(visits, { searchQuery: 'missing' }).result.current.sortedVisits).toEqual([]);
    expect(derive(visits, { searchQuery: 'window' }).result.current.hasActiveFilters).toBe(true);
  });

  it('keeps searching when a visit is missing its shop name', () => {
    const visits = [
      visit({ id: 'named', coffee_shop_name: 'Colectivo', city: 'Chicago, IL' }),
      visit({ id: 'blank', coffee_shop_name: null, city: 'Madison, WI' }),
    ];

    expect(() => derive(visits, { searchQuery: 'madison' })).not.toThrow();
    expect(derive(visits, { searchQuery: 'madison' }).result.current.sortedVisits.map((item) => item.id)).toEqual(['blank']);
    expect(derive(visits, { searchQuery: 'colectivo' }).result.current.sortedVisits.map((item) => item.id)).toEqual(['named']);
  });

  it('filters by trip type, sport, and whether the shop is a repeat', () => {
    const visits = [
      visit({ id: 'road', visit_type: VISIT_TYPES.ROAD, sport: 'Football', coffee_shop_name: 'Colectivo', city: 'Madison, WI' }),
      visit({ id: 'road-again', visit_type: VISIT_TYPES.ROAD, sport: 'Football', coffee_shop_name: 'Colectivo', city: 'Madison, WI' }),
      visit({ id: 'home', visit_type: VISIT_TYPES.HOME, sport: "Men's Hockey", coffee_shop_name: 'Bradbury', city: 'Madison, WI' }),
    ];

    expect(derive(visits, { scopeFilter: VISIT_TYPES.HOME }).result.current.sortedVisits.map((item) => item.id)).toEqual(['home']);
    expect(derive(visits, { scopeFilter: VISIT_TYPES.ROAD }).result.current.sortedVisits.map((item) => item.id).sort()).toEqual(['road', 'road-again']);
    expect(derive(visits, { sportFilter: "Men's Hockey" }).result.current.sortedVisits.map((item) => item.id)).toEqual(['home']);
    expect(derive(visits, { repeatFilter: 'first' }).result.current.sortedVisits.map((item) => item.id)).toEqual(['home']);
    expect(derive(visits, { repeatFilter: 'regular' }).result.current.sortedVisits.map((item) => item.id).sort()).toEqual(['road', 'road-again']);
    expect(derive(visits).result.current.shopVisitCounts).toEqual({
      'shop:colectivo|madison wi': 2,
      'shop:bradbury|madison wi': 1,
    });
  });

  it('sorts by date, vibe, coffee, and total in both directions', () => {
    const visits = [
      visit({ id: 'low', date: '2025-01-02', vibe_rating: 4, coffee_rating: 3, composite_score: 7 }),
      visit({ id: 'mid', date: '2025-03-04', vibe_rating: 6, coffee_rating: 9, composite_score: 15 }),
      visit({ id: 'high', date: '2025-06-01', vibe_rating: 9, coffee_rating: 5, composite_score: 14 }),
    ];

    expect(derive(visits, { sortBy: 'date', sortAsc: false }).result.current.sortedVisits.map((item) => item.id)).toEqual(['low', 'mid', 'high']);
    expect(derive(visits, { sortBy: 'date', sortAsc: true }).result.current.sortedVisits.map((item) => item.id)).toEqual(['high', 'mid', 'low']);
    expect(derive(visits, { sortBy: 'vibe', sortAsc: true }).result.current.sortedVisits.map((item) => item.id)).toEqual(['high', 'mid', 'low']);
    expect(derive(visits, { sortBy: 'vibe', sortAsc: false }).result.current.sortedVisits.map((item) => item.id)).toEqual(['low', 'mid', 'high']);
    expect(derive(visits, { sortBy: 'coffee', sortAsc: true }).result.current.sortedVisits.map((item) => item.id)).toEqual(['mid', 'high', 'low']);
    expect(derive(visits, { sortBy: 'composite', sortAsc: false }).result.current.sortedVisits.map((item) => item.id)).toEqual(['low', 'high', 'mid']);
  });

  it('counts only road trips toward the season report and keeps the latest road season', () => {
    const visits = [
      visit({ id: 'older', date: '2025-06-30', visit_type: VISIT_TYPES.ROAD }),
      visit({ id: 'newer', date: '2025-07-01', visit_type: VISIT_TYPES.ROAD }),
      visit({ id: 'home', date: '2026-08-01', visit_type: VISIT_TYPES.HOME, coffee_shop_name: 'Bradbury' }),
    ];
    const { result } = derive(visits);

    expect(result.current.seasonVisitCount).toBe(2);
    expect(result.current.reviewSeason).toBe('2025-26');
  });

  it('ignores blank optional fields while a search is active', () => {
    const visits = [
      visit({
        id: 'sparse',
        city: null,
        opponent: null,
        notes: null,
        coffee_order: null,
        sport: null,
      }),
    ];

    expect(() => derive(visits, { searchQuery: 'colectivo', sportFilter: 'Football' })).not.toThrow();
    expect(derive(visits, { searchQuery: 'colectivo' }).result.current.sortedVisits).toHaveLength(1);
    expect(derive(visits, { sportFilter: 'Football' }).result.current.sortedVisits).toEqual([]);
  });
});
