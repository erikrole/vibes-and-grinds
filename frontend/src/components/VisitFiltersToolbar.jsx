import { useEffect, useId, useRef, useState } from 'react';
import { VISIT_TYPES } from '../utils/visitTypes';

const SORT_OPTIONS = [
  { value: 'date', label: 'Date' },
  { value: 'vibe', label: 'Vibe' },
  { value: 'coffee', label: 'Coffee' },
  { value: 'composite', label: 'Total' },
];

const SPORT_OPTIONS = [
  { value: '', label: 'Any sport' },
  { value: "Men's Basketball", label: "Men's Basketball" },
  { value: "Men's Hockey", label: "Men's Hockey" },
  { value: 'Football', label: 'Football' },
  { value: 'Track & Field', label: 'Track & Field' },
  { value: 'Cross Country', label: 'Cross Country' },
];

const SCOPE_OPTIONS = [
  { value: '', label: 'All' },
  { value: VISIT_TYPES.ROAD, label: 'Road' },
  { value: VISIT_TYPES.HOME, label: 'Madison' },
];

const REPEAT_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'first', label: 'First-time' },
  { value: 'regular', label: 'Regular' },
];

function scopeLabel(value) {
  if (value === VISIT_TYPES.HOME) return 'Around Madison';
  if (value === VISIT_TYPES.ROAD) return 'Road trips';
  return value;
}

function repeatLabel(value) {
  if (value === 'first') return 'First-time shops';
  if (value === 'regular') return 'Regular spots';
  return value;
}

function FilterChip({ label, onClear, clearLabel }) {
  return (
    <span className="filter-chip">
      {label}
      <button type="button" onClick={onClear} className="filter-chip-clear" aria-label={clearLabel}>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </span>
  );
}

