import { useMemo, useState } from 'react';
import { prepareNetRankings } from '../utils/netRankingsView';

const SORT_FIELDS = {
  RANK: 'rank',
  TEAM: 'team',
  RECORD: 'record',
};

export default function NetRankingsPage({ netRankings, netStatus, seasonTitle: title = '2026–27' }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState(SORT_FIELDS.RANK);
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc((prev) => !prev);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sorted = useMemo(
    () => prepareNetRankings(netRankings, { query: searchQuery, sortField, sortAsc }),
    [netRankings, searchQuery, sortField, sortAsc],
  );
  const listedCount = useMemo(
    () => prepareNetRankings(netRankings).length,
    [netRankings],
  );

  const sortIcon = (field) => {
    if (sortField !== field) return '';
    return sortAsc ? ' \u25B2' : ' \u25BC';
  };

  return (
    <section aria-labelledby="net-rankings-heading">
      <h2 id="net-rankings-heading" className="sr-only">NET rankings for {title}</h2>

      {netStatus === 'loading' && (
        <p className="vp-note">Loading NET rankings…</p>
      )}

      {netStatus === 'unreleased' && (
        <section className="vp-callout" aria-labelledby="net-unreleased-heading">
          <h2 id="net-unreleased-heading">NET is not posted</h2>
          <p>
            The NCAA has not posted the {title} NET yet. Rankings usually arrive early in the new year. Saved results stay available on the dashboard.
          </p>
        </section>
      )}

      {netStatus === 'error' && (
        <p className="vp-note">Unable to load NET rankings. Try refreshing the page.</p>
      )}

      {netStatus === 'loaded' && (
        <div className="vp-panel">
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-11 text-sm"
              aria-label="Search teams"
            />
            <svg className="absolute left-3.5 top-3.5 h-5 w-5 text-[color:var(--vt-ink-faint)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} className="absolute right-3 top-3 vt-label" aria-label="Clear search">
                Clear
              </button>
            )}
          </div>

          <p className="vt-mono text-xs text-[color:var(--vt-ink-mute)] mb-3">
            {sorted.length === listedCount
              ? `${listedCount} teams`
              : `${sorted.length} of ${listedCount} teams`}
          </p>

          <div className="overflow-x-auto">
            <table className="vt-net-table w-full text-sm">
              <thead>
                <tr>
                  {[
                    { field: SORT_FIELDS.RANK, label: 'NET' },
                    { field: SORT_FIELDS.TEAM, label: 'Team' },
                    { field: SORT_FIELDS.RECORD, label: 'Record' },
                  ].map(({ field, label }) => (
                    <th key={field} onClick={() => handleSort(field)}>
                      {label}{sortIcon(field)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((entry) => {
                  const wisconsin = /wisconsin/i.test(entry.team);
                  return (
                    <tr key={`${entry.rank}-${entry.team}`}>
                      <td className={`vt-mono ${wisconsin ? 'vt-net-wisconsin' : ''}`}>{entry.rank}</td>
                      <td className={wisconsin ? 'vt-net-wisconsin' : ''}>{entry.team}</td>
                      <td className="vt-mono">{entry.record || '—'}</td>
                    </tr>
                  );
                })}
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center vt-mono text-[color:var(--vt-ink-mute)]">
                      {searchQuery ? 'No teams match your search.' : 'No ranking data available.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
