import { forwardRef } from 'react';

const SORT_OPTIONS = [
  { value: 'date', label: 'Date' },
  { value: 'vibe', label: 'Vibe' },
  { value: 'coffee', label: 'Coffee' },
  { value: 'composite', label: 'Total' },
];

const SPORTS = [
  "Men's Basketball",
  "Men's Hockey",
  'Football',
  'Track & Field',
  'Cross Country',
];

/**
 * Header card above the visit list: title + count, active filter chips,
 * sort tabs, sport <select>, and the search input. Owns no state — all
 * controls are wired to the parent.
 */
const VisitsToolbar = forwardRef(function VisitsToolbar(
  {
    totalCount,
    filteredCount,
    hasActiveFilters,
    sortBy,
    sortAsc,
    onSortByChange,
    sportFilter,
    onSportChange,
    searchQuery,
    onSearchChange,
  },
  searchRef
) {
  return (
    <section className="paper-card p-6 sm:p-7 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-stone-900 dark:text-stone-50 transition-colors leading-tight">
            Visits
          </h2>
          <p className="text-stone-500 dark:text-stone-400 text-sm tracking-wide transition-colors mt-2">
            {hasActiveFilters
              ? `${filteredCount} of ${totalCount}`
              : `${totalCount} ${totalCount === 1 ? 'visit' : 'visits'}`}
          </p>
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {sportFilter && (
                <FilterChip
                  label={sportFilter}
                  onClear={() => onSportChange('')}
                  ariaLabel={`Remove ${sportFilter} filter`}
                />
              )}
              {searchQuery && (
                <FilterChip
                  label={`"${searchQuery}"`}
                  onClear={() => onSearchChange('')}
                  ariaLabel="Clear search"
                />
              )}
              <button
                onClick={() => {
                  onSearchChange('');
                  onSportChange('');
                }}
                className="text-xs text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 underline underline-offset-2 transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center lg:justify-end">
          <div className="flex items-end gap-4 sm:gap-5 border-b border-stone-900/10 dark:border-stone-100/10 pb-0">
            <span className="eyebrow pb-2.5">Sort</span>
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => onSortByChange(option.value)}
                className="tab-edge text-sm sm:text-base flex items-center gap-1"
                aria-pressed={sortBy === option.value}
              >
                {option.label}
                {sortBy === option.value && (
                  <svg
                    className={`w-3 h-3 transition-transform ${sortAsc ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>

          <select
            value={sportFilter}
            onChange={(e) => onSportChange(e.target.value)}
            aria-label="Filter visits by sport"
            className="w-full sm:w-auto px-3 py-2.5 text-sm rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-stone-400 dark:focus:ring-stone-500 cursor-pointer transition-colors sm:min-w-[180px]"
          >
            <option value="">All sports</option>
            {SPORTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <SearchInput
        ref={searchRef}
        value={searchQuery}
        onChange={onSearchChange}
      />
    </section>
  );
});

const SearchInput = forwardRef(function SearchInput({ value, onChange }, ref) {
  return (
    <div className="relative mt-5 search-glow rounded-full transition-shadow">
      <input
        ref={ref}
        type="text"
        placeholder="Search shop, city, opponent, or order..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3.5 pl-11 pr-16 rounded-full focus:outline-none transition-all"
        style={{
          backgroundColor: 'var(--paper-tint)',
          color: 'var(--ink)',
          border: '1px solid transparent',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--accent)';
          e.target.style.backgroundColor = 'var(--paper-2)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'transparent';
          e.target.style.backgroundColor = 'var(--paper-tint)';
        }}
      />
      <svg
        className="absolute left-3.5 top-3.5 h-5 w-5 text-stone-400 dark:text-stone-500 transition-colors"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      {value ? (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-3 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
          aria-label="Clear search"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      ) : (
        <kbd className="absolute right-3 top-3 hidden sm:inline-flex items-center px-2 py-1 text-xs font-medium text-stone-400 dark:text-stone-500 bg-stone-100 dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-md">
          /
        </kbd>
      )}
    </div>
  );
});

function FilterChip({ label, onClear, ariaLabel }) {
  return (
    <span className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-xs font-medium bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-600">
      {label}
      <button
        onClick={onClear}
        className="ml-0.5 p-0.5 rounded-full hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
        aria-label={ariaLabel}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </span>
  );
}

export default VisitsToolbar;