function SegmentedControl({ label, value, options, onChange, id, className = '' }) {
  return (
    <div className={`filter-field ${className}`.trim()}>
      <span className="filter-field-label" id={id}>{label}</span>
      <div className="filter-segment" role="group" aria-labelledby={id}>
        {options.map((option) => (
          <button
            key={option.value || 'all'}
            type="button"
            className="filter-segment-option"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Coffee journal visit filters — progressive disclosure.
 * Always-on: search + title/count + Refine.
 * Disclosed: sort (mobile), trip scope, sport, repeat pattern.
 * Desktop keeps sort tabs; filter selects stay behind Refine (no control-panel dump).
 */
export default function VisitFiltersToolbar({
  searchRef,
  searchQuery,
  setSearchQuery,
  sortBy,
  sortAsc,
  setSortBy,
  sportFilter,
  setSportFilter,
  repeatFilter,
  setRepeatFilter,
  scopeFilter,
  setScopeFilter,
  resultCount,
  totalCount,
}) {
  const [showRefine, setShowRefine] = useState(false);
  const [isNarrow, setIsNarrow] = useState(() => (
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 639px)').matches : true
  ));
  const panelId = useId();
  const mobileTriggerRef = useRef(null);
  const desktopTriggerRef = useRef(null);
  const sheetDoneRef = useRef(null);

  const discreteFilterCount = [scopeFilter, sportFilter, repeatFilter].filter(Boolean).length;
  const hasDiscreteFilters = discreteFilterCount > 0;
  const hasActiveFilters = Boolean(searchQuery || hasDiscreteFilters);

  const clearDiscreteFilters = () => {
    setSportFilter('');
    setRepeatFilter('');
    setScopeFilter('');
  };

  const closeRefine = () => {
    setShowRefine(false);
    (isNarrow ? mobileTriggerRef : desktopTriggerRef).current?.focus();
  };

  useEffect(() => {
    const media = window.matchMedia('(max-width: 639px)');
    const sync = () => setIsNarrow(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (!showRefine) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRefine();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    if (isNarrow) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      sheetDoneRef.current?.focus();
      return () => {
        document.removeEventListener('keydown', onKeyDown);
        document.body.style.overflow = previousOverflow;
      };
    }

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showRefine, isNarrow]);

  return (
    <section className="log-toolbar mb-5">
      <div className="relative search-glow rounded-lg transition-shadow mb-4">
        <input
          ref={searchRef}
          type="search"
          aria-label="Search the coffee journal"
          placeholder="Find a shop, city, or favorite order"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="journal-search"
        />
        <svg className="absolute left-3.5 top-3.5 h-5 w-5 text-ink-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-2 top-2 p-2 text-ink-faint hover:text-ink"
            aria-label="Clear search"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-ink transition-colors leading-tight">
                {hasActiveFilters ? 'Matching stops' : 'All stops'}
              </h2>
              <p className="text-ink-soft text-sm tracking-wide transition-colors mt-1.5">
                {hasActiveFilters
                  ? `${resultCount} of ${totalCount}`
                  : `${totalCount} ${totalCount === 1 ? 'visit' : 'visits'}`}
              </p>
            </div>

            <button
              ref={mobileTriggerRef}
              type="button"
              className={`filter-refine-trigger sm:hidden ${discreteFilterCount || showRefine ? 'is-active' : ''}`}
              aria-expanded={showRefine}
              aria-controls={panelId}
              onClick={() => setShowRefine((open) => !open)}
            >
              Refine
              {discreteFilterCount > 0 && (
                <span className="filter-refine-count" aria-hidden="true">{discreteFilterCount}</span>
              )}
            </button>
          </div>

          {hasDiscreteFilters && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              {scopeFilter && (
                <FilterChip
                  label={scopeLabel(scopeFilter)}
                  onClear={() => setScopeFilter('')}
                  clearLabel="Clear trip filter"
                />
              )}
              {sportFilter && (
                <FilterChip
                  label={sportFilter}
                  onClear={() => setSportFilter('')}
                  clearLabel={`Remove ${sportFilter} filter`}
                />
              )}
              {repeatFilter && (
                <FilterChip
                  label={repeatLabel(repeatFilter)}
                  onClear={() => setRepeatFilter('')}
                  clearLabel="Clear pattern filter"
                />
              )}
              <button type="button" onClick={clearDiscreteFilters} className="filter-clear-link">
                Clear
              </button>
            </div>
          )}
        </div>

        <div className="hidden sm:flex items-end gap-4 sm:gap-5 border-b border-rule pb-0">
          <span className="eyebrow pb-2.5">Sort</span>
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSortBy(option.value)}
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
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>
          ))}
          <button
            ref={desktopTriggerRef}
            type="button"
            className={`filter-refine-trigger filter-refine-trigger-desktop ${discreteFilterCount || showRefine ? 'is-active' : ''}`}
            aria-expanded={showRefine}
            aria-controls={panelId}
            onClick={() => setShowRefine((open) => !open)}
          >
            Refine
            {discreteFilterCount > 0 && (
              <span className="filter-refine-count" aria-hidden="true">{discreteFilterCount}</span>
            )}
          </button>
        </div>
      </div>

      {showRefine && (
        <div className="filter-refine-layer">
          {isNarrow && (
            <button
              type="button"
              className="filter-sheet-backdrop"
              aria-label="Close refine filters"
              onClick={closeRefine}
            />
          )}
          <div
            id={panelId}
            className="filter-refine-panel"
            role={isNarrow ? 'dialog' : 'region'}
            aria-modal={isNarrow ? true : undefined}
            aria-labelledby={`${panelId}-title`}
          >
            <div className="filter-sheet-handle sm:hidden" aria-hidden="true" />
            <div className="filter-sheet-header">
              <h3 id={`${panelId}-title`} className="filter-sheet-title">Refine visits</h3>
              <button
                ref={sheetDoneRef}
                type="button"
                className="filter-sheet-done"
                onClick={closeRefine}
              >
                Done
              </button>
            </div>

            <div className="filter-refine-body">
              <div className="filter-refine-section sm:hidden">
                <span className="filter-field-label" id={`${panelId}-sort`}>Sort by</span>
                <div className="filter-segment filter-segment-wrap" role="group" aria-labelledby={`${panelId}-sort`}>
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className="filter-segment-option"
                      aria-pressed={sortBy === option.value}
                      onClick={() => setSortBy(option.value)}
                    >
                      {option.label}
                      {sortBy === option.value && (
                        <svg
                          className={`w-3 h-3 inline-block ml-1 transition-transform ${sortAsc ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <SegmentedControl
                id={`${panelId}-scope`}
                className="filter-field-span"
                label="Trip"
                value={scopeFilter}
                options={SCOPE_OPTIONS}
                onChange={setScopeFilter}
              />

              <div className="filter-field">
                <label className="filter-field-label" htmlFor={`${panelId}-sport`}>Sport</label>
                <select
                  id={`${panelId}-sport`}
                  value={sportFilter}
                  onChange={(e) => setSportFilter(e.target.value)}
                  className="control-field w-full"
                >
                  {SPORT_OPTIONS.map((option) => (
                    <option key={option.value || 'any'} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <SegmentedControl
                id={`${panelId}-repeat`}
                label="Pattern"
                value={repeatFilter}
                options={REPEAT_OPTIONS}
                onChange={setRepeatFilter}
              />

              {hasDiscreteFilters && (
                <button type="button" className="filter-clear-link self-start" onClick={clearDiscreteFilters}>
                  Reset filters
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
