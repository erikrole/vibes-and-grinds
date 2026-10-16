import { VISIT_TYPES } from '../utils/visitTypes';

const SORT_OPTIONS = [
  { value: 'date', label: 'Date' },
  { value: 'vibe', label: 'Vibe' },
  { value: 'coffee', label: 'Coffee' },
  { value: 'composite', label: 'Total' },
];

function sortDirectionPhrase(sortBy, sortAsc) {
  if (sortBy === 'date') return sortAsc ? 'newest first' : 'oldest first';
  return sortAsc ? 'highest first' : 'lowest first';
}

export default function VisitToolbar({
  searchRef,
  searchQuery,
  setSearchQuery,
  hasActiveFilters,
  sortedCount,
  visitCount,
  scopeFilter,
  setScopeFilter,
  sportFilter,
  setSportFilter,
  repeatFilter,
  setRepeatFilter,
  sortBy,
  setSortBy,
  sortAsc,
  showMobileFilters,
  setShowMobileFilters,
}) {
  return (
    <section className="log-toolbar mb-5">
      <div className="relative search-glow rounded-lg transition-shadow mb-5">
        <label htmlFor="journal-search" className="sr-only">Search visits</label>
        <input
          id="journal-search"
          ref={searchRef}
          type="search"
          placeholder="Search shops, cities, opponents, or orders"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="journal-search"
        />
        <svg className="absolute left-3.5 top-3.5 h-5 w-5 text-stone-400 dark:text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-2 top-2 p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200" aria-label="Clear search">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-stone-900 dark:text-stone-50 transition-colors leading-tight">
            Visits
          </h2>
          <p className="text-stone-500 dark:text-stone-400 text-sm tracking-wide transition-colors mt-2">
            {hasActiveFilters
              ? `${sortedCount} of ${visitCount}`
              : `${visitCount} ${visitCount === 1 ? 'visit' : 'visits'}`}
          </p>
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {scopeFilter && (
                <FilterChip onClear={() => setScopeFilter('')} clearLabel="Clear scope filter">
                  {scopeFilter === VISIT_TYPES.HOME ? 'Around Madison' : 'Road trips'}
                </FilterChip>
              )}
              {sportFilter && (
                <FilterChip onClear={() => setSportFilter('')} clearLabel={`Remove ${sportFilter} filter`}>
                  {sportFilter}
                </FilterChip>
              )}
              {repeatFilter && (
                <FilterChip onClear={() => setRepeatFilter('')} clearLabel="Clear repeat filter">
                  {repeatFilter === 'first' ? 'First-time shops' : 'Regular spots'}
                </FilterChip>
              )}
              {searchQuery && (
                <FilterChip onClear={() => setSearchQuery('')} clearLabel="Clear search">
                  "{searchQuery}"
                </FilterChip>
              )}
              <button
                onClick={() => { setSearchQuery(''); setSportFilter(''); setRepeatFilter(''); setScopeFilter(''); }}
                className="text-xs text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 underline underline-offset-2 transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 lg:items-end">
          <div className="flex sm:hidden gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label={`Sort visits, ${sortDirectionPhrase(sortBy, sortAsc)}`}
              className="control-field flex-1"
            >
              <option value="date">Sort: Date</option>
              <option value="vibe">Sort: Vibe</option>
              <option value="coffee">Sort: Coffee</option>
              <option value="composite">Sort: Total</option>
            </select>
            <button
              type="button"
              onClick={() => setShowMobileFilters((value) => !value)}
              className="control-field"
              aria-expanded={showMobileFilters}
              aria-controls="mobile-visit-filters"
            >
              Filters{(sportFilter || repeatFilter || scopeFilter) ? ' (active)' : ''}
            </button>
          </div>
          <div role="group" aria-label="Sort visits" className="hidden sm:flex items-end gap-4 sm:gap-5 border-b border-stone-900/10 dark:border-stone-100/10 pb-0">
            <span className="eyebrow pb-2.5">Sort</span>
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSortBy(option.value)}
                className="tab-edge text-sm sm:text-base flex items-center gap-1"
                aria-pressed={sortBy === option.value}
                aria-label={sortBy === option.value
                  ? `Sort by ${option.label}, ${sortDirectionPhrase(sortBy, sortAsc)}`
                  : `Sort by ${option.label}`}
              >
                {option.label}
                {sortBy === option.value && (
                  <svg className={`w-3 h-3 transition-transform ${sortAsc ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>
            ))}
          </div>

          <div id="mobile-visit-filters" className={`${showMobileFilters ? 'grid' : 'hidden'} sm:grid grid-cols-1 sm:grid-cols-3 gap-2 w-full lg:w-auto`}>
            <select value={scopeFilter} onChange={(e) => setScopeFilter(e.target.value)} aria-label="Filter visits by trip type" className="control-field sm:min-w-[170px]">
              <option value="">Road & Madison</option>
              <option value={VISIT_TYPES.ROAD}>Road trips</option>
              <option value={VISIT_TYPES.HOME}>Around Madison</option>
            </select>
            <select value={sportFilter} onChange={(e) => setSportFilter(e.target.value)} aria-label="Filter visits by sport" className="control-field sm:min-w-[180px]">
              <option value="">All sports</option>
              <option value="Men's Basketball">Men's Basketball</option>
              <option value="Men's Hockey">Men's Hockey</option>
              <option value="Football">Football</option>
              <option value="Track & Field">Track & Field</option>
              <option value="Cross Country">Cross Country</option>
            </select>
            <select value={repeatFilter} onChange={(e) => setRepeatFilter(e.target.value)} aria-label="Filter visits by repeat status" className="control-field sm:min-w-[170px]">
              <option value="">All visits</option>
              <option value="first">First-time shops</option>
              <option value="regular">Regular spots</option>
            </select>
          </div>
        </div>
      </div>
    </section>
  );
}

function FilterChip({ children, onClear, clearLabel }) {
  return (
    <span className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-xs font-medium bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-600">
      {children}
      <button
        onClick={onClear}
        className="ml-0.5 p-0.5 rounded-full hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
        aria-label={clearLabel}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </span>
  );
}
