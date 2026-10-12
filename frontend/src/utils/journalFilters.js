const SORTS = ['date', 'vibe', 'coffee', 'composite'];
const SCOPES = ['road', 'home'];
const REPEATS = ['first', 'regular'];
const SPORTS = [
  "Men's Basketball",
  "Men's Hockey",
  'Football',
  'Track & Field',
  'Cross Country',
];

export const JOURNAL_FILTER_PARAMS = ['q', 'sort', 'dir', 'scope', 'sport', 'repeat'];

function paramsFrom(search = '') {
  const value = search.startsWith('?') ? search.slice(1) : search;
  return new URLSearchParams(value);
}

/** Read journal filters from a query string. Unknown values fall back to the defaults. */
export function filtersFromSearch(search = '') {
  const params = paramsFrom(search);
  const sort = params.get('sort');
  const scope = params.get('scope');
  const sport = params.get('sport');
  const repeat = params.get('repeat');
  return {
    explicit: JOURNAL_FILTER_PARAMS.some((key) => params.has(key)),
    searchQuery: params.get('q') || '',
    sortBy: SORTS.includes(sort) ? sort : 'date',
    sortAsc: params.get('dir') === 'asc',
    scopeFilter: SCOPES.includes(scope) ? scope : '',
    sportFilter: SPORTS.includes(sport) ? sport : '',
    repeatFilter: REPEATS.includes(repeat) ? repeat : '',
  };
}

/** A shared link wins over this browser's saved filters. */
export function mergeStoredFilters(stored, search = '') {
  const fromUrl = filtersFromSearch(search);
  if (!fromUrl.explicit) return stored;
  return {
    ...stored,
    searchQuery: fromUrl.searchQuery,
    sortBy: fromUrl.sortBy,
    sortAsc: fromUrl.sortAsc,
    scopeFilter: fromUrl.scopeFilter,
    sportFilter: fromUrl.sportFilter,
    repeatFilter: fromUrl.repeatFilter,
  };
}

/**
 * Write the active filters into an existing query string.
 * Route params such as view, visit, shop, season, and app stay put.
 * Defaults (newest first, no search) are omitted so a plain journal stays at `/`.
 */
export function searchFromFilters(filters, baseSearch = '') {
  const params = paramsFrom(baseSearch);
  const set = (key, value) => {
    if (value) params.set(key, value);
    else params.delete(key);
  };
  set('q', String(filters.searchQuery || '').trim());
  const sortBy = filters.sortBy || 'date';
  if (sortBy !== 'date') params.set('sort', sortBy);
  else params.delete('sort');
  if (filters.sortAsc) params.set('dir', 'asc');
  else params.delete('dir');
  set('scope', filters.scopeFilter || '');
  set('sport', filters.sportFilter || '');
  set('repeat', filters.repeatFilter || '');
  const query = params.toString();
  return query ? `?${query}` : '';
}
