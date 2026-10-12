import assert from 'node:assert/strict';
import test from 'node:test';
import { routeSearch } from '../src/hooks/useJournalRoute.js';
import {
  filtersFromSearch,
  mergeStoredFilters,
  searchFromFilters,
} from '../src/utils/journalFilters.js';

const stored = {
  searchQuery: 'saved',
  sortBy: 'vibe',
  sortAsc: true,
  scopeFilter: 'road',
  sportFilter: 'Football',
  repeatFilter: 'regular',
};

test('a shared journal link replaces saved filters and ignores unknown values', () => {
  const filters = filtersFromSearch('?q=onyx&sort=coffee&dir=asc&scope=home&sport=Track%20%26%20Field&repeat=first&view=map');
  assert.equal(filters.explicit, true);
  assert.equal(filters.searchQuery, 'onyx');
  assert.equal(filters.sortBy, 'coffee');
  assert.equal(filters.sortAsc, true);
  assert.equal(filters.scopeFilter, 'home');
  assert.equal(filters.sportFilter, 'Track & Field');
  assert.equal(filters.repeatFilter, 'first');

  const merged = mergeStoredFilters(stored, '?q=onyx&sort=nope&scope=away&sport=Curling');
  assert.equal(merged.searchQuery, 'onyx');
  assert.equal(merged.sortBy, 'date');
  assert.equal(merged.sortAsc, false);
  assert.equal(merged.scopeFilter, '');
  assert.equal(merged.sportFilter, '');
  assert.equal(merged.repeatFilter, '');
});

test('an unfiltered visit keeps saved filters and a clean address', () => {
  assert.equal(filtersFromSearch('?visit=12').explicit, false);
  assert.deepEqual(mergeStoredFilters(stored, '?visit=12'), stored);
  assert.equal(searchFromFilters({
    searchQuery: '',
    sortBy: 'date',
    sortAsc: false,
    scopeFilter: '',
    sportFilter: '',
    repeatFilter: '',
  }, '?visit=12'), '?visit=12');
});

test('active filters stay in the address when opening a visit', () => {
  const filtered = searchFromFilters({
    searchQuery: '  finca ',
    sortBy: 'composite',
    sortAsc: false,
    scopeFilter: 'road',
    sportFilter: "Men's Basketball",
    repeatFilter: '',
  }, '?shop=shop-1');
  assert.equal(filtered, '?shop=shop-1&q=finca&sort=composite&scope=road&sport=Men%27s+Basketball');
  assert.equal(routeSearch({ view: 'visits', visit: '8', shop: null, season: null, app: 'vibes' }, filtered), '?visit=8&q=finca&sort=composite&scope=road&sport=Men%27s+Basketball');
  assert.equal(routeSearch({ view: 'map', visit: null, shop: null, season: null, app: 'vest' }, filtered), '?view=map&app=vest&q=finca&sort=composite&scope=road&sport=Men%27s+Basketball');
});
